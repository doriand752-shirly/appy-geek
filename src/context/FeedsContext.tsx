import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_SUBSCRIPTIONS } from '../constants/suggestedFeeds';
import type { FeedSubscription, ParsedArticle } from '../types/article';
import { getOfflineCacheCount, syncOfflineArticles } from '../utils/offlineCache';
import { subscriptionsToOpml } from '../utils/opml';
import { fetchAndParseFeed } from '../utils/parseFeed';
import {
  fixMac4everSubscriptionUrls,
  missingDefaultFeeds,
} from '../utils/subscriptionMigration';

import { useAppSettings } from './AppSettingsContext';

const STORAGE_SUBS = 'appigeek_subscriptions_v1';
const STORAGE_READ = 'appigeek_read_ids_v1';
const STORAGE_FAVORITES = 'appigeek_favorite_ids_v1';

type FeedsContextValue = {
  subscriptions: FeedSubscription[];
  articles: ParsedArticle[];
  readIds: Set<string>;
  favoriteIds: Set<string>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  offlineSyncing: boolean;
  offlineCachedCount: number;
  syncOfflineNow: () => Promise<number>;
  refresh: () => Promise<void>;
  addSubscription: (title: string, url: string) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  importSubscriptions: (feeds: { title: string; url: string }[]) => Promise<number>;
  markRead: (articleId: string) => Promise<void>;
  markAllRead: (articleIds: string[]) => Promise<void>;
  toggleFavorite: (articleId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  getExportOpml: () => string;
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

export function FeedsProvider({ children }: { children: React.ReactNode }) {
  const { offlineCacheEnabled, offlineCacheLimit } = useAppSettings();
  const [subscriptions, setSubscriptions] = useState<FeedSubscription[]>([]);
  const [articles, setArticles] = useState<ParsedArticle[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineSyncing, setOfflineSyncing] = useState(false);
  const [offlineCachedCount, setOfflineCachedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawSubs, rawRead, rawFav] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SUBS),
          AsyncStorage.getItem(STORAGE_READ),
          AsyncStorage.getItem(STORAGE_FAVORITES),
        ]);
        if (cancelled) return;
        if (rawSubs) {
          let parsed = JSON.parse(rawSubs) as FeedSubscription[];
          const { subs: fixed, changed: urlFixed } = fixMac4everSubscriptionUrls(parsed);
          parsed = fixed;
          const toAdd = missingDefaultFeeds(parsed);
          if (toAdd.length) {
            for (const f of toAdd) {
              parsed.push({
                id: await stableIdFromUrl(f.url),
                title: f.title,
                url: f.url,
              });
            }
          }
          if (urlFixed || toAdd.length) {
            await AsyncStorage.setItem(STORAGE_SUBS, JSON.stringify(parsed));
          }
          setSubscriptions(parsed);
        } else {
          const defaults: FeedSubscription[] = await Promise.all(
            DEFAULT_SUBSCRIPTIONS.map(async (f) => ({
              id: await stableIdFromUrl(f.url),
              title: f.title,
              url: f.url,
            })),
          );
          setSubscriptions(defaults);
          await AsyncStorage.setItem(STORAGE_SUBS, JSON.stringify(defaults));
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
        setError('Impossible de charger vos données locales.');
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
  }, []);

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

  const syncOfflineNow = useCallback(
    () => runOfflineSync(articles),
    [articles, runOfflineSync],
  );

  const refresh = useCallback(async () => {
    if (!subscriptions.length) {
      setArticles([]);
      setLastUpdated(Date.now());
      setRefreshing(false);
      setError(null);
      return;
    }
    setError(null);
    setRefreshing(true);
    const results = await Promise.allSettled(subscriptions.map((s) => fetchAndParseFeed(s)));
    const merged: ParsedArticle[] = [];
    const errors: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') merged.push(...r.value);
      else errors.push(subscriptions[i].title);
    });
    merged.sort((a, b) => b.publishedAt - a.publishedAt);
    setArticles(merged);
    setLastUpdated(Date.now());
    if (errors.length) {
      setError(
        errors.length === subscriptions.length
          ? 'Aucun flux n’a pu être lu. Vérifiez la connexion ou les URLs.'
          : `Certains flux n’ont pas pu être mis à jour : ${errors.join(', ')}`,
      );
    }
    setRefreshing(false);
    void runOfflineSync(merged);
  }, [subscriptions, runOfflineSync]);

  useEffect(() => {
    if (!hydrated) return;
    void refresh();
  }, [hydrated, subscriptions, refresh]);

  /** Synchro quand l’option est activée ou que la limite change (ex. réglages chargés au démarrage). */
  useEffect(() => {
    if (!hydrated || !offlineCacheEnabled || !articles.length) return;
    void runOfflineSync(articles);
  }, [hydrated, offlineCacheEnabled, offlineCacheLimit, articles, runOfflineSync]);

  const addSubscription = useCallback(
    async (title: string, url: string) => {
      const normalized = normalizeUrl(url);
      const id = await stableIdFromUrl(normalized);
      if (subscriptions.some((s) => s.id === id || s.url === normalized)) return;
      const next: FeedSubscription = {
        id,
        title: title.trim() || normalized,
        url: normalized,
      };
      const subs = [...subscriptions, next];
      setSubscriptions(subs);
      await persistSubs(subs);
    },
    [subscriptions],
  );

  const importSubscriptions = useCallback(
    async (feeds: { title: string; url: string }[]) => {
      let added = 0;
      const next = [...subscriptions];
      const seen = new Set(next.map((s) => s.url.toLowerCase()));
      for (const f of feeds) {
        try {
          const normalized = normalizeUrl(f.url);
          const key = normalized.toLowerCase();
          if (seen.has(key)) continue;
          const id = await stableIdFromUrl(normalized);
          next.push({
            id,
            title: f.title.trim() || normalized,
            url: normalized,
          });
          seen.add(key);
          added += 1;
        } catch {
          /* skip invalid */
        }
      }
      if (added > 0) {
        setSubscriptions(next);
        await persistSubs(next);
      }
      return added;
    },
    [subscriptions],
  );

  const removeSubscription = useCallback(
    async (id: string) => {
      const subs = subscriptions.filter((s) => s.id !== id);
      setSubscriptions(subs);
      await persistSubs(subs);
      setArticles((prev) => prev.filter((a) => a.feedId !== id));
    },
    [subscriptions],
  );

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
    const defaults: FeedSubscription[] = await Promise.all(
      DEFAULT_SUBSCRIPTIONS.map(async (f) => ({
        id: await stableIdFromUrl(f.url),
        title: f.title,
        url: f.url,
      })),
    );
    setSubscriptions(defaults);
    await persistSubs(defaults);
    setReadIds(new Set());
    setFavoriteIds(new Set());
    await AsyncStorage.multiRemove([STORAGE_READ, STORAGE_FAVORITES]);
  }, []);

  const getExportOpml = useCallback(
    () => subscriptionsToOpml(subscriptions),
    [subscriptions],
  );

  const value = useMemo(
    () => ({
      subscriptions,
      articles,
      readIds,
      favoriteIds,
      loading,
      refreshing,
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
      getExportOpml,
    }),
    [
      subscriptions,
      articles,
      readIds,
      favoriteIds,
      loading,
      refreshing,
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
      getExportOpml,
    ],
  );

  return <FeedsContext.Provider value={value}>{children}</FeedsContext.Provider>;
}

export function useFeeds(): FeedsContextValue {
  const ctx = useContext(FeedsContext);
  if (!ctx) throw new Error('useFeeds must be used inside FeedsProvider');
  return ctx;
}

