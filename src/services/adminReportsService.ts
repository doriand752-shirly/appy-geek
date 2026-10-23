import { getSupabase } from './supabaseClient';

export type CommentReportStatus = 'open' | 'reviewed' | 'dismissed';

export type AdminCommentReport = {
  id: string;
  commentId: string;
  reason: string;
  status: CommentReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  commentBody: string | null;
  commentPseudo: string | null;
  articleTitle: string | null;
  articleUrl: string | null;
};

type ReportRow = {
  id: string;
  comment_id: string;
  reason: string;
  status: CommentReportStatus;
  created_at: string;
  reviewed_at: string | null;
  article_comments:
    | {
        body: string | null;
        pseudo: string | null;
        article_title: string | null;
        article_url: string | null;
      }
    | {
        body: string | null;
        pseudo: string | null;
        article_title: string | null;
        article_url: string | null;
      }[]
    | null;
};

function commentFromJoin(
  join: ReportRow['article_comments'],
): {
  body: string | null;
  pseudo: string | null;
  article_title: string | null;
  article_url: string | null;
} | null {
  if (!join) return null;
  return Array.isArray(join) ? join[0] ?? null : join;
}

export async function fetchOpenCommentReports(): Promise<AdminCommentReport[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('article_comment_reports')
    .select(
      'id,comment_id,reason,status,created_at,reviewed_at,article_comments(body,pseudo,article_title,article_url)',
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data as unknown as ReportRow[] | null) ?? []).map((row) => {
    const comment = commentFromJoin(row.article_comments);
    return {
      id: row.id,
      commentId: row.comment_id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      commentBody: comment?.body ?? null,
      commentPseudo: comment?.pseudo ?? null,
      articleTitle: comment?.article_title ?? null,
      articleUrl: comment?.article_url ?? null,
    };
  });
}

export async function setCommentReportStatus(
  reportId: string,
  status: CommentReportStatus,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  const { error } = await supabase.rpc('admin_set_comment_report_status', {
    p_report_id: reportId,
    p_status: status,
  });
  if (error) throw error;
}

export async function adminDeleteComment(commentId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  const { error } = await supabase.rpc('admin_delete_article_comment', {
    p_comment_id: commentId,
  });
  if (error) throw error;
}
