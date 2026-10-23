-- Appigeek — commentaires partagés par article (pseudo, sans compte)
-- À exécuter dans Supabase : SQL Editor → New query → Run

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  article_url text not null,
  article_title text,
  pseudo text not null check (char_length(pseudo) between 2 and 24),
  body text not null check (char_length(body) between 1 and 1200),
  author_token uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists article_comments_thread_created_idx
  on public.article_comments (thread_id, created_at asc);

alter table public.article_comments enable row level security;

drop policy if exists "article_comments_select" on public.article_comments;
create policy "article_comments_select"
  on public.article_comments for select
  using (true);

drop policy if exists "article_comments_insert" on public.article_comments;
create policy "article_comments_insert"
  on public.article_comments for insert
  with check (
    char_length(pseudo) between 2 and 24
    and char_length(body) between 1 and 1200
  );

drop policy if exists "article_comments_delete_own" on public.article_comments;
-- Suppression via RPC (vérifie author_token côté serveur)

create or replace function public.delete_article_comment_own(
  p_comment_id uuid,
  p_author_token uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.article_comments
  where id = p_comment_id and author_token = p_author_token;
$$;

grant execute on function public.delete_article_comment_own(uuid, uuid) to anon, authenticated;

-- Stats par fil (pour compteurs accueil + onglet Discussions)
create or replace view public.article_comment_stats as
select
  thread_id,
  max(article_url) as article_url,
  max(article_title) as article_title,
  count(*)::int as comment_count,
  max(created_at) as last_comment_at
from public.article_comments
group by thread_id
having count(*) > 0;

grant select on public.article_comment_stats to anon, authenticated;
