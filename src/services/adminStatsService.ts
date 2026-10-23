import { getSupabase } from './supabaseClient';

export type AdminStatsGlance = {
  usersTotal: number;
  usersToday: number;
  users7d: number;
  pushTokens: number;
  pushUsers: number;
  articlesReadTotal: number;
  articlesReadToday: number;
  articlesRead7d: number;
  readers7d: number;
  favoritesTotal: number;
  subscribers: number;
  commentsToday: number;
  commentsTotal: number;
  featuredActive: number;
  featuredProposalsPending: number;
  reportsOpen: number;
  downloadsTotal: number;
  downloads7d: number;
  downloadsToday: number;
  storeUpdatedAt: string | null;
  storeSource: string | null;
};

const EMPTY: AdminStatsGlance = {
  usersTotal: 0,
  usersToday: 0,
  users7d: 0,
  pushTokens: 0,
  pushUsers: 0,
  articlesReadTotal: 0,
  articlesReadToday: 0,
  articlesRead7d: 0,
  readers7d: 0,
  favoritesTotal: 0,
  subscribers: 0,
  commentsToday: 0,
  commentsTotal: 0,
  featuredActive: 0,
  featuredProposalsPending: 0,
  reportsOpen: 0,
  downloadsTotal: 0,
  downloads7d: 0,
  downloadsToday: 0,
  storeUpdatedAt: null,
  storeSource: null,
};

export async function fetchAdminStatsGlance(): Promise<AdminStatsGlance> {
  const supabase = getSupabase();
  if (!supabase) return { ...EMPTY };

  const { data, error } = await supabase.rpc('admin_stats_glance');
  if (error) throw error;

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    usersTotal: Number(raw.users_total ?? 0),
    usersToday: Number(raw.users_today ?? 0),
    users7d: Number(raw.users_7d ?? 0),
    pushTokens: Number(raw.push_tokens ?? 0),
    pushUsers: Number(raw.push_users ?? 0),
    articlesReadTotal: Number(raw.articles_read_total ?? 0),
    articlesReadToday: Number(raw.articles_read_today ?? 0),
    articlesRead7d: Number(raw.articles_read_7d ?? 0),
    readers7d: Number(raw.readers_7d ?? 0),
    favoritesTotal: Number(raw.favorites_total ?? 0),
    subscribers: Number(raw.subscribers ?? 0),
    commentsToday: Number(raw.comments_today ?? 0),
    commentsTotal: Number(raw.comments_total ?? 0),
    featuredActive: Number(raw.featured_active ?? 0),
    featuredProposalsPending: Number(raw.featured_proposals_pending ?? 0),
    reportsOpen: Number(raw.reports_open ?? 0),
    downloadsTotal: Number(raw.downloads_total ?? 0),
    downloads7d: Number(raw.downloads_7d ?? 0),
    downloadsToday: Number(raw.downloads_today ?? 0),
    storeUpdatedAt:
      typeof raw.store_updated_at === 'string' ? raw.store_updated_at : null,
    storeSource: typeof raw.store_source === 'string' ? raw.store_source : null,
  };
}
