-- Appigeek — planning digest-push (Europe/Paris, DST-safe)
-- À exécuter dans le SQL Editor du projet ppnejmwvmkqnmrzcivqs
-- après déploiement de la Edge Function digest-push.
--
-- Stratégie : un cron horaire UTC qui n’appelle la fonction que si
-- l’heure Europe/Paris est 08:00, 13:00 ou 18:00 (gère CET/CEST).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Retirer d’anciens jobs digest (noms connus + motif)
do $$
declare
  r record;
begin
  for r in
    select jobid, jobname
    from cron.job
    where jobname in (
      'digest-push',
      'digest-push-every-30',
      'digest-push-30min',
      'invoke-digest-push',
      'digest-push-paris',
      'digest-push-morning',
      'digest-push-midday',
      'digest-push-evening'
    )
    or jobname ilike '%digest%push%'
    or command ilike '%/functions/v1/digest-push%'
  loop
    perform cron.unschedule(r.jobid);
    raise notice 'Unscheduled cron job % (%)', r.jobname, r.jobid;
  end loop;
end $$;

create or replace function public.invoke_digest_push_paris_slot()
returns void
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  paris_hour int;
  slot text;
  project_url text := 'https://ppnejmwvmkqnmrzcivqs.supabase.co';
  anon_key text;
  vault_key text;
begin
  paris_hour := extract(hour from (timezone('Europe/Paris', now())))::int;

  slot := case paris_hour
    when 8 then 'morning'
    when 13 then 'midday'
    when 18 then 'evening'
    else null
  end;

  if slot is null then
    return;
  end if;

  -- Clé anon (Authorization) + secret digest (x-digest-secret).
  -- Prérequis : select vault.create_secret('…', 'digest_push_secret');
  -- et Edge secret DIGEST_PUSH_SECRET = même valeur.
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbmVqbXd2bWtxbm1yemNpdnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTkxOTUsImV4cCI6MjA5ODczNTE5NX0.TlenN0NZebxRq2Eazii6Haydf92wF61RF50hel5kHnY';
  vault_key := null;

  begin
    select decrypted_secret into vault_key
    from vault.decrypted_secrets
    where name in ('publishable_key', 'anon_key', 'SUPABASE_ANON_KEY')
    order by case name
      when 'publishable_key' then 1
      when 'anon_key' then 2
      else 3
    end
    limit 1;
    if vault_key is not null and length(vault_key) > 10 then
      anon_key := vault_key;
    end if;
  exception
    when others then
      null;
  end;

  begin
    select decrypted_secret into vault_key
    from vault.decrypted_secrets
    where name = 'digest_push_secret'
    limit 1;
  exception
    when others then
      vault_key := null;
  end;

  if vault_key is null or length(vault_key) < 16 then
    raise warning 'digest_push_secret missing in vault — digest skipped';
    return;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/digest-push?slot=' || slot,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(anon_key, ''),
      'apikey', coalesce(anon_key, ''),
      'x-digest-secret', vault_key
    ),
    body := jsonb_build_object('slot', slot, 'source', 'pg_cron'),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.invoke_digest_push_paris_slot() from public;
grant execute on function public.invoke_digest_push_paris_slot() to postgres;

select cron.schedule(
  'digest-push-paris',
  '0 * * * *', -- chaque heure UTC, à :00 ; filtre Paris dans la fonction
  $$ select public.invoke_digest_push_paris_slot(); $$
);

-- Vérification :
--   select jobid, jobname, schedule, command from cron.job where jobname = 'digest-push-paris';
-- Test manuel d’un créneau :
--   select net.http_post(
--     url := 'https://ppnejmwvmkqnmrzcivqs.supabase.co/functions/v1/digest-push?slot=evening',
--     headers := '{"Content-Type":"application/json"}'::jsonb,
--     body := '{"slot":"evening"}'::jsonb
--   );
