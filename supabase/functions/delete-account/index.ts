/**
 * Suppression de compte (RGPD) — JWT utilisateur requis.
 *
 * 1) purge_my_account_data() avec le JWT de l’utilisateur
 * 2) auth.admin.deleteUser via service role
 *
 * Deploy : supabase functions deploy delete-account
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !anon || !serviceKey || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'unauthorized' }, 401);
  }
  const userId = userData.user.id;

  const { data: purgeData, error: purgeError } = await userClient.rpc('purge_my_account_data');
  if (purgeError) {
    return json({ error: purgeError.message, step: 'purge' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: delError } = await admin.auth.admin.deleteUser(userId);
  if (delError) {
    return json({ error: delError.message, step: 'auth_delete', purge: purgeData }, 500);
  }

  return json({ ok: true, user_id: userId, purge: purgeData });
});

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
