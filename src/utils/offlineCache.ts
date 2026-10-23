import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import type { ParsedArticle } from '../types/article';
import { pickRicherArticleHtml } from './articleHtmlMerge';
import { fetchArticleHtmlFallback } from './fetchArticleHtmlFallback';
import { sanitizeArticleHtml } from './sanitizeArticleHtml';

const INDEX_KEY = 'appigeek_offline_index_v1';
const CACHE_DIR = `${FileSystem.documentDirectory}offline-articles/`;
/** Téléchargements parallèles (évite de saturer le réseau / le JS thread). */
const FETCH_CONCURRENCY = 4;

export type CachedArticleRecord = {
  article: ParsedArticle;
  html: string;
  savedAt: number;
};

type IndexEntry = { id: string; fileKey: string; savedAt: number };

/** Les IDs d’articles contiennent souvent des URL (`/` `:`) — nom de fichier sûr via hash. */
async function fileKeyForArticleId(articleId: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, articleId);
}

function articlePath(fileKey: string): string {
  return `${CACHE_DIR}${fileKey}.json`;
}

async function readIndex(): Promise<IndexEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IndexEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is IndexEntry =>
        typeof e?.id === 'string' && typeof e?.fileKey === 'string' && typeof e?.savedAt === 'number',
    );
  } catch {
    return [];
  }
}

async function writeIndex(entries: IndexEntry[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

async function ensureCacheDir(): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Stockage local indisponible');
  }
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function htmlFromFeedFallback(article: ParsedArticle): string {
  const rss = article.bodyHtml;
  if (rss?.trim()) {
    return sanitizeArticleHtml(rss, article.link);
  }
  const plain = (article.chapoPlain || article.summary || article.title || '').trim();
  if (plain) {
    const escaped = plain
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return sanitizeArticleHtml(`<p>${escaped}</p>`, article.link);
  }
  return '';
}

/** Télécharge la page source puis garde le HTML le plus riche (comme « Afficher l’article entier »). */
async function resolveFullArticleHtml(
  article: ParsedArticle,
  previousHtml?: string,
): Promise<string> {
  const rss = article.bodyHtml;
  let fetched: string | null = null;

  if (article.link) {
    try {
      fetched = await fetchArticleHtmlFallback(article.link);
    } catch {
      /* réseau ou page inaccessible */
    }
  }

  const fromNetwork =
    pickRicherArticleHtml(rss, fetched ?? undefined, article.link) ?? rss ?? fetched ?? '';
  const merged =
    pickRicherArticleHtml(previousHtml, fromNetwork || undefined, article.link) ??
    fromNetwork ??
    previousHtml ??
    '';
  if (merged.trim()) {
    return sanitizeArticleHtml(merged, article.link);
  }
  return htmlFromFeedFallback(article);
}

async function writeCachedArticle(
  article: ParsedArticle,
  html: string,
  savedAt: number,
): Promise<IndexEntry | null> {
  const fileKey = await fileKeyForArticleId(article.id);
  const record: CachedArticleRecord = { article, html, savedAt };
  const path = articlePath(fileKey);
  await FileSystem.writeAsStringAsync(path, JSON.stringify(record));
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  return { id: article.id, fileKey, savedAt };
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Conserve les `limit` articles les plus récents (par publishedAt), avec le texte complet.
 */
export async function syncOfflineArticles(
  articles: ParsedArticle[],
  limit: number,
): Promise<{ saved: number; failed: number }> {
  if (limit <= 0) return { saved: 0, failed: 0 };
  await ensureCacheDir();
  const sorted = [...articles].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, limit);
  const now = Date.now();

  const previousById = new Map<string, string>();
  try {
    const previous = await listCachedArticles();
    for (const rec of previous) {
      if (rec.html?.trim()) previousById.set(rec.article.id, rec.html);
    }
  } catch {
    /* ignore */
  }

  const outcomes = await runPool(sorted, FETCH_CONCURRENCY, async (article) => {
    try {
      const html = await resolveFullArticleHtml(article, previousById.get(article.id));
      if (!html.trim()) {
        return { entry: null as IndexEntry | null, failed: true };
      }
      const entry = await writeCachedArticle(article, html, now);
      return { entry, failed: !entry };
    } catch {
      return { entry: null as IndexEntry | null, failed: true };
    }
  });

  const index: IndexEntry[] = [];
  let failed = 0;
  for (const o of outcomes) {
    if (o.entry) index.push(o.entry);
    if (o.failed) failed += 1;
  }

  index.sort((a, b) => b.savedAt - a.savedAt);
  await writeIndex(index);

  const keepKeys = new Set(index.map((e) => e.fileKey));
  try {
    const names = await FileSystem.readDirectoryAsync(CACHE_DIR);
    await Promise.all(
      names.map(async (name) => {
        const key = name.replace(/\.json$/, '');
        if (!keepKeys.has(key)) {
          await FileSystem.deleteAsync(`${CACHE_DIR}${name}`, { idempotent: true });
        }
      }),
    );
  } catch {
    /* ignore */
  }

  return { saved: index.length, failed };
}

export async function clearOfflineCache(): Promise<void> {
  await AsyncStorage.removeItem(INDEX_KEY);
  await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
}

export async function listCachedArticles(): Promise<CachedArticleRecord[]> {
  const index = await readIndex();
  const out: CachedArticleRecord[] = [];
  for (const entry of index) {
    try {
      const path = articlePath(entry.fileKey);
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) continue;
      const raw = await FileSystem.readAsStringAsync(path);
      const parsed = JSON.parse(raw) as CachedArticleRecord;
      if (parsed?.article?.id) out.push(parsed);
    } catch {
      /* skip corrupt */
    }
  }
  out.sort((a, b) => b.article.publishedAt - a.article.publishedAt);
  return out;
}

export async function getCachedArticle(articleId: string): Promise<CachedArticleRecord | null> {
  try {
    const fileKey = await fileKeyForArticleId(articleId);
    const path = articlePath(fileKey);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw) as CachedArticleRecord;
  } catch {
    return null;
  }
}

export async function getOfflineCacheCount(): Promise<number> {
  const list = await listCachedArticles();
  return list.length;
}
