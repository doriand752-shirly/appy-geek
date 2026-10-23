import he from 'he';

import type { FeedSubscription, ParsedArticle } from '../types/article';
import { hostFromArticleUrl, isExcerptOnlyHost } from './articleSourceRules';
import { sanitizeArticleHtml } from './sanitizeArticleHtml';

let cachedParser: InstanceType<(typeof import('fast-xml-parser'))['XMLParser']> | null = null;

async function getParser(): Promise<
  InstanceType<(typeof import('fast-xml-parser'))['XMLParser']>
> {
  if (!cachedParser) {
    const { XMLParser } = await import('fast-xml-parser');
    cachedParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      trimValues: true,
    });
  }
  return cachedParser;
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Décodage des entités HTML / XML (ex. &#8217; → ’, &amp; → &, etc.) */
function decodeHtmlEntities(input: string): string {
  if (!input) return input;
  try {
    return he.decode(input, { isAttributeValue: false });
  } catch {
    return input;
  }
}

function stripHtml(html: string): string {
  const noTags = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return decodeHtmlEntities(noTags);
}

function pickText(node: unknown): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'object' && node !== null && '#text' in (node as object)) {
    const t = (node as { '#text'?: string })['#text'];
    return typeof t === 'string' ? t.trim() : '';
  }
  return String(node);
}

/** Texte brut ou HTML tel que dans le XML (entités décodées). */
function pickRawHtml(node: unknown): string {
  if (node === undefined || node === null) return '';
  let raw = '';
  if (typeof node === 'string') raw = node.trim();
  else if (typeof node === 'object' && node !== null && '#text' in (node as object)) {
    const t = (node as { '#text'?: string })['#text'];
    raw = typeof t === 'string' ? t.trim() : '';
  } else raw = String(node);
  return decodeHtmlEntities(raw);
}

function stripTagsLen(html: string): number {
  return html.replace(/<[^>]+>/g, '').trim().length;
}

const MAX_CHAPO_CHARS = 12000;

function limitChapoText(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_CHAPO_CHARS) return t;
  return `${t.slice(0, MAX_CHAPO_CHARS).trimEnd()}…`;
}

/** Récupère tout le texte même si le parseur XML a explosé la structure en objets imbriqués. */
function flattenXmlText(node: unknown): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (Array.isArray(node)) {
    return node.map(flattenXmlText).filter(Boolean).join(' ');
  }
  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o['#text'] === 'string') return o['#text'];
    const parts: string[] = [];
    for (const key of Object.keys(o)) {
      if (key.startsWith('@_')) continue;
      const piece = flattenXmlText(o[key]);
      if (piece) parts.push(piece);
    }
    return parts.join(' ');
  }
  return '';
}

function syntheticChapoFromEncoded(encodedUnknown: unknown): string | undefined {
  const encFlat = flattenXmlText(encodedUnknown).trim();
  if (encFlat.length < 80) return undefined;
  const plain = stripHtml(encFlat).replace(/\s+/g, ' ').trim();
  if (plain.length < 35) return undefined;
  return limitChapoText(plain);
}

/** Article RSS avec peu de texte mais images / médias = garder le HTML complet */
function isSubstantialEncodedHtml(html: string): boolean {
  const t = html.trim();
  if (t.length < 55) return false;
  const textLen = stripTagsLen(t);
  if (textLen >= 18) return true;
  if (t.length > 220 && /<(?:img|video|iframe|figure|picture)\b/i.test(t)) return true;
  return t.length > 320;
}

/** Chapô RSS : description / DC / puis début du texte extrait de content:encoded si besoin. */
function extractChapoFromRssItem(item: Record<string, unknown>): string | undefined {
  const metaKeys = ['description', 'dc:description', 'summary', 'itunes:summary'];
  for (const key of metaKeys) {
    const flat = flattenXmlText(item[key]).trim();
    if (!flat) continue;
    const plain = limitChapoText(stripHtml(flat));
    if (plain.length >= 15) return plain;
  }
  return syntheticChapoFromEncoded(item['content:encoded']);
}

