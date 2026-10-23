import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getDefaultSubscriptions } from '../constants/suggestedFeedsByLocale';
import type { FeedSubscription, ParsedArticle } from '../types/article';
import { translate } from '../i18n/translations';
import { loadCachedArticlesList, clearArticlesListCache, pruneArticlesList, saveCachedArticlesList } from '../utils/articlesListCache';
import { clearOfflineCache, getOfflineCacheCount, syncOfflineArticles } from '../utils/offlineCache';
import { subscriptionsToOpml } from '../utils/opml';
import { fetchAndParseFeed } from '../utils/parseFeed';
import type { AppLocale } from '../i18n/types';
import {
  fixMac4everSubscriptionUrls,
  missingDefaultFeeds,
  stripGenericSubscriptions,
  stripNonLocaleSubscriptions,
  stripRemovedSubscriptions,
} from '../utils/subscriptionMigration';

import { useAppSettings } from './AppSettingsContext';

const STORAGE_SUBS = 'appigeek_subscriptions_v1';
const STORAGE_READ = 'appigeek_read_ids_v1';
const STORAGE_FAVORITES = 'appigeek_favorite_ids_v1';

/** Délai avant synchro hors ligne (évite de bloquer l’UI après actualisation). */
const OFFLINE_SYNC_DELAY_MS = 4000;

type RefreshOptions = {
  /** Pas d’indicateur pull-to-refresh (actualisation silencieuse). */
  background?: boolean;
  /** Ne met à jour que ces flux (ajout/import). */
  feeds?: FeedSubscription[];
};

type FeedsContextValue = {
  subscriptions: FeedSubscription[];
  articles: ParsedArticle[];
  readIds: Set<string>;
  favoriteIds: Set<string>;
  loading: boolean;
  refreshing: boolean;
  /** Téléchargement RSS en cours (y compris actualisation silencieuse). */
  fetching: boolean;
  /** Progression du fetch courant, 0–1 (par flux terminé). */
  fetchProgress: number;
  /** Premier fetch réseau terminé depuis le lancement de l’app. */
  initialFetchDone: boolean;
  hydrated: boolean;
  error: string | null;
  lastUpdated: number | null;
  offlineSyncing: boolean;
  offlineCachedCount: number;
  syncOfflineNow: () => Promise<number>;
  refresh: (options?: RefreshOptions) => Promise<void>;
  addSubscription: (title: string, url: string) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  importSubscriptions: (feeds: { title: string; url: string }[]) => Promise<number>;
  markRead: (articleId: string) => Promise<void>;
  markAllRead: (articleIds: string[]) => Promise<void>;
  toggleFavorite: (articleId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  /** Bascule les abonnements et le fil sur le catalogue de la langue cible. */
  switchLocaleFeeds: (locale: AppLocale) => Promise<void>;
  getExportOpml: () => string;
  /** Applique un état cloud fusionné (abonnements + lus + favoris). */
  applyRemoteSync: (input: {
    subscriptions: FeedSubscription[];
    readIds: string[];
    favoriteIds: string[];
  }) => Promise<void>;
  addLocaleRecommendedFeeds: () => Promise<number>;
};

const FeedsContext = createContext<FeedsContextValue | null>(null);

function normalizeUrl(input: string): string {
  const u = input.trim();
  if (!u) throw new Error('URL vide');
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
}

async function stableIdFromUrl(url: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    url.toLowerCase(),
  );
  return digest.slice(0, 16);
}

function mergeArticles(
  previous: ParsedArticle[],
  incoming: ParsedArticle[],
  replaceFeedIds: Set<string> | null,
): ParsedArticle[] {
  const base = replaceFeedIds
    ? previous.filter((a) => !replaceFeedIds.has(a.feedId))
    : previous;
  const merged = [...base, ...incoming];
  merged.sort((a, b) => b.publishedAt - a.publishedAt);
  return merged;
}

