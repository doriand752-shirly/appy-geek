import { isExcerptOnlyArticleUrl } from './articleSourceRules';

/**
 * Heuristiques pour éviter de traiter un extrait RSS de quelques lignes
 * comme un « article complet » et sauter la récupération sur la page.
 */

export function strippedArticleTextLen(html: string | undefined): number {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
}

/** Seuil texte brut : au-dessus, on considère que le flux a probablement livré tout le corps. */
const LIKELY_COMPLETE_MIN_STRIP = 880;

/**
 * Le flux semble fournir tout l’article (évite un fetch inutile et les faux positifs « extrait »).
 */
export function rssBodyLikelyComplete(
  html: string | undefined,
  articleUrl?: string,
): boolean {
  if (isExcerptOnlyArticleUrl(articleUrl)) return false;
  if (!html || html.trim().length < 52) return false;
  const strip = strippedArticleTextLen(html);
  if (strip >= LIKELY_COMPLETE_MIN_STRIP) return true;
  // Très gros HTML avec texte correct : souvent du content:encoded complet
  if (html.trim().length >= 11000 && strip >= 320) return true;
  return false;
}

/**
 * Préfère le fragment le plus riche en texte (page souvent plus longue que l’extrait RSS).
 */
export function pickRicherArticleHtml(
  rss: string | undefined,
  page: string | undefined,
  articleUrl?: string,
): string | undefined {
  const a = rss?.trim() || '';
  const b = page?.trim() || '';
  if (!a && !b) return undefined;
  if (!a) return page;
  if (!b) return rss;
  if (isExcerptOnlyArticleUrl(articleUrl) && b) return page;
  const la = strippedArticleTextLen(a);
  const lb = strippedArticleTextLen(b);
  if (lb > la + 100) return page;
  if (la > lb + 100) return rss;
  if (lb !== la) return lb >= la ? page : rss;
  return b.length >= a.length ? page : rss;
}