function extractChapoFromAtomEntry(entry: Record<string, unknown>): string | undefined {
  const metaKeys = ['summary', 'subtitle', 'description'];
  for (const key of metaKeys) {
    const flat = flattenXmlText(entry[key]).trim();
    if (!flat) continue;
    const plain = limitChapoText(stripHtml(flat));
    if (plain.length >= 15) return plain;
  }
  return syntheticChapoFromEncoded(entry.content);
}

/**
 * Corps HTML à partir d’un item RSS : priorité `content:encoded`, sinon description riche.
 */
function extractBodyFromRssItem(
  item: Record<string, unknown>,
  articleLink: string,
): string | undefined {
  const host = hostFromArticleUrl(articleLink);
  const excerptOnly = isExcerptOnlyHost(host);
  const keys = ['content:encoded', 'fullcontent'];
  for (const key of keys) {
    const node = item[key];
    const parts = ensureArray(node as object | object[]);
    for (const p of parts) {
      const raw = pickRawHtml(p).trim();
      if (raw && isSubstantialEncodedHtml(raw)) {
        return sanitizeArticleHtml(raw, articleLink || undefined);
      }
    }
    const raw = pickRawHtml(node).trim();
    if (raw && isSubstantialEncodedHtml(raw)) {
      return sanitizeArticleHtml(raw, articleLink || undefined);
    }
  }
  if (excerptOnly) return undefined;
  const desc = pickRawHtml(item.description).trim();
  if (
    desc.length > 140 &&
    /<[a-z][\s\S]*>/i.test(desc) &&
    stripTagsLen(desc) >= 70
  ) {
    return sanitizeArticleHtml(desc, articleLink || undefined);
  }
  return undefined;
}

/** Atom : `content` puis `summary` si riche. */
function extractBodyFromAtomEntry(
  entry: Record<string, unknown>,
  articleLink: string,
): string | undefined {
  const excerptOnly = isExcerptOnlyHost(hostFromArticleUrl(articleLink));
  const node = entry.content;
  const parts = ensureArray(node as object | object[]);
  for (const p of parts) {
    const raw = pickRawHtml(p).trim();
    if (raw && isSubstantialEncodedHtml(raw)) {
      return sanitizeArticleHtml(raw, articleLink || undefined);
    }
  }
  const raw = pickRawHtml(node).trim();
  if (raw && isSubstantialEncodedHtml(raw)) {
    return sanitizeArticleHtml(raw, articleLink || undefined);
  }

  if (excerptOnly) return undefined;
  const summ = pickRawHtml(entry.summary).trim();
  if (
    summ.length > 140 &&
    /<[a-z][\s\S]*>/i.test(summ) &&
    stripTagsLen(summ) >= 70
  ) {
    return sanitizeArticleHtml(summ, articleLink || undefined);
  }
  return undefined;
}

function parseRssDate(d: string | undefined): number {
  if (!d) return Date.now();
  const t = Date.parse(d);
  return Number.isNaN(t) ? Date.now() : t;
}

function resolveLink(link: unknown): string {
  if (!link) return '';
  if (typeof link === 'string') return link.trim();
  if (typeof link === 'object' && link !== null) {
    const o = link as Record<string, unknown>;
    if (typeof o['@_href'] === 'string') return o['@_href'];
    if (typeof o.href === 'string') return o.href;
  }
  return '';
}

function absolutizeMediaUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith('//')) return `https:${u}`;
  return u;
}

/** Première URL d’image dans du HTML fragmenté. */
function firstImgSrcFromHtml(html: string): string | undefined {
  const m = html.match(/<img[^>]+\bsrc\s*=\s*["']([^"']+)["']/i);
  if (!m?.[1]) return undefined;
  const src = m[1].trim();
  if (/^https?:\/\//i.test(src) || src.startsWith('//')) return absolutizeMediaUrl(src);
  return undefined;
}

function attrUrl(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v;
  }
  return undefined;
}

