import { isLikelyDirectImageAssetUrl } from './imageLinks';

/**
 * Prépare le HTML d’article pour react-native-render-html : une seule étape « images »,
 * sans chaîne de passes difficile à suivre.
 *
 * 1. Retire les liens `<a href="fichier.jpg">` autour d’un média (zone vide + ouverture navigateur).
 * 2. Remplace chaque `<picture>…</picture>` par un unique `<img src="https…">` (RN ne gère pas
 *    le choix WebP/JPEG comme un navigateur ; les lazy-loads WP mettent souvent un `src` data: ou vide).
 * 3. Résout les lazy-loads sur `<img>` (`data-src`, `data-lazy-src`, placeholders SVG).
 */

function decodeAttrUrl(raw: string): string {
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'");
}

/** Découpe un attribut srcset en URLs https (sans couper sur les virgules dans la query). */
function urlsFromSrcset(srcsetVal: string): string[] {
  const out: string[] = [];
  const v = srcsetVal.trim();
  if (!v) return out;
  const chunks = v.split(/\s*,(?=\s*https?:\/\/)/i);
  for (const chunk of chunks) {
    const t = chunk.trim();
    if (!t) continue;
    const u = t.replace(/\s+\d+w\s*$/i, '').trim();
    if (/^https?:\/\//i.test(u)) out.push(decodeAttrUrl(u));
    else if (u.startsWith('//')) out.push(decodeAttrUrl(`https:${u}`));
  }
  return out;
}

/** Absolue une URL relative à partir de l’URL de la page article (iPhoneSoft blank.gif + data-src). */
function absolutizeUrl(raw: string, pageUrl?: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return decodeAttrUrl(u);
  if (u.startsWith('//')) return decodeAttrUrl(`https:${u}`);
  if (!pageUrl) return null;
  try {
    return new URL(u, pageUrl).href;
  } catch {
    return null;
  }
}

function isPlaceholderSrc(src: string): boolean {
  const s = src.trim();
  if (!s) return true;
  if (/^data:image\/svg\+xml/i.test(s)) return true;
  if (/^data:image\/gif/i.test(s) && s.length < 120) return true;
  /* iPhoneSoft & thèmes WP : 1×1 / blank.gif avant data-src */
  if (/blank\.gif|spacer\.gif|pixel\.gif|1x1\.gif|placeholder\.(gif|png|svg)/i.test(s)) {
    return true;
  }
  return false;
}

function pickBestFromSrcset(srcsetVal: string): string | null {
  const allUrls = urlsFromSrcset(srcsetVal);
  if (!allUrls.length) return null;
  const jpgs = allUrls.filter((u) => /\.jpe?g(\?|#|$)/i.test(u));
  if (jpgs.length) return jpgs[Math.floor(jpgs.length / 2)];
  const webps = allUrls.filter((u) => /\.webp(\?|#|$)/i.test(u));
  if (webps.length) return webps[Math.floor(webps.length / 2)];
  const pngs = allUrls.filter((u) => /\.png(\?|#|$)/i.test(u));
  if (pngs.length) return pngs[0];
  return allUrls[allUrls.length - 1];
}

function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = re.exec(tag);
  return m?.[1]?.trim() ?? null;
}

/** Résout l’URL réelle d’une balise `<img>` (lazy-load WP, Humanoid, TagDiv…). */
function resolveImgTagUrl(tag: string, pageUrl?: string): string | null {
  const src = attrValue(tag, 'src') ?? '';
  if (/^https?:\/\//i.test(src) && !isPlaceholderSrc(src)) return decodeAttrUrl(src);
  if (src.startsWith('//') && !isPlaceholderSrc(src)) return decodeAttrUrl(`https:${src}`);

  const lazyAttrs = [
    'data-lazy-src',
    'data-src',
    'data-original',
    'data-url',
    'data-lazy-url',
  ];
  for (const a of lazyAttrs) {
    const v = attrValue(tag, a);
    if (!v) continue;
    const abs = absolutizeUrl(v, pageUrl);
    if (abs && !isPlaceholderSrc(abs)) return abs;
  }

  for (const a of ['data-lazy-srcset', 'data-srcset', 'srcset']) {
    const v = attrValue(tag, a);
    if (v) {
      const picked = pickBestFromSrcset(v);
      if (picked) return picked;
    }
  }

  if (!isPlaceholderSrc(src)) {
    const abs = absolutizeUrl(src, pageUrl);
    if (abs) return abs;
  }
  return null;
}

function rewriteImgTagSrc(tag: string, url: string): string {
  let out = tag.replace(/\ssrc\s*=\s*["'][^"']*["']/i, '');
  out = out.replace(/\sdata-lazy-src\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\sdata-src\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\sdata-original\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\sdata-lazy-srcset\s*=\s*["'][^"']*["']/gi, '');
  const insertAt = out.indexOf('>');
  if (insertAt === -1) return `<img src="${url}">`;
  return `${out.slice(0, insertAt)} src="${url}"${out.slice(insertAt)}`;
}

/** Résout les lazy-loads et retire les doublons placeholder + image réelle. */
function resolveLazyImgTags(html: string, pageUrl?: string): string {
  const tags = [...html.matchAll(/<img\b[^>]*\/?>/gi)].map((m) => m[0]);
  if (!tags.length) return html;

  let out = html;
  const seen = new Set<string>();
  for (const tag of tags) {
    const url = resolveImgTagUrl(tag, pageUrl);
    if (!url) {
      if (isPlaceholderSrc(attrValue(tag, 'src') ?? '')) {
        out = out.replace(tag, '');
      }
      continue;
    }
    const alt = (attrValue(tag, 'alt') ?? '').slice(0, 80);
    const dedupeKey = `${alt}::${url}`;
    if (seen.has(dedupeKey)) {
      out = out.replace(tag, '');
      continue;
    }
    seen.add(dedupeKey);
    const rewritten = rewriteImgTagSrc(tag, url);
    out = out.replace(tag, rewritten);
  }
  return out;
}

/** Trouve une URL réelle quand l’`<img>` a un lazy-load ou un placeholder. */
function resolveLazyImageUrl(pictureInner: string): string | null {
  const dataSrc = /<img\b[^>]*\bdata-src\s*=\s*["']([^"']+)["']/i.exec(pictureInner);
  if (dataSrc?.[1]) {
    const raw = dataSrc[1].trim();
    if (/^https?:\/\//i.test(raw)) return decodeAttrUrl(raw);
    if (raw.startsWith('//')) return decodeAttrUrl(`https:${raw}`);
  }

  const lazySrc = /<img\b[^>]*\bdata-lazy-src\s*=\s*["']([^"']+)["']/i.exec(pictureInner);
  if (lazySrc?.[1]) {
    const raw = lazySrc[1].trim();
    if (/^https?:\/\//i.test(raw)) return decodeAttrUrl(raw);
    if (raw.startsWith('//')) return decodeAttrUrl(`https:${raw}`);
  }

  const segments = pictureInner.split(/(?=<source\b)/i);
  for (const seg of segments) {
    if (!/\bdata-img-src-default\b/i.test(seg)) continue;
    const m = /\bdata-srcset\s*=\s*["']([^"']+)["']/i.exec(seg);
    if (!m) continue;
    const first = urlsFromSrcset(m[1])[0];
    if (first) return first;
  }

  const attrBlocks = [
    ...pictureInner.matchAll(/\bdata-lazy-srcset\s*=\s*["']([^"']+)["']/gi),
    ...pictureInner.matchAll(/\bdata-srcset\s*=\s*["']([^"']+)["']/gi),
    ...pictureInner.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi),
  ].map((x) => x[1].trim());

  const allUrls: string[] = [];
  for (const block of attrBlocks) {
    allUrls.push(...urlsFromSrcset(block));
  }

  const jpgNoWebp = allUrls.filter(
    (u) => /\.jpe?g(\?|#|$)/i.test(u) && !/[?&]webp=1/i.test(u),
  );
  if (jpgNoWebp.length) return jpgNoWebp[Math.min(jpgNoWebp.length - 1, 2)];

  const jpgs = allUrls.filter((u) => /\.jpe?g(\?|#|$)/i.test(u));
  if (jpgs.length) return jpgs[Math.floor(jpgs.length / 2)];

  const webps = allUrls.filter((u) => /\.webp(\?|#|$)/i.test(u));
  if (webps.length) return webps[Math.floor(webps.length / 2)];

  const pngs = allUrls.filter((u) => /\.png(\?|#|$)/i.test(u));
  if (pngs.length) return pngs[0];

  const svgs = allUrls.filter((u) => /\.svg(\?|#|$)/i.test(u));
  if (svgs.length) return svgs[0];

  return null;
}

function unwrapImageLinksAroundMedia(html: string): string {
  let out = html;
  for (let pass = 0; pass < 6; pass++) {
    const next = out.replace(
      /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>(\s*<picture\b[\s\S]*?<\/picture>\s*)<\/a>/gi,
      (full, href: string, inner: string) =>
        isLikelyDirectImageAssetUrl(href) ? inner.trim() : full,
    );
    if (next === out) break;
    out = next;
  }
  return out.replace(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>(\s*<img\b[^>]*\/?>\s*)<\/a>/gi,
    (full, href: string, inner: string) =>
      isLikelyDirectImageAssetUrl(href) ? inner.trim() : full,
  );
}

/** Un `<picture>` devient un `<img>` avec une URL exploitable par RN. */
function pictureToSingleImg(_full: string, inner: string): string {
  const innerNoSource = inner.replace(/<source\b[^>]*\/?>/gi, '');
  const srcAttr = /<img\b[^>]*\bsrc\s*=\s*["']([^"']*)["']/i.exec(innerNoSource);
  const currentSrc = srcAttr?.[1] ?? '';
  let url: string | null = null;
  if (/^https?:\/\//i.test(currentSrc) && !isPlaceholderSrc(currentSrc)) {
    url = decodeAttrUrl(currentSrc);
  } else {
    url = resolveLazyImageUrl(inner);
  }
  if (!url) {
    return innerNoSource.trim();
  }
  return innerNoSource.replace(/<img\b([^>]*)\/?>/i, (_m, attrs: string) => {
    const withoutSrc = attrs.replace(/\ssrc\s*=\s*["'][^"']*["']/gi, '').trim();
    const spacer = withoutSrc.length ? ' ' : '';
    return `<img src="${url}"${spacer}${withoutSrc}>`;
  });
}

export function prepareArticleImagesForRn(html: string, pageUrl?: string): string {
  let out = unwrapImageLinksAroundMedia(html);
  out = out.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi, pictureToSingleImg);
  out = resolveLazyImgTags(out, pageUrl);
  return out;
}
