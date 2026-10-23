-- Appigeek — signalement de commentaires
-- À exécuter dans Supabase : SQL Editor → Run

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

-- Lecture réservée au service / dashboard (pas d’exposition publique)
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
