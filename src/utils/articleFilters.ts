import type { ParsedArticle } from '../types/article';

export type ArticleListFilter = 'all' | 'unread' | 'favorites';

export function filterArticles(
  articles: ParsedArticle[],
  filter: ArticleListFilter,
  readIds: Set<string>,
  favoriteIds: Set<string>,
  searchQuery: string,
  feedId: string | null = null,
): ParsedArticle[] {
  let list = articles;
  if (feedId) {
    list = list.filter((a) => a.feedId === feedId);
  }
  if (filter === 'unread') {
    list = list.filter((a) => !readIds.has(a.id));
  } else if (filter === 'favorites') {
    list = list.filter((a) => favoriteIds.has(a.id));
  }
  const q = searchQuery.trim().toLowerCase();
  if (!q) return list;
  return list.filter((a) => {
    const hay = `${a.title} ${a.summary} ${a.chapoPlain ?? ''} ${a.feedTitle}`.toLowerCase();
    return hay.includes(q);
  });
}

export function countUnread(articles: ParsedArticle[], readIds: Set<string>): number {
  return articles.filter((a) => !readIds.has(a.id)).length;
}
