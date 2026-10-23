import { NEWS_THEME_BY_ID } from '../constants/newsThemes';
import type { ParsedArticle } from '../types/article';
import { themeIdsForArticle } from './articleThemes';
import type { CustomNewsTheme } from '../types/settings';

export type RecommendedArticle = {
  article: ParsedArticle;
  reason: string;
  score: number;
};

/**
 * Recommandations locales : thèmes des articles lus récemment + favoris,
 * puis articles non lus du même thème (hors déjà vus).
 */
export function buildRecommendations(input: {
  articles: ParsedArticle[];
  readIds: Set<string>;
  favoriteIds: Set<string>;
  customThemes: CustomNewsTheme[];
  limit?: number;
}): RecommendedArticle[] {
  const { articles, readIds, favoriteIds, customThemes, limit = 8 } = input;
  if (!articles.length) return [];

  const themeScore = new Map<string, number>();
  const bump = (themeId: string, weight: number) => {
    themeScore.set(themeId, (themeScore.get(themeId) ?? 0) + weight);
  };

  for (const a of articles) {
    const themes = themeIdsForArticle(a, customThemes);
    if (favoriteIds.has(a.id)) {
      for (const t of themes) bump(t, 3);
    } else if (readIds.has(a.id)) {
      for (const t of themes) bump(t, 1);
    }
  }

  // Si aucun historique : boost des thèmes les plus représentés dans le fil
  if (themeScore.size === 0) {
    for (const a of articles.slice(0, 40)) {
      for (const t of themeIdsForArticle(a, customThemes)) bump(t, 0.5);
    }
  }

  const scored: RecommendedArticle[] = [];
  for (const a of articles) {
    if (readIds.has(a.id)) continue;
    const themes = themeIdsForArticle(a, customThemes);
    let score = 0;
    let bestTheme = '';
    for (const t of themes) {
      const w = themeScore.get(t) ?? 0;
      if (w > score) {
        score = w;
        bestTheme = t;
      }
    }
    if (score <= 0) continue;
    // Léger boost récence
    const ageHours = Math.max(0, (Date.now() - a.publishedAt) / 3_600_000);
    score += Math.max(0, 2 - ageHours / 24);
    scored.push({
      article: a,
      score,
      reason: bestTheme ? `Parce que vous suivez « ${labelForTheme(bestTheme, customThemes)} »` : 'Pour vous',
    });
  }

  scored.sort((a, b) => b.score - a.score || b.article.publishedAt - a.article.publishedAt);
  return scored.slice(0, limit);
}

function labelForTheme(themeId: string, customThemes: CustomNewsTheme[]): string {
  const custom = customThemes.find((c) => c.id === themeId);
  if (custom) return custom.label;
  return NEWS_THEME_BY_ID[themeId]?.label ?? themeId.replace(/_/g, ' ');
}
