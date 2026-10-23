import { getCommentsApiConfig } from '../constants/commentsApi';
import { getSupabase } from './supabaseClient';

export async function reportArticleComment(input: {
  commentId: string;
  reporterToken: string | null;
  reason?: string;
}): Promise<void> {
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled) throw new Error('Service non configuré.');

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc('report_article_comment', {
      p_comment_id: input.commentId,
      p_reporter_token: input.reporterToken,
      p_reason: input.reason ?? 'inappropriate',
    });
    if (error) {
      // Conflit unique = déjà signalé → succès silencieux
      if (error.code === '23505') return;
      throw error;
    }
    return;
  }

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/report_article_comment`, {
    method: 'POST',
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_comment_id: input.commentId,
      p_reporter_token: input.reporterToken,
      p_reason: input.reason ?? 'inappropriate',
    }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Signalement impossible (${res.status})`);
  }
}
