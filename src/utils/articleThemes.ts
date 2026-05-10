import { NEWS_THEMES } from '../constants/newsThemes';
import type { ParsedArticle } from '../types/article';
import type { CustomNewsTheme } from '../types/settings';

/** Normalisation pour comparaison titre / mots-clés (sans accents, minuscules). */
export function normalizeForThemeMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const SHORT_KEYWORDS_OK = new Set([
  'sfr',
  'lg',
  'ai',
  'ia',
  'amd',
  'vpn',
  'ssd',
  'gpu',
  'cpu',
  'ios',
  'ps5',
  'ps4',
]);

function keywordMatchesTitle(haystackNorm: string, keywordRaw: string): boolean {
  const kw = normalizeForThemeMatch(keywordRaw);
  if (kw.length === 0) return false;
  if (kw.length <= 2 && !SHORT_KEYWORDS_OK.has(kw)) return false;
  if (haystackNorm.includes(kw)) return true;
  return false;
}

/** Correspondance titre ↔ nom de thème personnalisé (phrase ou mots du nom). */
export function customThemeMatchesArticle(article: ParsedArticle, label: string): boolean {
  const hay = ` ${normalizeForThemeMatch(article.title)} `;
  const normFull = normalizeForThemeMatch(label.trim());
  if (normFull.length === 0) return false;
  if (normFull.length >= 2 && hay.includes(normFull)) return true;
  const tokens = normFull.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length <= 1) continue;
    if (keywordMatchesTitle(hay, token)) return true;
  }
  return false;
}

/** Identifiants des thèmes dont le titre correspond (plusieurs possibles). */
export function themeIdsForArticle(
  article: ParsedArticle,
  customThemes: CustomNewsTheme[] = [],
): string[] {
  const hay = ` ${normalizeForThemeMatch(article.title)} `;
  const seen = new Set<string>();
  for (const theme of NEWS_THEMES) {
    for (const kw of theme.keywords) {
      if (keywordMatchesTitle(hay, kw)) {
        seen.add(theme.id);
        break;
      }
    }
  }
  for (const ct of customThemes) {
    if (customThemeMatchesArticle(article, ct.label)) {
      seen.add(ct.id);
    }
  }
  return [...seen];
}

export function articlesForThemeId(
  themeId: string,
  articles: ParsedArticle[],
  customThemes: CustomNewsTheme[] = [],
): ParsedArticle[] {
  return articles.filter((a) => themeIdsForArticle(a, customThemes).includes(themeId));
}

/** Image de couverture : dernière image d’article disponible dans le thème, sinon logo du thème. */
export function coverUriForTheme(
  articlesInTheme: ParsedArticle[],
  fallbackUrl?: string,
): string | undefined {
  const sorted = [...articlesInTheme].sort((a, b) => b.publishedAt - a.publishedAt);
  for (const a of sorted) {
    if (a.imageUrl && /^https?:\/\//i.test(a.imageUrl)) return a.imageUrl;
  }
  return fallbackUrl;
}
