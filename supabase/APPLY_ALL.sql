-- Appigeek — appliquer UNE fois dans SQL Editor → Run
-- Concat: article_comments + user_sync + comment_reports + admin_featured

-- Appigeek â€” commentaires partagÃ©s par article (pseudo, sans compte)
-- Ã€ exÃ©cuter dans Supabase : SQL Editor â†’ New query â†’ Run

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
-- Suppression via RPC (vÃ©rifie author_token cÃ´tÃ© serveur)

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


-- Appigeek â€” sync compte Apple + push digest
-- Ã€ exÃ©cuter dans Supabase : SQL Editor â†’ Run

-- Profil utilisateur (pseudo commentaires + prÃ©fÃ©rences push)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  comment_pseudo text check (
    comment_pseudo is null
    or (char_length(comment_pseudo) between 2 and 24)
  ),
  push_digest_enabled boolean not null default true,
  last_digest_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Abonnements RSS synchronisÃ©s
create table if not exists public.user_subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  feed_id text not null,
  title text not null,
  url text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, feed_id)
);

create index if not exists user_subscriptions_user_idx
  on public.user_subscriptions (user_id);

alter table public.user_subscriptions enable row level security;

drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
create policy "user_subscriptions_select_own"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "user_subscriptions_insert_own" on public.user_subscriptions;
create policy "user_subscriptions_insert_own"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_subscriptions_update_own" on public.user_subscriptions;
create policy "user_subscriptions_update_own"
  on public.user_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_subscriptions_delete_own" on public.user_subscriptions;
create policy "user_subscriptions_delete_own"
  on public.user_subscriptions for delete
  using (auth.uid() = user_id);

-- Ã‰tat lus / favoris
create table if not exists public.user_article_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id text not null,
  is_read boolean not null default false,
  is_favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists user_article_state_user_idx
  on public.user_article_state (user_id);

alter table public.user_article_state enable row level security;

drop policy if exists "user_article_state_select_own" on public.user_article_state;
create policy "user_article_state_select_own"
  on public.user_article_state for select
  using (auth.uid() = user_id);

drop policy if exists "user_article_state_insert_own" on public.user_article_state;
create policy "user_article_state_insert_own"
  on public.user_article_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_article_state_update_own" on public.user_article_state;
create policy "user_article_state_update_own"
  on public.user_article_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_article_state_delete_own" on public.user_article_state;
create policy "user_article_state_delete_own"
  on public.user_article_state for delete
  using (auth.uid() = user_id);

-- Tokens Expo Push
create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  platform text not null default 'ios',
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- Curseurs RSS pour le digest (derniers GUID notifiÃ©s par flux)
create table if not exists public.user_feed_cursors (
  user_id uuid not null references auth.users (id) on delete cascade,
  feed_id text not null,
  last_guids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, feed_id)
);

alter table public.user_feed_cursors enable row level security;

drop policy if exists "user_feed_cursors_select_own" on public.user_feed_cursors;
create policy "user_feed_cursors_select_own"
  on public.user_feed_cursors for select
  using (auth.uid() = user_id);

drop policy if exists "user_feed_cursors_insert_own" on public.user_feed_cursors;
create policy "user_feed_cursors_insert_own"
  on public.user_feed_cursors for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_feed_cursors_update_own" on public.user_feed_cursors;
create policy "user_feed_cursors_update_own"
  on public.user_feed_cursors for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_feed_cursors_delete_own" on public.user_feed_cursors;
create policy "user_feed_cursors_delete_own"
  on public.user_feed_cursors for delete
  using (auth.uid() = user_id);

-- Service role (Edge Function) lit push_tokens / subscriptions / cursors sans contournement RLS cÃ´tÃ© client.
-- Les policies ci-dessus protÃ¨gent lâ€™accÃ¨s anon/authenticated.


-- Appigeek â€” signalement de commentaires
-- Ã€ exÃ©cuter dans Supabase : SQL Editor â†’ Run

create table if not exists public.article_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.article_comments (id) on delete cascade,
  reporter_token uuid,
  reporter_user_id uuid references auth.users (id) on delete set null,
  reason text not null default 'inappropriate'
    check (char_length(reason) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint article_comment_reports_reporter_chk check (
    reporter_token is not null or reporter_user_id is not null
  )
);

create unique index if not exists article_comment_reports_token_uidx
  on public.article_comment_reports (comment_id, reporter_token)
  where reporter_token is not null;

create unique index if not exists article_comment_reports_user_uidx
  on public.article_comment_reports (comment_id, reporter_user_id)
  where reporter_user_id is not null;

create index if not exists article_comment_reports_comment_idx
  on public.article_comment_reports (comment_id);

alter table public.article_comment_reports enable row level security;

-- Lecture rÃ©servÃ©e au service / dashboard (pas dâ€™exposition publique)
drop policy if exists "article_comment_reports_select_none" on public.article_comment_reports;
create policy "article_comment_reports_select_none"
  on public.article_comment_reports for select
  using (false);

drop policy if exists "article_comment_reports_insert" on public.article_comment_reports;
create policy "article_comment_reports_insert"
  on public.article_comment_reports for insert
  with check (
    (reporter_token is not null or reporter_user_id = auth.uid())
    and char_length(reason) between 1 and 120
  );

create or replace function public.report_article_comment(
  p_comment_id uuid,
  p_reporter_token uuid default null,
  p_reason text default 'inappropriate'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'inappropriate');
