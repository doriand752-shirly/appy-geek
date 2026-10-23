import { extractionHintsForUrl } from './articleSourceRules';

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
  'cn__p-pb__ar',
  'mvp-content-main',
  'texteanalyseproduit',
  'article__content',
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
 */
function extractByTagAndClass(
  html: string,
  tag: 'div' | 'section' | 'article',
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
  const inner = extractBalancedFromOpenIndex(html, tag, contentStart, 200);
  return inner;
}

/** Extrait le contenu d’un élément par son `id`. */
function extractByElementId(html: string, idValue: string): string | null {
  const esc = escapeClassRegexFragment(idValue);
  const openRe = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bid\\s*=\\s*["']${esc}["'][^>]*>`, 'i');
  const m = openRe.exec(html);
  if (!m || m.index === undefined) return null;
  const tag = m[1];
  const inner = extractBalancedFromOpenIndex(html, tag, m.index + m[0].length, 200);
  return inner;
}

function strippedTextLen(html: string): number {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
}

function collectEntryBodyChunks(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const { ids, classes } = extractionHintsForUrl(pageUrl);

  for (const id of ids) {
    const inner = extractByElementId(html, id);
    if (inner) out.push(inner);
  }

  const classHints = [...new Set([...classes, ...ENTRY_CONTENT_CLASS_HINTS])];
  for (const cls of classHints) {
    for (const tag of ['section', 'article', 'div'] as const) {
      const inner = extractByTagAndClass(html, tag, cls);
      if (inner) out.push(inner);
    }
  }
  return out;
}

function pickBestBodyChunk(chunks: string[]): string | null {
  if (chunks.length === 0) return null;
  return chunks.reduce((best, cur) => {
    const bestStrip = strippedTextLen(best);
    const curStrip = strippedTextLen(cur);
    if (curStrip > bestStrip + 80) return cur;
    if (bestStrip > curStrip + 80) return best;
    return cur.length >= best.length ? cur : best;
  });
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

  const structured = collectEntryBodyChunks(html, pageUrl);
  const bestStructured = pickBestBodyChunk(structured);
  if (bestStructured) {
    return bestStructured;
  }

  const artInner = extractLongestBalancedTag(html, 'article', 320);
  if (artInner) {
    return artInner;
  }

  const mainInner = extractLongestBalancedTag(html, 'main', 320);
  if (mainInner) {
    return mainInner;
  }

  return null;
}
