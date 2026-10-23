import type { FeedSubscription } from '../types/article';
import { getSupabase } from './supabaseClient';

export type CloudUserProfile = {
  commentPseudo: string;
  pushDigestEnabled: boolean;
  lastDigestSentAt: number | null;
};

export type CloudSyncPayload = {
  profile: CloudUserProfile;
  subscriptions: FeedSubscription[];
  readIds: string[];
  favoriteIds: string[];
};

type ProfileRow = {
  comment_pseudo: string | null;
  push_digest_enabled: boolean;
  last_digest_sent_at: string | null;
};

type SubRow = {
  feed_id: string;
  title: string;
  url: string;
};

type StateRow = {
  article_id: string;
  is_read: boolean;
  is_favorite: boolean;
};

export async function ensureUserProfile(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
}

export async function fetchCloudSync(userId: string): Promise<CloudSyncPayload> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      profile: { commentPseudo: '', pushDigestEnabled: true, lastDigestSentAt: null },
      subscriptions: [],
      readIds: [],
      favoriteIds: [],
    };
  }

  await ensureUserProfile(userId);

  const [profileRes, subsRes, stateRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('comment_pseudo,push_digest_enabled,last_digest_sent_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('user_subscriptions').select('feed_id,title,url').eq('user_id', userId),
    supabase
      .from('user_article_state')
      .select('article_id,is_read,is_favorite')
      .eq('user_id', userId),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (subsRes.error) throw subsRes.error;
  if (stateRes.error) throw stateRes.error;

  const profile = (profileRes.data as ProfileRow | null) ?? null;
  const subs = (subsRes.data as SubRow[] | null) ?? [];
  const states = (stateRes.data as StateRow[] | null) ?? [];

  return {
    profile: {
      commentPseudo: profile?.comment_pseudo?.trim() ?? '',
      pushDigestEnabled: profile?.push_digest_enabled ?? true,
      lastDigestSentAt: profile?.last_digest_sent_at
        ? Date.parse(profile.last_digest_sent_at)
        : null,
    },
    subscriptions: subs.map((s) => ({
      id: s.feed_id,
      title: s.title,
      url: s.url,
    })),
    readIds: states.filter((s) => s.is_read).map((s) => s.article_id),
    favoriteIds: states.filter((s) => s.is_favorite).map((s) => s.article_id),
  };
}

export async function upsertUserProfile(
  userId: string,
  patch: { commentPseudo?: string; pushDigestEnabled?: boolean },
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (patch.commentPseudo !== undefined) {
    row.comment_pseudo = patch.commentPseudo.trim() || null;
  }
  if (patch.pushDigestEnabled !== undefined) {
    row.push_digest_enabled = patch.pushDigestEnabled;
  }
  const { error } = await supabase.from('user_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function replaceUserSubscriptions(
  userId: string,
  subscriptions: FeedSubscription[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error: delError } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', userId);
  if (delError) throw delError;

  if (!subscriptions.length) return;

  const rows = subscriptions.map((s) => ({
    user_id: userId,
    feed_id: s.id,
    title: s.title,
    url: s.url,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('user_subscriptions').upsert(rows, {
    onConflict: 'user_id,feed_id',
  });
  if (error) throw error;
}

export async function upsertArticleStates(
  userId: string,
  readIds: string[],
  favoriteIds: string[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const ids = new Set([...readIds, ...favoriteIds]);
  if (!ids.size) return;

  const favSet = new Set(favoriteIds);
  const readSet = new Set(readIds);
  const rows = [...ids].map((articleId) => ({
    user_id: userId,
    article_id: articleId,
    is_read: readSet.has(articleId),
    is_favorite: favSet.has(articleId),
    updated_at: new Date().toISOString(),
  }));

  // Upsert par lots pour rester sous les limites PostgREST
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from('user_article_state').upsert(slice, {
      onConflict: 'user_id,article_id',
    });
    if (error) throw error;
  }
}

export async function registerPushToken(
  userId: string,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' },
  );
  if (error) throw error;
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .neq('expo_push_token', expoPushToken);
}

export async function unregisterPushToken(userId: string, expoPushToken: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('expo_push_token', expoPushToken);
}

/** Fusion abonnements : union par URL normalisée (préférence titre local si collision). */
export function mergeSubscriptions(
  local: FeedSubscription[],
  remote: FeedSubscription[],
): FeedSubscription[] {
  const byUrl = new Map<string, FeedSubscription>();
  for (const s of remote) {
    byUrl.set(s.url.trim().toLowerCase(), s);
  }
  for (const s of local) {
    byUrl.set(s.url.trim().toLowerCase(), s);
  }
  return [...byUrl.values()].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
}

export function mergeIdSets(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote])];
}
