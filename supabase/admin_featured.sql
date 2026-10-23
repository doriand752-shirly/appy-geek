-- Appigeek — admin (allowlist) + articles « À la une » + outils admin
-- À exécuter dans Supabase : SQL Editor → Run
-- Après article_comments / user_sync / comment_reports (ou via APPLY_ALL.sql)

-- ---------------------------------------------------------------------------
-- Admins (allowlist auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Un utilisateur connecté peut seulement vérifier sa propre ligne (isAdmin)
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users for select
  using (auth.uid() = user_id);

-- Pas d’insert/update/delete public : ajouter le 1er admin via SQL Editor (service role)

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
-- Featured articles (« À la une »)
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

-- Index lecture « À la une » : plus récent ajouté en premier
drop index if exists featured_articles_active_idx;
create index if not exists featured_articles_active_idx
  on public.featured_articles (created_at desc);

create index if not exists featured_articles_url_idx
  on public.featured_articles (article_url);

-- Expiration auto 24 h : backfill des lignes sans ends_at
update public.featured_articles
set ends_at = created_at + interval '24 hours'
where ends_at is null;

alter table public.featured_articles enable row level security;

-- Lecture publique (anon + connectés) ; écriture réservée aux admins (policies)
grant select on public.featured_articles to anon, authenticated;
grant insert, update, delete on public.featured_articles to authenticated;

-- Lecture publique des featured actuellement actifs (fenêtre starts_at…ends_at, max 24 h)
drop policy if exists "featured_articles_select_active" on public.featured_articles;
create policy "featured_articles_select_active"
  on public.featured_articles for select
  using (
    starts_at <= now()
    and coalesce(ends_at, created_at + interval '24 hours') > now()
    and created_at > now() - interval '24 hours'
  );

-- Les admins voient aussi les featured hors fenêtre (via policy OR)
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
-- Propositions utilisateurs (« Proposer à la une »)
-- ---------------------------------------------------------------------------
create table if not exists public.featured_proposals (
  id uuid primary key default gen_random_uuid(),
  article_url text not null,
  title text not null,
  feed_title text,
  image_url text,
  proposed_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  constraint featured_proposals_title_len check (char_length(title) between 1 and 400),
  constraint featured_proposals_url_len check (char_length(article_url) between 8 and 2000),
  constraint featured_proposals_status_chk check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists featured_proposals_status_created_idx
  on public.featured_proposals (status, created_at desc);

create index if not exists featured_proposals_by_user_idx
  on public.featured_proposals (proposed_by, created_at desc);

-- Une seule proposition en attente par utilisateur + URL
create unique index if not exists featured_proposals_pending_unique
  on public.featured_proposals (proposed_by, article_url)
  where status = 'pending';

alter table public.featured_proposals enable row level security;

grant select, insert on public.featured_proposals to authenticated;
grant update on public.featured_proposals to authenticated;

drop policy if exists "featured_proposals_select_own" on public.featured_proposals;
create policy "featured_proposals_select_own"
  on public.featured_proposals for select
  using (auth.uid() = proposed_by);

drop policy if exists "featured_proposals_select_admin" on public.featured_proposals;
create policy "featured_proposals_select_admin"
  on public.featured_proposals for select
  using (public.is_app_admin());

drop policy if exists "featured_proposals_insert_own" on public.featured_proposals;
create policy "featured_proposals_insert_own"
  on public.featured_proposals for insert
  with check (
    auth.uid() = proposed_by
    and status = 'pending'
  );

drop policy if exists "featured_proposals_update_admin" on public.featured_proposals;
create policy "featured_proposals_update_admin"
  on public.featured_proposals for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

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

-- Suppression d’un commentaire par un admin (modération)
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

-- Stats produit : voir admin_dashboard.sql (admin_stats_glance étendu)

-- ---------------------------------------------------------------------------
-- Premier admin (à faire manuellement après 1re connexion Apple)
-- ---------------------------------------------------------------------------
-- 1. Se connecter dans l’app avec Sign in with Apple
-- 2. Dans SQL Editor, retrouver son id :
--    select id, email, created_at from auth.users order by created_at desc limit 10;
-- 3. Insérer :
--    insert into public.admin_users (user_id, note)
--    values ('VOTRE-UUID-AUTH-USERS', 'Dorian')
--    on conflict (user_id) do nothing;