begin
  if p_reporter_token is null and v_user_id is null then
    raise exception 'reporter required';
  end if;
  if char_length(v_reason) > 120 then
    v_reason := left(v_reason, 120);
  end if;

  insert into public.article_comment_reports (
    comment_id,
    reporter_token,
    reporter_user_id,
    reason
  )
  values (
    p_comment_id,
    p_reporter_token,
    v_user_id,
    v_reason
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.report_article_comment(uuid, uuid, text) to anon, authenticated;



-- ===== admin_featured.sql =====

-- Appigeek â€” admin (allowlist) + articles Â« Ã€ la une Â» + outils admin
-- Ã€ exÃ©cuter dans Supabase : SQL Editor â†’ Run
-- AprÃ¨s article_comments / user_sync / comment_reports (ou via APPLY_ALL.sql)

-- ---------------------------------------------------------------------------
-- Admins (allowlist auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Un utilisateur connectÃ© peut seulement vÃ©rifier sa propre ligne (isAdmin)
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users for select
  using (auth.uid() = user_id);

-- Pas dâ€™insert/update/delete public : ajouter le 1er admin via SQL Editor (service role)

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Featured articles (Â« Ã€ la une Â»)
-- ---------------------------------------------------------------------------
create table if not exists public.featured_articles (
  id uuid primary key default gen_random_uuid(),
  article_url text not null,
  title text not null,
  feed_title text,
  image_url text,
  note text,
  sort_order int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint featured_articles_title_len check (char_length(title) between 1 and 400),
  constraint featured_articles_url_len check (char_length(article_url) between 8 and 2000),
  constraint featured_articles_note_len check (note is null or char_length(note) <= 500)
);

create index if not exists featured_articles_active_idx
  on public.featured_articles (sort_order asc, created_at desc);

create index if not exists featured_articles_url_idx
  on public.featured_articles (article_url);

alter table public.featured_articles enable row level security;

-- Lecture publique (anon + connectÃ©s) ; Ã©criture rÃ©servÃ©e aux admins (policies)
grant select on public.featured_articles to anon, authenticated;
grant insert, update, delete on public.featured_articles to authenticated;

-- Lecture publique des featured actuellement actifs
drop policy if exists "featured_articles_select_active" on public.featured_articles;
create policy "featured_articles_select_active"
  on public.featured_articles for select
  using (
    starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- Les admins voient aussi les featured hors fenÃªtre (via policy OR)
drop policy if exists "featured_articles_select_admin" on public.featured_articles;
create policy "featured_articles_select_admin"
  on public.featured_articles for select
  using (public.is_app_admin());

drop policy if exists "featured_articles_insert_admin" on public.featured_articles;
create policy "featured_articles_insert_admin"
  on public.featured_articles for insert
  with check (public.is_app_admin());

drop policy if exists "featured_articles_update_admin" on public.featured_articles;
create policy "featured_articles_update_admin"
  on public.featured_articles for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "featured_articles_delete_admin" on public.featured_articles;
create policy "featured_articles_delete_admin"
  on public.featured_articles for delete
  using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Signalements : statut + lecture / MAJ admin
-- ---------------------------------------------------------------------------
alter table public.article_comment_reports
  add column if not exists status text not null default 'open';

alter table public.article_comment_reports
  drop constraint if exists article_comment_reports_status_chk;

alter table public.article_comment_reports
  add constraint article_comment_reports_status_chk
  check (status in ('open', 'reviewed', 'dismissed'));

alter table public.article_comment_reports
  add column if not exists reviewed_at timestamptz;

alter table public.article_comment_reports
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

create index if not exists article_comment_reports_status_idx
  on public.article_comment_reports (status, created_at desc);

drop policy if exists "article_comment_reports_select_none" on public.article_comment_reports;
drop policy if exists "article_comment_reports_select_admin" on public.article_comment_reports;
create policy "article_comment_reports_select_admin"
  on public.article_comment_reports for select
  using (public.is_app_admin());

drop policy if exists "article_comment_reports_update_admin" on public.article_comment_reports;
create policy "article_comment_reports_update_admin"
  on public.article_comment_reports for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- Suppression dâ€™un commentaire par un admin (modÃ©ration)
create or replace function public.admin_delete_article_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'admin required';
  end if;
  delete from public.article_comments where id = p_comment_id;
end;
$$;

revoke all on function public.admin_delete_article_comment(uuid) from public;
grant execute on function public.admin_delete_article_comment(uuid) to authenticated;

-- Marquer un signalement
create or replace function public.admin_set_comment_report_status(
  p_report_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'admin required';
  end if;
  if p_status not in ('open', 'reviewed', 'dismissed') then
    raise exception 'invalid status';
  end if;
  update public.article_comment_reports
  set
    status = p_status,
    reviewed_at = case when p_status = 'open' then null else now() end,
    reviewed_by = case when p_status = 'open' then null else auth.uid() end
  where id = p_report_id;
end;
$$;

revoke all on function public.admin_set_comment_report_status(uuid, text) from public;
grant execute on function public.admin_set_comment_report_status(uuid, text) to authenticated;

-- Stats produit : voir admin_dashboard.sql (appliqué en fin de fichier)

-- ---------------------------------------------------------------------------
-- Premier admin (Ã  faire manuellement aprÃ¨s 1re connexion Apple)
-- ---------------------------------------------------------------------------
-- 1. Se connecter dans lâ€™app avec Sign in with Apple
-- 2. Dans SQL Editor, retrouver son id :
--    select id, email, created_at from auth.users order by created_at desc limit 10;
-- 3. InsÃ©rer :
--    insert into public.admin_users (user_id, note)
--    values ('VOTRE-UUID-AUTH-USERS', 'Dorian')
--    on conflict (user_id) do nothing;


-- ===== admin_dashboard.sql =====
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