/** media:thumbnail, media:content image, enclosure, `<img>` dans description / content. */
function extractImageFromRssItem(item: Record<string, unknown>): string | undefined {
  const thumb = item['media:thumbnail'];
  const thumbArr = ensureArray(thumb as object | object[]);
  for (const t of thumbArr) {
    if (typeof t === 'object' && t !== null) {
      const u = attrUrl(t as Record<string, unknown>, ['@_url', '@_href', 'url', 'href']);
      if (u) return u;
    }
  }

  const medContents = ensureArray(item['media:content'] as object | object[]);
  for (const mc of medContents) {
    if (typeof mc !== 'object' || mc === null) continue;
    const o = mc as Record<string, unknown>;
    const type = String(o['@_type'] || o.type || '');
    const u = attrUrl(o, ['@_url', 'url']);
    if (u && (type.startsWith('image') || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u))) return u;
  }

  const enclosures = ensureArray(item.enclosure as object | object[]);
  for (const enc of enclosures) {
    if (typeof enc !== 'object' || enc === null) continue;
    const o = enc as Record<string, unknown>;
    const type = String(o['@_type'] || '');
    const u = attrUrl(o, ['@_url', 'url']);
    if (u && (type.startsWith('image') || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u))) return u;
  }

  for (const key of ['description', 'content:encoded', 'summary']) {
    const raw = pickRawHtml(item[key]).trim();
    if (raw.length > 20) {
      const fromImg = firstImgSrcFromHtml(raw);
      if (fromImg) return fromImg;
    }
  }
  return undefined;
}

function extractImageFromAtomEntry(entry: Record<string, unknown>): string | undefined {
  const thumb = entry['media:thumbnail'];
  const thumbArr = ensureArray(thumb as object | object[]);
  for (const t of thumbArr) {
    if (typeof t === 'object' && t !== null) {
      const u = attrUrl(t as Record<string, unknown>, ['@_url', '@_href', 'url']);
      if (u) return u;
    }
  }

  const medContents = ensureArray(entry['media:content'] as object | object[]);
  for (const mc of medContents) {
    if (typeof mc !== 'object' || mc === null) continue;
    const o = mc as Record<string, unknown>;
    const type = String(o['@_type'] || '');
    const u = attrUrl(o, ['@_url', 'url']);
    if (u && (type.startsWith('image') || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u))) return u;
  }

  const links = ensureArray(entry.link as object | object[]);
  for (const l of links) {
    if (typeof l !== 'object' || l === null) continue;
    const o = l as Record<string, unknown>;
    const rel = String(o['@_rel'] || '');
    const type = String(o['@_type'] || '');
    const href = resolveLink(l);
    if (
      href &&
      (rel === 'enclosure' || type.startsWith('image')) &&
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(href)
    )
      return absolutizeMediaUrl(href);
  }

  for (const key of ['summary', 'content', 'subtitle']) {
    const raw = pickRawHtml(entry[key]).trim();
    if (raw.length > 20) {
      const fromImg = firstImgSrcFromHtml(raw);
      if (fromImg) return fromImg;
    }
  }
  return undefined;
}

function atomEntryLink(entry: Record<string, unknown>): string {
  const links = ensureArray(entry.link as object | object[]);
  let fallback = '';
  for (const l of links) {
    const href = resolveLink(l);
    if (!href) continue;
    const rel =
      typeof l === 'object' && l !== null && '@_rel' in l
        ? String((l as { '@_rel'?: string })['@_rel'])
        : '';
    if (rel === 'alternate' || rel === '') return href;
    fallback = href;
  }
  return fallback;
}

