import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearOfflineCache } from '../utils/offlineCache';
import { getCommentsApiConfig } from '../constants/commentsApi';
import { getSupabase } from './supabaseClient';

/**
 * Supprime le compte Auth + données cloud, puis nettoie le stockage local.
 */
export async function deleteMyAccount(): Promise<void> {
  const cfg = getCommentsApiConfig();
  const supabase = getSupabase();
  if (!cfg.enabled || !supabase) {
    throw new Error('Supabase non configuré.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Session expirée. Reconnectez-vous puis réessayez.');
  }

  const res = await fetch(`${cfg.supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: cfg.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail.slice(0, 280) || `Suppression impossible (${res.status})`);
  }

  try {
    await supabase.auth.signOut();
  } catch {
    /* compte déjà invalide */
  }

  try {
    await clearOfflineCache();
  } catch {
    /* ignore */
  }

  try {
    await AsyncStorage.clear();
  } catch {
    /* ignore */
  }
}
