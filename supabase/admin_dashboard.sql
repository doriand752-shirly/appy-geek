-- Appigeek — dashboard admin (utilisateurs, lectures, métriques Store)
-- À exécuter après admin_featured.sql / user_sync.sql

-- Cache métriques App Store (rempli par scripts/asc-sync-downloads.mjs)
create table if not exists public.admin_store_metrics (
  id smallint primary key default 1 check (id = 1),
  downloads_total bigint not null default 0,
  downloads_7d bigint not null default 0,
  downloads_today bigint not null default 0,
  source text,
  updated_at timestamptz not null default now()
);

insert into public.admin_store_metrics (id)
values (1)
on conflict (id) do nothing;

alter table public.admin_store_metrics enable row level security;

drop policy if exists "admin_store_metrics_select_admin" on public.admin_store_metrics;
create policy "admin_store_metrics_select_admin"
  on public.admin_store_metrics for select
  using (public.is_app_admin());

create index if not exists user_article_state_read_updated_idx
  on public.user_article_state (updated_at)
  where is_read;

-- Stats produit + ops (security definer, réservé admin)
create or replace function public.admin_stats_glance()
returns json
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_day_start timestamptz;
  v_7d_start timestamptz;
  v_users_total bigint;
  v_users_today bigint;
  v_users_7d bigint;
  v_push_tokens bigint;
  v_push_users bigint;
  v_articles_read_total bigint;
  v_articles_read_today bigint;
  v_articles_read_7d bigint;
  v_readers_7d bigint;
  v_favorites_total bigint;
  v_subscribers bigint;
  v_comments_today bigint;
  v_comments_total bigint;
  v_featured_active bigint;
  v_featured_proposals_pending bigint;
  v_reports_open bigint;
  v_downloads_total bigint;
  v_downloads_7d bigint;
  v_downloads_today bigint;
  v_store_updated_at timestamptz;
  v_store_source text;
begin
  if not public.is_app_admin() then
    raise exception 'admin required';
  end if;

  v_day_start := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  v_7d_start := v_day_start - interval '7 days';

  select count(*) into v_users_total from auth.users;
  select count(*) into v_users_today from auth.users where created_at >= v_day_start;
  select count(*) into v_users_7d from auth.users where created_at >= v_7d_start;

  select count(*) into v_push_tokens from public.push_tokens;
  select count(distinct user_id) into v_push_users from public.push_tokens;

  select count(*) into v_articles_read_total
  from public.user_article_state
  where is_read;

  select count(*) into v_articles_read_today
  from public.user_article_state
  where is_read and updated_at >= v_day_start;

  select count(*) into v_articles_read_7d
  from public.user_article_state
  where is_read and updated_at >= v_7d_start;

  select count(distinct user_id) into v_readers_7d
  from public.user_article_state
  where is_read and updated_at >= v_7d_start;

  select count(*) into v_favorites_total
  from public.user_article_state
  where is_favorite;

  select count(distinct user_id) into v_subscribers
  from public.user_subscriptions;

  select count(*) into v_comments_today
  from public.article_comments
  where created_at >= v_day_start;

  select count(*) into v_comments_total from public.article_comments;

  select count(*) into v_featured_active
  from public.featured_articles
  where starts_at <= now()
    and coalesce(ends_at, created_at + interval '24 hours') > now()
    and created_at > now() - interval '24 hours';

  select count(*) into v_featured_proposals_pending
  from public.featured_proposals
  where status = 'pending';

  select count(*) into v_reports_open
  from public.article_comment_reports
  where status = 'open';

  select
    m.downloads_total,
    m.downloads_7d,
    m.downloads_today,
    m.updated_at,
    m.source
  into
    v_downloads_total,
    v_downloads_7d,
    v_downloads_today,
    v_store_updated_at,
    v_store_source
  from public.admin_store_metrics m
  where m.id = 1;

  return json_build_object(
    'users_total', coalesce(v_users_total, 0),
    'users_today', coalesce(v_users_today, 0),
    'users_7d', coalesce(v_users_7d, 0),
    'push_tokens', coalesce(v_push_tokens, 0),
    'push_users', coalesce(v_push_users, 0),
    'articles_read_total', coalesce(v_articles_read_total, 0),
    'articles_read_today', coalesce(v_articles_read_today, 0),
    'articles_read_7d', coalesce(v_articles_read_7d, 0),
    'readers_7d', coalesce(v_readers_7d, 0),
    'favorites_total', coalesce(v_favorites_total, 0),
    'subscribers', coalesce(v_subscribers, 0),
    'comments_today', coalesce(v_comments_today, 0),
    'comments_total', coalesce(v_comments_total, 0),
    'featured_active', coalesce(v_featured_active, 0),
    'featured_proposals_pending', coalesce(v_featured_proposals_pending, 0),
    'reports_open', coalesce(v_reports_open, 0),
    'downloads_total', coalesce(v_downloads_total, 0),
    'downloads_7d', coalesce(v_downloads_7d, 0),
    'downloads_today', coalesce(v_downloads_today, 0),
    'store_updated_at', v_store_updated_at,
    'store_source', v_store_source
  );
end;
$$;

revoke all on function public.admin_stats_glance() from public;
grant execute on function public.admin_stats_glance() to authenticated;
