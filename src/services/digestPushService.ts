import { getSupabase } from './supabaseClient';

export type DigestSlot = 'morning' | 'midday' | 'evening';

export type DigestPushResult = {
  ok: boolean;
  status: number;
  body: string;
};

/**
 * Déclenche digest-push via RPC admin (secret côté Vault, jamais dans l’app).
 */
export async function triggerDigestPush(slot: DigestSlot): Promise<DigestPushResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, status: 0, body: 'Supabase non configuré' };
  }

  const { data, error } = await supabase.rpc('admin_trigger_digest_push', {
    p_slot: slot,
  });

  if (error) {
    return { ok: false, status: 403, body: error.message };
  }

  return {
    ok: true,
    status: 200,
    body: typeof data === 'string' ? data : JSON.stringify(data ?? { ok: true }),
  };
}
