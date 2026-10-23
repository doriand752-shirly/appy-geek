import { getSupabase } from './supabaseClient';

/** Vérifie si l’utilisateur connecté est dans admin_users. */
export async function checkIsAppAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase.rpc('is_app_admin');
  if (!error && typeof data === 'boolean') return data;

  const { data: row, error: rowErr } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (rowErr) return false;
  return !!row?.user_id;
}
