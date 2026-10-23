-- Sync quotidien des téléchargements App Store → admin_store_metrics
-- Prérequis : Edge Function sync-store-metrics déployée + secrets ASC_* + DIGEST_PUSH_SECRET

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  r record;
begin
  for r in
    select jobid, jobname
    from cron.job
    where jobname in ('sync-store-metrics', 'sync-store-metrics-daily')
      or command ilike '%/functions/v1/sync-store-metrics%'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

create or replace function public.invoke_sync_store_metrics()
returns void
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  project_url text := 'https://ppnejmwvmkqnmrzcivqs.supabase.co';
  anon_key text;
  vault_key text;
begin
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
    raise warning 'digest_push_secret missing — sync-store-metrics skipped';
    return;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/sync-store-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(anon_key, ''),
      'apikey', coalesce(anon_key, ''),
      'x-digest-secret', vault_key
    ),
    body := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.invoke_sync_store_metrics() from public;
grant execute on function public.invoke_sync_store_metrics() to postgres;

-- Tous les jours à 09:15 UTC (~10:15 / 11:15 Paris selon DST)
select cron.schedule(
  'sync-store-metrics-daily',
  '15 9 * * *',
  $$ select public.invoke_sync_store_metrics(); $$
);
