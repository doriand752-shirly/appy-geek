import { sanitizeArticleHtml } from './sanitizeArticleHtml';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Classes typiques du corps d’article (WordPress, etc.). */
const ENTRY_CONTENT_CLASS_HINTS = [
  'entry-content',
  'post-content',
  'article-content',
  'single-content',
  'content-post',
  'post__content',
  'post-body',
  'td-post-content',
  'c-article-body',
  'article__body',
  'story-body',
  'entry-body',
  'article-body',
  'node-content',
  'field-body',
  'post-entry',
  'article-text',
] as const;

function escapeClassRegexFragment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** À partir de l’index juste après une balise ouvrante `tag`, récupère l’intérieur jusqu’à la fermeture équilibrée. */
function extractBalancedFromOpenIndex(
  html: string,
  tag: string,
  contentStart: number,
  minInnerLen: number,
): string | null {
  const lc = html.toLowerCase();
  const closeLower = `</${tag.toLowerCase()}>`;
  let pos = contentStart;
  let depth = 1;
  while (pos < html.length && depth > 0) {
    const nextClose = lc.indexOf(closeLower, pos);
    const nextOpenRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    nextOpenRe.lastIndex = pos;
    const nextOpenMatch = nextOpenRe.exec(html);
    const nextOpen = nextOpenMatch ? nextOpenMatch.index : -1;
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + nextOpenMatch![0].length;
    } else {
      depth -= 1;
      if (depth === 0) {
        const inner = html.slice(contentStart, nextClose);
        return inner.length >= minInnerLen ? inner : null;
      }
      pos = nextClose + closeLower.length;
    }
  }
  return null;
}

/**
 * Tous les blocs `tag` équilibrés : garde le plus long (évite le premier `<article>` sidebar / widget).
 */
function extractLongestBalancedTag(html: string, tag: string, minInnerLen: number): string | null {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  let best: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(html)) !== null) {
    const inner = extractBalancedFromOpenIndex(html, tag, m.index + m[0].length, minInnerLen);
    if (inner && (!best || inner.length > best.length)) best = inner;
  }
  return best;
}

/**
 * Extrait `<tag class="…hint…">…</tag>` avec fermeture équilibrée (div ou section).
 * Beaucoup de thèmes WP utilisent `<section class="entry-content">` — les anciennes `div` seules ratent le bloc.
 */
function extractByTagAndClass(
  html: string,
  tag: 'div' | 'section',
  classSubstring: string,
): string | null {
  const esc = escapeClassRegexFragment(classSubstring);
  const openRe = new RegExp(
    `<${tag}\\b[^>]*\\bclass=['"][^'"]*${esc}[^'"]*['"][^>]*>`,
    'i',
  );
  const m = openRe.exec(html);
  if (!m || m.index === undefined) return null;
  const contentStart = m.index + m[0].length;
  const inner = extractBalancedFromOpenIndex(html, tag, contentStart, 260);
  return inner ? sanitizeArticleHtml(inner) : null;
}

function collectEntryBodyChunks(html: string): string[] {
  const out: string[] = [];
  for (const cls of ENTRY_CONTENT_CLASS_HINTS) {
    /* section en premier : Univers Freebox, nombreux thèmes Gantry / WP */
    const fromSection = extractByTagAndClass(html, 'section', cls);
    if (fromSection) out.push(fromSection);
    const fromDiv = extractByTagAndClass(html, 'div', cls);
    if (fromDiv) out.push(fromDiv);
  }
  return out;
}

function pickLongest(chunks: string[]): string | null {
  if (chunks.length === 0) return null;
  return chunks.reduce((a, b) => (a.length >= b.length ? a : b));
}

/**
 * Télécharge la page et tente d’extraire le corps d’article (sans moteur Readability lourd).
 */
export async function fetchArticleHtmlFallback(pageUrl: string): Promise<string | null> {
  const res = await fetch(pageUrl, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();
  if (html.length < 800) return null;

  const structured = collectEntryBodyChunks(html);
  const bestStructured = pickLongest(structured);
  if (bestStructured) {
    return bestStructured;
  }

  /** Sans bloc « entry-content » détecté : éviter `<main>` qui englobe souvent listes + sidebar (ex. colonne entière). */
  const artInner = extractLongestBalancedTag(html, 'article', 320);
  if (artInner) {
    return sanitizeArticleHtml(artInner);
  }

  const mainInner = extractLongestBalancedTag(html, 'main', 320);
  if (mainInner) {
    return sanitizeArticleHtml(mainInner);
  }

  return null;
}
