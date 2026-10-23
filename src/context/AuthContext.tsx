import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

type AuthContextValue = {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  appleAvailable: boolean;
  signingIn: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function randomNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      if (Platform.OS === 'ios') {
        try {
          const ok = await AppleAuthentication.isAvailableAsync();
          if (!cancelled) setAppleAvailable(ok);
        } catch {
          if (!cancelled) setAppleAvailable(false);
        }
      }

      const supabase = getSupabase();
      if (!supabase) {
        if (!cancelled) setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session ?? null);
      setReady(true);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signInWithApple = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase non configuré.');
    if (Platform.OS !== 'ios') throw new Error('Connexion Apple disponible uniquement sur iOS.');

    setSigningIn(true);
    try {
      const rawNonce = randomNonce();
      const hashedNonce = await sha256(rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        throw new Error('Jeton Apple manquant.');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) {
        const msg = error.message || '';
        if (/provider.*not enabled|issuer.*appleid\.apple\.com/i.test(msg)) {
          throw new Error(
            'Connexion Apple non activée côté serveur. Dans Supabase → Authentication → Providers → Apple, activez le provider et renseignez Team ID / Key ID / clé .p8.',
          );
        }
        throw error;
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      configured,
      ready,
      session,
      user: session?.user ?? null,
      appleAvailable,
      signingIn,
      signInWithApple,
      signOut,
    }),
    [configured, ready, session, appleAvailable, signingIn, signInWithApple, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
