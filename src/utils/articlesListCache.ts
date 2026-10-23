import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ParsedArticle } from '../types/article';

const STORAGE_ARTICLES = 'appigeek_articles_cache_v1';
const STORAGE_META = 'appigeek_articles_cache_meta_v1';

/** Évite qu’Expo Go / le cache local affiche des mois d’articles obsolètes. */
export const ARTICLE_LIST_MAX_COUNT = 600;
export const ARTICLE_LIST_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

type ArticlesMeta = { lastUpdated: number | null };

export function pruneArticlesList(articles: ParsedArticle[]): ParsedArticle[] {
  const cutoff = Date.now() - ARTICLE_LIST_MAX_AGE_MS;
  return [...articles]
    .filter((a) => typeof a.publishedAt === 'number' && a.publishedAt >= cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, ARTICLE_LIST_MAX_COUNT);
}

export async function clearArticlesListCache(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_ARTICLES, STORAGE_META]);
}

export async function loadCachedArticlesList(): Promise<{
  articles: ParsedArticle[];
  lastUpdated: number | null;
}> {
  try {
    const [rawArticles, rawMeta] = await Promise.all([
      AsyncStorage.getItem(STORAGE_ARTICLES),
      AsyncStorage.getItem(STORAGE_META),
    ]);
    let lastUpdated: number | null = null;
    if (rawMeta) {
      const meta = JSON.parse(rawMeta) as ArticlesMeta;
      if (typeof meta?.lastUpdated === 'number') lastUpdated = meta.lastUpdated;
    }
    if (!rawArticles) return { articles: [], lastUpdated };
    const parsed = JSON.parse(rawArticles) as ParsedArticle[];
    if (!Array.isArray(parsed)) return { articles: [], lastUpdated };
    const articles = pruneArticlesList(
      parsed.filter((a) => typeof a?.id === 'string' && typeof a?.title === 'string'),
    );
    return { articles, lastUpdated };
  } catch {
    return { articles: [], lastUpdated: null };
  }
}

export async function saveCachedArticlesList(
  articles: ParsedArticle[],
  lastUpdated: number,
): Promise<void> {
  try {
    const pruned = pruneArticlesList(articles);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_ARTICLES, JSON.stringify(pruned)),
      AsyncStorage.setItem(STORAGE_META, JSON.stringify({ lastUpdated } satisfies ArticlesMeta)),
    ]);
  } catch {
    /* ignore quota / IO */
  }
}