export function FeedsProvider({ children }: { children: React.ReactNode }) {
  const { offlineCacheEnabled, offlineCacheLimit, appLocale, hydrated: settingsHydrated } =
    useAppSettings();
  const [subscriptions, setSubscriptions] = useState<FeedSubscription[]>([]);
  const [articles, setArticles] = useState<ParsedArticle[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [offlineSyncing, setOfflineSyncing] = useState(false);
  const [offlineCachedCount, setOfflineCachedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;
  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const initialRefreshStarted = useRef(false);
  const offlineSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localeAtHydration = useRef(appLocale);
  localeAtHydration.current = appLocale;

  useEffect(() => {
    if (!settingsHydrated) return;
    let cancelled = false;
    const locale = localeAtHydration.current;
    (async () => {
      try {
        const defaults = getDefaultSubscriptions(locale);
        const [rawSubs, rawRead, rawFav, cachedList] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SUBS),
          AsyncStorage.getItem(STORAGE_READ),
          AsyncStorage.getItem(STORAGE_FAVORITES),
          loadCachedArticlesList(),
        ]);
        if (cancelled) return;

        if (cachedList.articles.length) {
          setArticles(cachedList.articles);
          if (cachedList.lastUpdated) setLastUpdated(cachedList.lastUpdated);
        }

        if (rawSubs) {
          let parsed = JSON.parse(rawSubs) as FeedSubscription[];
          const { subs: fixed, changed: urlFixed } = fixMac4everSubscriptionUrls(parsed);
          parsed = fixed;
          const { subs: noGeneric, changed: genericStripped } = stripGenericSubscriptions(parsed);
          parsed = noGeneric;
          const {
            subs: noRemoved,
            changed: removedStripped,
            removedFeedIds,
          } = stripRemovedSubscriptions(parsed);
          parsed = noRemoved;
          const {
            subs: localeOnly,
            changed: localeStripped,
            removedFeedIds: localeRemovedIds,
          } = stripNonLocaleSubscriptions(parsed, locale);
          parsed = localeOnly;
          const allRemovedIds = new Set([...removedFeedIds, ...localeRemovedIds]);
          if ((removedStripped || localeStripped) && cachedList.articles.length) {
            const pruned = cachedList.articles.filter((a) => !allRemovedIds.has(a.feedId));
            setArticles(pruned);
            if (cachedList.lastUpdated) setLastUpdated(cachedList.lastUpdated);
          }
          const toAdd = missingDefaultFeeds(parsed, locale);
          if (toAdd.length) {
            for (const f of toAdd) {
              parsed.push({
                id: await stableIdFromUrl(f.url),
                title: f.title,
                url: f.url,
              });
            }
          }
          if (urlFixed || genericStripped || removedStripped || localeStripped || toAdd.length) {
            await AsyncStorage.setItem(STORAGE_SUBS, JSON.stringify(parsed));
          }
          setSubscriptions(parsed);
        } else {
          const defaultsSubs: FeedSubscription[] = await Promise.all(
            defaults.map(async (f) => ({
              id: await stableIdFromUrl(f.url),
              title: f.title,
              url: f.url,
            })),
          );
          setSubscriptions(defaultsSubs);
          await AsyncStorage.setItem(STORAGE_SUBS, JSON.stringify(defaultsSubs));
        }
        if (rawRead) {
          const arr = JSON.parse(rawRead) as string[];
          setReadIds(new Set(arr));
        }
        if (rawFav) {
          const arr = JSON.parse(rawFav) as string[];
          setFavoriteIds(new Set(arr));
        }
      } catch {
        setError(translate(locale, 'feeds.loadError'));
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsHydrated]);

  const persistSubs = async (subs: FeedSubscription[]) => {
    await AsyncStorage.setItem(STORAGE_SUBS, JSON.stringify(subs));
  };

  const persistRead = async (ids: Set<string>) => {
    await AsyncStorage.setItem(STORAGE_READ, JSON.stringify([...ids]));
  };

  const persistFavorites = async (ids: Set<string>) => {
    await AsyncStorage.setItem(STORAGE_FAVORITES, JSON.stringify([...ids]));
  };

  const runOfflineSync = useCallback(
    async (merged: ParsedArticle[]): Promise<number> => {
      if (!offlineCacheEnabled) {
        setOfflineCachedCount(0);
        return 0;
      }
      if (!merged.length) {
        setOfflineCachedCount(0);
        return 0;
      }
      setOfflineSyncing(true);
      try {
        await syncOfflineArticles(merged, offlineCacheLimit);
        const count = await getOfflineCacheCount();
        setOfflineCachedCount(count);
        return count;
      } catch {
        return 0;
      } finally {
        setOfflineSyncing(false);
      }
    },
    [offlineCacheEnabled, offlineCacheLimit],
  );

  const scheduleOfflineSyncStable = useCallback(
    (merged: ParsedArticle[]) => {
      if (offlineSyncTimer.current) clearTimeout(offlineSyncTimer.current);
      offlineSyncTimer.current = setTimeout(() => {
        offlineSyncTimer.current = null;
        void runOfflineSync(merged);
      }, OFFLINE_SYNC_DELAY_MS);
    },
    [runOfflineSync],
  );

  const syncOfflineNow = useCallback(
    () => runOfflineSync(articlesRef.current),
    [runOfflineSync],
  );

  const fetchFeedsIntoState = useCallback(
    async (
      subsToFetch: FeedSubscription[],
      options?: RefreshOptions,
    ): Promise<ParsedArticle[]> => {
      if (!subsToFetch.length) return articlesRef.current;

      const replaceIds = new Set(subsToFetch.map((s) => s.id));
      const total = subsToFetch.length;
      let completed = 0;
      setFetchProgress(0);
      const results = await Promise.allSettled(
        subsToFetch.map((s) =>
          fetchAndParseFeed(s).finally(() => {
            completed += 1;
            setFetchProgress(completed / total);
          }),
        ),
      );
      const incoming: ParsedArticle[] = [];
      const errors: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') incoming.push(...r.value);
        else errors.push(subsToFetch[i].title);
      });

      const merged = mergeArticles(articlesRef.current, incoming, replaceIds);
      const pruned = pruneArticlesList(merged);
      setArticles(pruned);
      articlesRef.current = pruned;
      const now = Date.now();
      setLastUpdated(now);
      void saveCachedArticlesList(pruned, now);

      if (errors.length) {
        const total = subscriptionsRef.current.length;
        setError(
          errors.length === subsToFetch.length && subsToFetch.length === total
            ? 'Aucun flux n’a pu être lu. Vérifiez la connexion ou les URLs.'
            : `Certains flux n’ont pas pu être mis à jour : ${errors.join(', ')}`,
        );
      } else {
        setError(null);
      }

      scheduleOfflineSyncStable(pruned);
      return pruned;
    },
    [scheduleOfflineSyncStable],
  );

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      const subs = options?.feeds ?? subscriptionsRef.current;
      if (!subs.length) {
        setArticles([]);
        articlesRef.current = [];
        setLastUpdated(Date.now());
        setRefreshing(false);
        setFetching(false);
        setFetchProgress(1);
        setInitialFetchDone(true);
        setError(null);
        return;
      }

      const background = options?.background ?? false;
      if (!background) setRefreshing(true);
      setFetching(true);
      setFetchProgress(0);

      try {
        await fetchFeedsIntoState(subs, options);
      } finally {
        setFetching(false);
        setInitialFetchDone(true);
        if (!background) setRefreshing(false);
      }
    },
    [fetchFeedsIntoState],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (initialRefreshStarted.current) return;
    initialRefreshStarted.current = true;
    void refresh({ background: true });
  }, [hydrated, refresh]);

  useEffect(() => {
    if (!hydrated || !offlineCacheEnabled || !articles.length) return;
    scheduleOfflineSyncStable(articles);
  }, [hydrated, offlineCacheEnabled, offlineCacheLimit, articles, scheduleOfflineSyncStable]);

  useEffect(
    () => () => {
      if (offlineSyncTimer.current) clearTimeout(offlineSyncTimer.current);
    },
    [],
  );

  const addSubscription = useCallback(
    async (title: string, url: string) => {
      const normalized = normalizeUrl(url);
      const id = await stableIdFromUrl(normalized);
      if (subscriptionsRef.current.some((s) => s.id === id || s.url === normalized)) return;
      const next: FeedSubscription = {
        id,
        title: title.trim() || normalized,
        url: normalized,
      };
      const subs = [...subscriptionsRef.current, next];
      setSubscriptions(subs);
      subscriptionsRef.current = subs;
      await persistSubs(subs);
      void refresh({ background: true, feeds: [next] });
    },
    [refresh],
  );

  const importSubscriptions = useCallback(
    async (feeds: { title: string; url: string }[]) => {
      let added = 0;
      const next = [...subscriptionsRef.current];
      const seen = new Set(next.map((s) => s.url.toLowerCase()));
      const newFeeds: FeedSubscription[] = [];
      for (const f of feeds) {
        try {
          const normalized = normalizeUrl(f.url);
          const key = normalized.toLowerCase();
          if (seen.has(key)) continue;
          const id = await stableIdFromUrl(normalized);
          const sub = {
            id,
            title: f.title.trim() || normalized,
            url: normalized,
          };
          next.push(sub);
          newFeeds.push(sub);
          seen.add(key);
          added += 1;
        } catch {
          /* skip invalid */
        }
      }
      if (added > 0) {
        setSubscriptions(next);
        subscriptionsRef.current = next;
        await persistSubs(next);
        void refresh({ background: true, feeds: newFeeds });
      }
      return added;
    },
    [refresh],
  );

  const removeSubscription = useCallback(async (id: string) => {
    const subs = subscriptionsRef.current.filter((s) => s.id !== id);
    setSubscriptions(subs);
    subscriptionsRef.current = subs;
    await persistSubs(subs);
    setArticles((prev) => {
      const next = prev.filter((a) => a.feedId !== id);
      articlesRef.current = next;
      void saveCachedArticlesList(next, Date.now());
      return next;
    });
  }, []);

  const markRead = useCallback(async (articleId: string) => {
    setReadIds((prev) => {
      if (prev.has(articleId)) return prev;
      const next = new Set(prev);
      next.add(articleId);
      void persistRead(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(async (articleIds: string[]) => {
    if (!articleIds.length) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of articleIds) next.add(id);
      void persistRead(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(async (articleId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      void persistFavorites(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(async () => {
    const localeDefaults = getDefaultSubscriptions(appLocale);
    const defaultsSubs: FeedSubscription[] = await Promise.all(
      localeDefaults.map(async (f) => ({
        id: await stableIdFromUrl(f.url),
        title: f.title,
        url: f.url,
      })),
    );
    setSubscriptions(defaultsSubs);
    subscriptionsRef.current = defaultsSubs;
    await persistSubs(defaultsSubs);
    setReadIds(new Set());
    setFavoriteIds(new Set());
    await AsyncStorage.multiRemove([STORAGE_READ, STORAGE_FAVORITES]);
    void refresh({ background: false });
  }, [appLocale, refresh]);

  const switchLocaleFeeds = useCallback(
    async (locale: AppLocale) => {
      const localeDefaults = getDefaultSubscriptions(locale);
      const defaultsSubs: FeedSubscription[] = await Promise.all(
        localeDefaults.map(async (f) => ({
          id: await stableIdFromUrl(f.url),
          title: f.title,
          url: f.url,
        })),
      );
      setSubscriptions(defaultsSubs);
      subscriptionsRef.current = defaultsSubs;
      await persistSubs(defaultsSubs);
      setArticles([]);
      articlesRef.current = [];
      setLastUpdated(null);
      setReadIds(new Set());
      setFavoriteIds(new Set());
      await AsyncStorage.multiRemove([STORAGE_READ, STORAGE_FAVORITES]);
      await clearArticlesListCache();
      await clearOfflineCache();
      setOfflineCachedCount(0);
      void refresh({ background: false });
    },
    [refresh],
  );

  const addLocaleRecommendedFeeds = useCallback(async (): Promise<number> => {
    const toAdd = missingDefaultFeeds(subscriptionsRef.current, appLocale);
    if (!toAdd.length) return 0;
    let added = 0;
    const next = [...subscriptionsRef.current];
    for (const f of toAdd) {
      const id = await stableIdFromUrl(f.url);
      if (next.some((s) => s.id === id)) continue;
      next.push({ id, title: f.title, url: f.url });
      added += 1;
    }
    if (!added) return 0;
    setSubscriptions(next);
    subscriptionsRef.current = next;
    await persistSubs(next);
    void refresh({ background: true, feeds: next.slice(-added) });
    return added;
  }, [appLocale, refresh]);

  const getExportOpml = useCallback(
    () => subscriptionsToOpml(subscriptions),
    [subscriptions],
  );

  const applyRemoteSync = useCallback(
    async (input: {
      subscriptions: FeedSubscription[];
      readIds: string[];
      favoriteIds: string[];
    }) => {
      setSubscriptions(input.subscriptions);
      subscriptionsRef.current = input.subscriptions;
      await persistSubs(input.subscriptions);

      const nextRead = new Set(input.readIds);
      setReadIds(nextRead);
      await persistRead(nextRead);

      const nextFav = new Set(input.favoriteIds);
      setFavoriteIds(nextFav);
      await persistFavorites(nextFav);

      void refresh({ background: true });
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      subscriptions,
      articles,
      readIds,
      favoriteIds,
      loading,
      refreshing,
      fetching,
      fetchProgress,
      initialFetchDone,
      hydrated,
      error,
      lastUpdated,
      offlineSyncing,
      offlineCachedCount,
      syncOfflineNow,
      refresh,
      addSubscription,
      removeSubscription,
      importSubscriptions,
      markRead,
      markAllRead,
      toggleFavorite,
      resetToDefaults,
      switchLocaleFeeds,
      getExportOpml,
      applyRemoteSync,
      addLocaleRecommendedFeeds,
    }),
    [
      subscriptions,
      articles,
      readIds,
      favoriteIds,
      loading,
      refreshing,
      fetching,
      fetchProgress,
      initialFetchDone,
      hydrated,
      error,
      lastUpdated,
      offlineSyncing,
      offlineCachedCount,
      syncOfflineNow,
      refresh,
      addSubscription,
      removeSubscription,
      importSubscriptions,
      markRead,
      markAllRead,
      toggleFavorite,
      resetToDefaults,
      switchLocaleFeeds,
      getExportOpml,
      applyRemoteSync,
      addLocaleRecommendedFeeds,
    ],
  );

  return <FeedsContext.Provider value={value}>{children}</FeedsContext.Provider>;
}

export function useFeeds(): FeedsContextValue {
  const ctx = useContext(FeedsContext);
  if (!ctx) throw new Error('useFeeds must be used inside FeedsProvider');
  return ctx;
}
