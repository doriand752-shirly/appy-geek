import { useFocusEffect } from '@react-navigation/native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  fetchCommentThreadStats,
  isCommentsServiceConfigured,
} from '../services/articleCommentsService';
import type { CommentThreadSummary } from '../types/comment';
import { normalizeArticleUrlForComments } from '../utils/commentThreadId';

type CommentsContextValue = {
  configured: boolean;
  loading: boolean;
  error: string | null;
  threads: CommentThreadSummary[];
  getCommentCount: (articleUrl: string | undefined) => number;
  refreshStats: () => Promise<void>;
};

const CommentsContext = createContext<CommentsContextValue | null>(null);

function buildCountIndex(threads: CommentThreadSummary[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of threads) {
    map.set(normalizeArticleUrlForComments(t.articleUrl), t.commentCount);
  }
  return map;
}

export function CommentsProvider({ children }: { children: React.ReactNode }) {
  const configured = isCommentsServiceConfigured();
  const [threads, setThreads] = useState<CommentThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countByUrl = useMemo(() => buildCountIndex(threads), [threads]);

  const refreshStats = useCallback(async () => {
    if (!configured) {
      setThreads([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCommentThreadStats();
      setThreads(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const getCommentCount = useCallback(
    (articleUrl: string | undefined) => {
      if (!articleUrl || !configured) return 0;
      return countByUrl.get(normalizeArticleUrlForComments(articleUrl)) ?? 0;
    },
    [configured, countByUrl],
  );

  const value = useMemo(
    () => ({
      configured,
      loading,
      error,
      threads,
      getCommentCount,
      refreshStats,
    }),
    [configured, loading, error, threads, getCommentCount, refreshStats],
  );

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

/** Rafraîchit les stats quand l’écran reprend le focus (ex. retour du lecteur). */
export function useRefreshCommentsOnFocus() {
  const { refreshStats } = useComments();
  useFocusEffect(
    useCallback(() => {
      void refreshStats();
    }, [refreshStats]),
  );
}

export function useComments(): CommentsContextValue {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error('useComments must be used within CommentsProvider');
  return ctx;
}
