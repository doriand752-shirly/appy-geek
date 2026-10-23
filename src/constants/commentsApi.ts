import Constants from 'expo-constants';

export type CommentsApiConfig = {
  enabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

/** Supabase REST — variables `EXPO_PUBLIC_SUPABASE_*` ou `extra` dans app.json. */
export function getCommentsApiConfig(): CommentsApiConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const supabaseUrl = (
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    (typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '')
  ).trim();
  const supabaseAnonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    (typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '')
  ).trim();
  return {
    enabled: supabaseUrl.length > 8 && supabaseAnonKey.length > 8,
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    supabaseAnonKey,
  };
}
