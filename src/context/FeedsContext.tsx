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
import { fetchAndParseFeed } from '../utils/parseFeed';

const STORAGE_SUBS = 'appygeek_subscriptions_v1';
const STORAGE_READ = 'appygeek_read_ids_v1';

type FeedsContextValue = {
  subscriptions: FeedSubscription[];
  articles: ParsedArticle[];
  readIds: Set<string>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  addSubscription: (title: string, url: string) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  markRead: (articleId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
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
  const [subscriptions, setSubscriptions] = useState<FeedSubscription[]>([]);
  const [articles, setArticles] = useState<ParsedArticle[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawSubs, rawRead] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SUBS),
          AsyncStorage.getItem(STORAGE_READ),
        ]);
        if (cancelled) return;
        if (rawSubs) {
          const parsed = JSON.parse(rawSubs) as FeedSubscription[];
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
  }, [subscriptions]);

  useEffect(() => {
    if (!hydrated) return;
    void refresh();
  }, [hydrated, subscriptions, refresh]);

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
    await AsyncStorage.removeItem(STORAGE_READ);
  }, []);

  const value = useMemo(
    () => ({
      subscriptions,
      articles,
      readIds,
      loading,
      refreshing,
      error,
      lastUpdated,
      refresh,
      addSubscription,
      removeSubscription,
      markRead,
      resetToDefaults,
    }),
    [
      subscriptions,
      articles,
      readIds,
      loading,
      refreshing,
      error,
      lastUpdated,
      refresh,
      addSubscription,
      removeSubscription,
      markRead,
      resetToDefaults,
    ],
  );

  return <FeedsContext.Provider value={value}>{children}</FeedsContext.Provider>;
}

export function useFeeds(): FeedsContextValue {
  const ctx = useContext(FeedsContext);
  if (!ctx) throw new Error('useFeeds must be used inside FeedsProvider');
  return ctx;
}
