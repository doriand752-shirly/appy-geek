import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getCommentsApiConfig } from '../constants/commentsApi';

let client: SupabaseClient | null = null;

/** Adapter AsyncStorage — SecureStore a une limite de taille trop basse pour la session. */
const ExpoStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export function isSupabaseConfigured(): boolean {
  return getCommentsApiConfig().enabled;
}

export function getSupabase(): SupabaseClient | null {
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled) return null;
  if (!client) {
    client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        storage: ExpoStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
