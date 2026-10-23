import { navigationRef } from './navigationRef';

function pickString(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function whenNavReady(fn: () => boolean): void {
  if (fn()) return;
  let n = 0;
  const id = setInterval(() => {
    n += 1;
    if (fn() || n > 50) clearInterval(id);
  }, 40);
}

/** Ouvre le lecteur si le payload push / deep link contient une URL d’article. */
export function openArticleFromData(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const url = pickString(data, ['articleUrl', 'url', 'link']);
  if (!url || !/^https?:\/\//i.test(url)) return false;

  const title = pickString(data, ['articleTitle', 'title']) || 'Article';
  const articleId = pickString(data, ['articleId', 'id', 'guid']) || url;

  whenNavReady(() => {
    if (!navigationRef.isReady()) return false;
    navigationRef.navigate('ArticleReader', { articleId, url, title });
    return true;
  });
  return true;
}
