import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ParsedArticle } from '../types/article';

const STORAGE_ARTICLES = 'appigeek_articles_cache_v1';
const STORAGE_META = 'appigeek_articles_cache_meta_v1';

type ArticlesMeta = { lastUpdated: number | null };

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
    const articles = parsed.filter((a) => typeof a?.id === 'string' && typeof a?.title === 'string');
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
    await Promise.all([
      AsyncStorage.setItem(STORAGE_ARTICLES, JSON.stringify(articles)),
      AsyncStorage.setItem(STORAGE_META, JSON.stringify({ lastUpdated } satisfies ArticlesMeta)),
    ]);
  } catch {
    /* ignore quota / IO */
  }
}
