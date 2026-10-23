-- Appigeek — sync compte Apple + push digest
-- À exécuter dans Supabase : SQL Editor → Run

-- Profil utilisateur (pseudo commentaires + préférences push)
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

-- Abonnements RSS synchronisés
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

-- État lus / favoris
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

-- Curseurs RSS pour le digest (derniers GUID notifiés par flux)
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

-- Service role (Edge Function) lit push_tokens / subscriptions / cursors sans contournement RLS côté client.
-- Les policies ci-dessus protègent l’accès anon/authenticated.
