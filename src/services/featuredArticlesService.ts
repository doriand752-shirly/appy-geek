import { getSupabase } from './supabaseClient';

const FEATURED_TTL_MS = 24 * 60 * 60 * 1000;

export type FeaturedArticle = {
  id: string;
  articleUrl: string;
  title: string;
  feedTitle: string | null;
  imageUrl: string | null;
  note: string | null;
  sortOrder: number;
  startsAt: string;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

type FeaturedRow = {
  id: string;
  article_url: string;
  title: string;
  feed_title: string | null;
  image_url: string | null;
  note: string | null;
  sort_order: number;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

function mapRow(row: FeaturedRow): FeaturedArticle {
  return {
    id: row.id,
    articleUrl: row.article_url,
    title: row.title,
    feedTitle: row.feed_title,
    imageUrl: row.image_url,
    note: row.note,
    sortOrder: row.sort_order,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

const SELECT_COLS =
  'id,article_url,title,feed_title,image_url,note,sort_order,starts_at,ends_at,created_by,created_at';

export function defaultFeaturedEndsAt(from = new Date()): string {
  return new Date(from.getTime() + FEATURED_TTL_MS).toISOString();
}

/** Fenêtre active côté client (starts_at / ends_at / max 24 h depuis created_at). */
export function isFeaturedStillActive(f: FeaturedArticle, now = Date.now()): boolean {
  const created = new Date(f.createdAt).getTime();
  const starts = new Date(f.startsAt).getTime();
  const ends = f.endsAt
    ? new Date(f.endsAt).getTime()
    : created + FEATURED_TTL_MS;
  return (
    Number.isFinite(created) &&
    Number.isFinite(starts) &&
    starts <= now &&
    ends > now &&
    created > now - FEATURED_TTL_MS
  );
}

/** Featured actuellement actifs (lecture publique via RLS). Plus récent à gauche. */
export async function fetchActiveFeaturedArticles(): Promise<FeaturedArticle[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('featured_articles')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const now = Date.now();
  return ((data as FeaturedRow[] | null) ?? [])
    .map(mapRow)
    .filter((f) => isFeaturedStillActive(f, now));
}

/** Featured encore actifs (admin — filtre client si RLS expose aussi l’historique). */
export async function fetchAllFeaturedArticles(): Promise<FeaturedArticle[]> {
  const rows = await fetchActiveFeaturedArticles();
  return rows;
}

export type PinFeaturedInput = {
  articleUrl: string;
  title: string;
  feedTitle?: string | null;
  imageUrl?: string | null;
  note?: string | null;
  sortOrder?: number;
  endsAt?: string | null;
};

export async function pinFeaturedArticle(input: PinFeaturedInput): Promise<FeaturedArticle> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;
  const startsAt = new Date();

  const { data: existing } = await supabase
    .from('featured_articles')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    typeof input.sortOrder === 'number'
      ? input.sortOrder
      : ((existing as { sort_order?: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('featured_articles')
    .insert({
      article_url: input.articleUrl.trim(),
      title: input.title.trim(),
      feed_title: input.feedTitle?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      note: input.note?.trim() || null,
      sort_order: nextOrder,
      starts_at: startsAt.toISOString(),
      ends_at: input.endsAt ?? defaultFeaturedEndsAt(startsAt),
      created_by: userId,
    })
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  return mapRow(data as FeaturedRow);
}

export async function unpinFeaturedArticle(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.from('featured_articles').delete().eq('id', id);
  if (error) throw error;
}

/** Met fin immédiatement (soft unpin) sans supprimer l’historique. */
export async function endFeaturedArticle(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase
    .from('featured_articles')
    .update({ ends_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function reorderFeaturedArticles(
  orderedIds: string[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('featured_articles').update({ sort_order: index }).eq('id', id),
    ),
  );
}
