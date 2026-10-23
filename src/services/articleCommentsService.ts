import { getCommentsApiConfig } from '../constants/commentsApi';
import type { ArticleComment, CommentThreadSummary, PostArticleCommentInput } from '../types/comment';
import { normalizeArticleUrlForComments } from '../utils/commentThreadId';

type SupabasePublicRow = {
  id: string;
  thread_id: string;
  article_url: string;
  article_title?: string | null;
  pseudo: string;
  body: string;
  created_at: string;
};

type StatsRow = {
  thread_id: string;
  article_url: string;
  article_title?: string | null;
  comment_count: number;
  last_comment_at: string;
};

function supabaseHeaders(): Record<string, string> {
  const { supabaseAnonKey } = getCommentsApiConfig();
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
}

function rowToComment(row: SupabasePublicRow, authorToken = ''): ArticleComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    articleUrl: row.article_url,
    articleTitle: row.article_title ?? undefined,
    pseudo: row.pseudo,
    body: row.body,
    authorToken,
    createdAt: Date.parse(row.created_at) || Date.now(),
  };
}

function mapPostError(status: number, detail: string): string {
  if (/rate_limit_hourly/i.test(detail)) {
    return 'Trop de commentaires cette heure-ci. Réessayez plus tard.';
  }
  if (/rate_limit_thread/i.test(detail)) {
    return 'Trop de messages sur cet article. Patientez quelques minutes.';
  }
  return detail || `Envoi impossible (${status})`;
}

export function isCommentsServiceConfigured(): boolean {
  return getCommentsApiConfig().enabled;
}

export async function fetchCommentThreadStats(): Promise<CommentThreadSummary[]> {
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled) return [];

  const params = new URLSearchParams({
    select: 'thread_id,article_url,article_title,comment_count,last_comment_at',
    order: 'last_comment_at.desc',
  });

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/article_comment_stats?${params}`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Impossible de charger les discussions (${res.status})`);
  }

  const rows = (await res.json()) as StatsRow[];
  return rows.map((row) => ({
    threadId: row.thread_id,
    articleUrl: row.article_url,
    articleTitle: row.article_title ?? undefined,
    commentCount: row.comment_count,
    lastCommentAt: Date.parse(row.last_comment_at) || Date.now(),
  }));
}

export async function fetchArticleComments(threadId: string): Promise<ArticleComment[]> {
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled) return [];

  const params = new URLSearchParams({
    select: 'id,thread_id,article_url,article_title,pseudo,body,created_at',
    thread_id: `eq.${threadId}`,
    order: 'created_at.asc',
  });

  // Vue sans author_token (sécurité)
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/article_comments_public?${params}`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) {
    // Fallback si la vue n’est pas encore déployée
    const legacy = await fetch(
      `${cfg.supabaseUrl}/rest/v1/article_comments?${new URLSearchParams({
        select: 'id,thread_id,article_url,article_title,pseudo,body,created_at',
        thread_id: `eq.${threadId}`,
        order: 'created_at.asc',
      })}`,
      { headers: supabaseHeaders() },
    );
    if (!legacy.ok) {
      throw new Error(`Impossible de charger les commentaires (${res.status})`);
    }
    const legacyRows = (await legacy.json()) as SupabasePublicRow[];
    return legacyRows.map((row) => rowToComment(row));
  }
  const rows = (await res.json()) as SupabasePublicRow[];
  return rows.map((row) => rowToComment(row));
}

export async function postArticleComment(input: PostArticleCommentInput): Promise<ArticleComment> {
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled) {
    throw new Error('Service de commentaires non configuré.');
  }

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/article_comments`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      thread_id: input.threadId,
      article_url: normalizeArticleUrlForComments(input.articleUrl),
      article_title: input.articleTitle ?? null,
      pseudo: input.pseudo,
      body: input.body,
      author_token: input.authorToken,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(mapPostError(res.status, detail));
  }

  const rows = (await res.json()) as Array<SupabasePublicRow & { author_token?: string }>;
  const row = rows[0];
  if (!row) throw new Error('Réponse serveur invalide.');
  // Ne pas renvoyer le jeton aux listes partagées
  return rowToComment(row, input.authorToken);
}

export async function deleteOwnArticleComment(
  commentId: string,
  authorToken: string,
): Promise<void> {
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled) return;

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/delete_article_comment_own`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      p_comment_id: commentId,
      p_author_token: authorToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Suppression impossible (${res.status})`);
  }
}
