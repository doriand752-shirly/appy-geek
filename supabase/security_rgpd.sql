-- Appigeek — sécurité + RGPD
-- À exécuter dans le SQL Editor après APPLY_ALL / admin_featured.
--
-- Contenu :
-- 1) Rate-limit commentaires
-- 2) Masquer author_token en lecture publique
-- 3) RPC admin pour déclencher digest-push (secret Vault)
-- 4) RPC suppression données compte (prépare delete-account edge)

-- ---------------------------------------------------------------------------
-- 1) Rate-limit commentaires (anti-spam)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hour int;
  v_thread int;
begin
  select count(*)::int into v_hour
  from public.article_comments
  where author_token = new.author_token
    and created_at > now() - interval '1 hour';

  if v_hour >= 12 then
    raise exception 'rate_limit_hourly'
      using errcode = 'P0001',
            hint = 'Trop de commentaires cette heure-ci. Réessayez plus tard.';
  end if;

  select count(*)::int into v_thread
  from public.article_comments
  where author_token = new.author_token
    and thread_id = new.thread_id
    and created_at > now() - interval '10 minutes';

  if v_thread >= 5 then
    raise exception 'rate_limit_thread'
      using errcode = 'P0001',
            hint = 'Trop de messages sur cet article. Patientez quelques minutes.';
  end if;

  return new;
end;
$$;

drop trigger if exists article_comments_rate_limit on public.article_comments;
create trigger article_comments_rate_limit
  before insert on public.article_comments
  for each row
  execute function public.enforce_comment_rate_limit();

-- ---------------------------------------------------------------------------
-- 2) Lecture publique sans author_token (évite le vol de jeton → suppressions)
-- ---------------------------------------------------------------------------
-- Vue sans author_token (lecture préférée côté app).
create or replace view public.article_comments_public as
select
  id,
  thread_id,
  article_url,
  article_title,
  pseudo,
  body,
  created_at
from public.article_comments;

grant select on public.article_comments_public to anon, authenticated;

-- SELECT colonne par colonne : author_token n’est plus lisible (anti-usurpation).
-- INSERT + return=representation restent possibles sur les colonnes autorisées.
revoke select on public.article_comments from anon, authenticated;
grant select (
  id,
  thread_id,
  article_url,
  article_title,
  pseudo,
  body,
  created_at
) on public.article_comments to anon, authenticated;
grant insert on public.article_comments to anon, authenticated;

create or replace function public.list_my_article_comment_ids(p_author_token uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.article_comments
  where author_token = p_author_token
  order by created_at desc
  limit 500;
$$;

revoke all on function public.list_my_article_comment_ids(uuid) from public;
grant execute on function public.list_my_article_comment_ids(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Admin → digest-push (secret dans Vault, pas dans l’app)
-- ---------------------------------------------------------------------------
-- Prérequis (une fois) dans SQL Editor :
--   select vault.create_secret('VOTRE_SECRET_LONG_ALEATOIRE', 'digest_push_secret');
-- Même valeur dans Edge Function secrets : DIGEST_PUSH_SECRET

create or replace function public.admin_trigger_digest_push(p_slot text)
returns json
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  slot text := lower(trim(coalesce(p_slot, '')));
  project_url text := 'https://ppnejmwvmkqnmrzcivqs.supabase.co';
  digest_secret text;
  anon_key text;
  req_id bigint;
begin
  if not public.is_app_admin() then
    raise exception 'admin required';
  end if;

  if slot not in ('morning', 'midday', 'evening') then
    raise exception 'invalid slot';
  end if;

  begin
    select decrypted_secret into digest_secret
    from vault.decrypted_secrets
    where name = 'digest_push_secret'
    limit 1;
  exception
    when others then
      digest_secret := null;
  end;

  if digest_secret is null or length(digest_secret) < 16 then
    raise exception 'digest_push_secret missing in vault';
  end if;

  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbmVqbXd2bWtxbm1yemNpdnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTkxOTUsImV4cCI6MjA5ODczNTE5NX0.TlenN0NZebxRq2Eazii6Haydf92wF61RF50hel5kHnY';
  begin
    select decrypted_secret into anon_key
    from vault.decrypted_secrets
    where name in ('publishable_key', 'anon_key', 'SUPABASE_ANON_KEY')
    order by case name
      when 'publishable_key' then 1
      when 'anon_key' then 2
      else 3
    end
    limit 1;
  exception
    when others then
      null;
  end;

  select net.http_post(
    url := project_url || '/functions/v1/digest-push?slot=' || slot,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(anon_key, ''),
      'apikey', coalesce(anon_key, ''),
      'x-digest-secret', digest_secret
    ),
    body := jsonb_build_object('slot', slot, 'source', 'admin_rpc'),
    timeout_milliseconds := 120000
  ) into req_id;

  return json_build_object('ok', true, 'request_id', req_id, 'slot', slot);
end;
$$;

revoke all on function public.admin_trigger_digest_push(text) from public;
grant execute on function public.admin_trigger_digest_push(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Purge données utilisateur (appelée par edge delete-account avant auth.delete)
-- ---------------------------------------------------------------------------
create or replace function public.purge_my_account_data()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n_profiles int := 0;
  n_subs int := 0;
  n_state int := 0;
  n_tokens int := 0;
  n_cursors int := 0;
  n_proposals int := 0;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.push_tokens where user_id = uid;
  get diagnostics n_tokens = row_count;

  delete from public.user_feed_cursors where user_id = uid;
  get diagnostics n_cursors = row_count;

  delete from public.user_article_state where user_id = uid;
  get diagnostics n_state = row_count;

  delete from public.user_subscriptions where user_id = uid;
  get diagnostics n_subs = row_count;

  delete from public.user_profiles where user_id = uid;
  get diagnostics n_profiles = row_count;

  if to_regclass('public.featured_proposals') is not null then
    delete from public.featured_proposals where proposed_by = uid;
    get diagnostics n_proposals = row_count;
  end if;

  if to_regclass('public.admin_users') is not null then
    delete from public.admin_users where user_id = uid;
  end if;

  if to_regclass('public.article_comment_reports') is not null then
    update public.article_comment_reports
    set reporter_user_id = null
    where reporter_user_id = uid;
  end if;

  if to_regclass('public.featured_articles') is not null then
    update public.featured_articles
    set created_by = null
    where created_by = uid;
  end if;

  return json_build_object(
    'ok', true,
    'user_id', uid,
    'deleted', json_build_object(
      'profiles', n_profiles,
      'subscriptions', n_subs,
      'article_state', n_state,
      'push_tokens', n_tokens,
      'feed_cursors', n_cursors,
      'proposals', n_proposals
    )
  );
end;
$$;

revoke all on function public.purge_my_account_data() from public;
grant execute on function public.purge_my_account_data() to authenticated;
