import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

const AUTHOR_TOKEN_KEY = 'appigeek_comment_author_token_v1';
const MY_COMMENT_IDS_KEY = 'appigeek_my_comment_ids_v1';

export const COMMENT_PSEUDO_MIN = 2;
export const COMMENT_PSEUDO_MAX = 24;
export const COMMENT_BODY_MAX = 1200;

export function sanitizeCommentPseudo(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, COMMENT_PSEUDO_MAX);
}

export function isValidCommentPseudo(pseudo: string): boolean {
  const p = sanitizeCommentPseudo(pseudo);
  if (p.length < COMMENT_PSEUDO_MIN || p.length > COMMENT_PSEUDO_MAX) return false;
  if (/[<>{}\[\]\\\/]/.test(p)) return false;
  return true;
}

export function sanitizeCommentBody(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, COMMENT_BODY_MAX);
}

export function isValidCommentBody(body: string): boolean {
  const b = sanitizeCommentBody(body);
  return b.length >= 1 && b.length <= COMMENT_BODY_MAX;
}

/** Identifiant anonyme par appareil — permet de repérer / supprimer ses propres messages. */
export async function getOrCreateCommentAuthorToken(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(AUTHOR_TOKEN_KEY);
    if (existing?.trim()) return existing.trim();
    const token = randomUUID();
    await AsyncStorage.setItem(AUTHOR_TOKEN_KEY, token);
    return token;
  } catch {
    return randomUUID();
  }
}

async function readLocalMyCommentIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(MY_COMMENT_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function writeLocalMyCommentIds(ids: Set<string>): Promise<void> {
  const list = [...ids].slice(-500);
  await AsyncStorage.setItem(MY_COMMENT_IDS_KEY, JSON.stringify(list));
}

export async function rememberMyCommentId(commentId: string): Promise<void> {
  const ids = await readLocalMyCommentIds();
  ids.add(commentId);
  await writeLocalMyCommentIds(ids);
}

export async function forgetMyCommentId(commentId: string): Promise<void> {
  const ids = await readLocalMyCommentIds();
  ids.delete(commentId);
  await writeLocalMyCommentIds(ids);
}

/** IDs locaux + sync serveur (sans exposer les jetons des autres). */
export async function loadMyCommentIds(authorToken: string): Promise<Set<string>> {
  const local = await readLocalMyCommentIds();
  try {
    const { getCommentsApiConfig } = await import('../constants/commentsApi');
    const cfg = getCommentsApiConfig();
    if (!cfg.enabled) return local;
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/list_my_article_comment_ids`, {
      method: 'POST',
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_author_token: authorToken }),
    });
    if (!res.ok) return local;
    const rows = (await res.json()) as string[];
    if (!Array.isArray(rows)) return local;
    for (const id of rows) {
      if (typeof id === 'string') local.add(id);
    }
    await writeLocalMyCommentIds(local);
  } catch {
    /* offline / RPC pas encore déployé */
  }
  return local;
}
