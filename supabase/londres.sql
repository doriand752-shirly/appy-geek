-- Tables isolées pour le trip Londres (projet Appigeek).
-- N’impacte pas article_comments, admin_users, etc.

create table if not exists public.londres_users (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 40),
  votes jsonb not null default '{}'::jsonb,
  super_left int not null default 3 check (super_left >= 0 and super_left <= 3),
  updated_at timestamptz not null default now()
);

create table if not exists public.londres_places (
  id text primary key,
  name text not null,
  tag text,
  area text,
  area_label text,
  duration numeric,
  cost text,
  blurb text,
  image text,
  maps text not null,
  lat double precision,
  lng double precision,
  place_id text,
  added_by text,
  evening boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.londres_users enable row level security;
alter table public.londres_places enable row level security;

drop policy if exists "londres_users_select" on public.londres_users;
create policy "londres_users_select"
  on public.londres_users for select using (true);

drop policy if exists "londres_users_insert" on public.londres_users;
create policy "londres_users_insert"
  on public.londres_users for insert
  with check (char_length(name) between 2 and 40 and super_left between 0 and 3);

drop policy if exists "londres_users_update" on public.londres_users;
create policy "londres_users_update"
  on public.londres_users for update
  using (true)
  with check (char_length(name) between 2 and 40 and super_left between 0 and 3);

drop policy if exists "londres_places_select" on public.londres_places;
create policy "londres_places_select"
  on public.londres_places for select using (true);

drop policy if exists "londres_places_insert" on public.londres_places;
create policy "londres_places_insert"
  on public.londres_places for insert
  with check (char_length(name) > 0 and char_length(maps) > 0);

drop policy if exists "londres_places_update" on public.londres_places;
create policy "londres_places_update"
  on public.londres_places for update
  using (true)
  with check (char_length(name) > 0 and char_length(maps) > 0);

grant select, insert, update on public.londres_users to anon, authenticated;
grant select, insert, update on public.londres_places to anon, authenticated;

alter table public.londres_users replica identity full;
alter table public.londres_places replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'londres_users'
  ) then
    alter publication supabase_realtime add table public.londres_users;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'londres_places'
  ) then
    alter publication supabase_realtime add table public.londres_places;
  end if;
end $$;