export async function fetchAndParseFeed(sub: FeedSubscription): Promise<ParsedArticle[]> {
  const res = await fetch(sub.url, {
    headers: {
      'User-Agent': 'Appigeek/1.0 (RSS reader; +https://expo.dev)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parser = await getParser();
  const doc = parser.parse(xml) as Record<string, unknown>;

  if ('rss' in doc) return parseRss(doc.rss as Record<string, unknown>, sub);
  if ('feed' in doc) return parseAtom(doc.feed as Record<string, unknown>, sub);
  if ('rdf:RDF' in doc) return parseRdf(doc['rdf:RDF'] as Record<string, unknown>, sub);
  return [];
}

function parseRss(rss: Record<string, unknown>, sub: FeedSubscription): ParsedArticle[] {
  const channel = (rss.channel ?? {}) as Record<string, unknown>;
  const channelTitle = decodeHtmlEntities(pickText(channel.title) || sub.title);
  const items = ensureArray(channel.item as object | object[]);

  return items.map((raw, idx) => {
    const item = raw as Record<string, unknown>;
    const title = decodeHtmlEntities(pickText(item.title)) || 'Sans titre';
    let link = pickText(item.link);
    if (!link && typeof item.guid === 'object' && item.guid !== null) {
      link = pickText((item.guid as Record<string, unknown>)['#text']);
    }
    if (!link) link = '';
    const pubDate =
      typeof item.pubDate === 'string'
        ? item.pubDate
        : pickText(item.pubDate) || undefined;
    const chapoPlain = extractChapoFromRssItem(item);
    const desc =
      stripHtml(pickText(item.description) || pickText(item['content:encoded']) || '').slice(
        0,
        280,
      );
    const bodyHtml = extractBodyFromRssItem(item, link);
    const guidRaw = item.guid;
    const guid =
      typeof guidRaw === 'string'
        ? guidRaw
        : typeof guidRaw === 'object' && guidRaw !== null
          ? pickText((guidRaw as Record<string, unknown>)['#text'])
          : '';
    const id = `${sub.id}:${guid || link || title}:${idx}`;
    const imageUrl = extractImageFromRssItem(item);
    return {
      id,
      title,
      link,
      publishedAt: parseRssDate(pubDate),
      summary: desc,
      chapoPlain,
      imageUrl,
      bodyHtml,
      feedId: sub.id,
      feedTitle: channelTitle,
    };
  });
}

/** RSS 1.0 / RDF (ex. iPhoneSoft via FeedBurner). */
function parseRdf(rdf: Record<string, unknown>, sub: FeedSubscription): ParsedArticle[] {
  const channel = (rdf.channel ?? {}) as Record<string, unknown>;
  const channelTitle = decodeHtmlEntities(pickText(channel.title) || sub.title);
  const items = ensureArray(rdf.item as object | object[]);

  return items.map((raw, idx) => {
    const item = raw as Record<string, unknown>;
    const title = decodeHtmlEntities(pickText(item.title)) || 'Sans titre';
    const link = pickText(item.link) || pickText(item['@_rdf:about']) || '';
    const pubDate = pickText(item['dc:date']) || pickText(item['dc:Date']) || undefined;
    const desc = stripHtml(pickText(item.description) || '').slice(0, 280);
    const chapoPlain = (() => {
      const flat = flattenXmlText(item.description).trim();
      if (!flat) return undefined;
      const plain = limitChapoText(stripHtml(flat));
      return plain.length >= 15 ? plain : undefined;
    })();
    const bodyHtml = extractBodyFromRssItem(item, link);
    const idField = link || title;
    const id = `${sub.id}:${idField}:${idx}`;
    const imageUrl = extractImageFromRssItem(item);
    return {
      id,
      title,
      link,
      publishedAt: parseRssDate(pubDate),
      summary: desc,
      chapoPlain,
      imageUrl,
      bodyHtml,
      feedId: sub.id,
      feedTitle: channelTitle,
    };
  });
}

function parseAtom(feed: Record<string, unknown>, sub: FeedSubscription): ParsedArticle[] {
  const feedTitle = decodeHtmlEntities(pickText(feed.title) || sub.title);
  const entries = ensureArray(feed.entry as object | object[]);

  return entries.map((raw, idx) => {
    const entry = raw as Record<string, unknown>;
    const title = decodeHtmlEntities(pickText(entry.title)) || 'Sans titre';
    const link = atomEntryLink(entry);
    const updated = pickText(entry.updated) || pickText(entry.published);
    const summary = stripHtml(pickText(entry.summary) || pickText(entry.content) || '').slice(
      0,
      280,
    );
    const chapoPlain = extractChapoFromAtomEntry(entry);
    const bodyHtml = extractBodyFromAtomEntry(entry, link);
    const idField = pickText(entry.id) || link || title;
    const id = `${sub.id}:${idField}:${idx}`;
    const imageUrl = extractImageFromAtomEntry(entry);
    return {
      id,
      title,
      link,
      publishedAt: parseRssDate(updated),
      summary,
      chapoPlain,
      imageUrl,
      bodyHtml,
      feedId: sub.id,
      feedTitle: feedTitle,
    };
  });
}
