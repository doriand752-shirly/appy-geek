import { getSupabase } from './supabaseClient';
import { pinFeaturedArticle, type FeaturedArticle } from './featuredArticlesService';

export type FeaturedProposalStatus = 'pending' | 'approved' | 'rejected';

export type FeaturedProposal = {
  id: string;
  articleUrl: string;
  title: string;
  feedTitle: string | null;
  imageUrl: string | null;
  proposedBy: string;
  status: FeaturedProposalStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

type ProposalRow = {
  id: string;
  article_url: string;
  title: string;
  feed_title: string | null;
  image_url: string | null;
  proposed_by: string;
  status: FeaturedProposalStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const SELECT_COLS =
  'id,article_url,title,feed_title,image_url,proposed_by,status,created_at,reviewed_at,reviewed_by';

function mapRow(row: ProposalRow): FeaturedProposal {
  return {
    id: row.id,
    articleUrl: row.article_url,
    title: row.title,
    feedTitle: row.feed_title,
    imageUrl: row.image_url,
    proposedBy: row.proposed_by,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

export type ProposeFeaturedInput = {
  articleUrl: string;
  title: string;
  feedTitle?: string | null;
  imageUrl?: string | null;
};

export async function proposeFeaturedArticle(
  input: ProposeFeaturedInput,
): Promise<FeaturedProposal> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Connexion Apple requise');

  const { data, error } = await supabase
    .from('featured_proposals')
    .insert({
      article_url: input.articleUrl.trim(),
      title: input.title.trim(),
      feed_title: input.feedTitle?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      proposed_by: userId,
      status: 'pending',
    })
    .select(SELECT_COLS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Vous avez déjà proposé cet article.');
    }
    throw error;
  }
  return mapRow(data as ProposalRow);
}

export async function fetchPendingFeaturedProposals(): Promise<FeaturedProposal[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('featured_proposals')
    .select(SELECT_COLS)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data as ProposalRow[] | null) ?? []).map(mapRow);
}

async function setProposalStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase
    .from('featured_proposals')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function rejectFeaturedProposal(id: string): Promise<void> {
  await setProposalStatus(id, 'rejected');
}

/** Valide : crée un featured (24 h) puis marque la proposition approuvée. */
export async function approveFeaturedProposal(
  proposal: FeaturedProposal,
): Promise<FeaturedArticle> {
  const featured = await pinFeaturedArticle({
    articleUrl: proposal.articleUrl,
    title: proposal.title,
    feedTitle: proposal.feedTitle,
    imageUrl: proposal.imageUrl,
    note: 'Proposition validée',
  });
  await setProposalStatus(proposal.id, 'approved');
  return featured;
}
