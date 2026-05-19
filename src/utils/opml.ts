import { XMLParser } from 'fast-xml-parser';

import type { FeedSubscription } from '../types/article';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function subscriptionsToOpml(subscriptions: FeedSubscription[]): string {
  const outlines = subscriptions
    .map(
      (s) =>
        `    <outline type="rss" text="${escapeXml(s.title)}" title="${escapeXml(s.title)}" xmlUrl="${escapeXml(s.url)}" htmlUrl="${escapeXml(s.url)}" />`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Appigeek</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
}

type OutlineNode = {
  xmlUrl?: string;
  title?: string;
  text?: string;
};

function collectFeeds(node: unknown, out: { title: string; url: string }[]): void {
  if (!node || typeof node !== 'object') return;
  const o = node as OutlineNode & { outline?: unknown };
  const url = typeof o.xmlUrl === 'string' ? o.xmlUrl.trim() : '';
  if (url) {
    const title =
      (typeof o.title === 'string' && o.title.trim()) ||
      (typeof o.text === 'string' && o.text.trim()) ||
      url;
    out.push({ title, url });
  }
  const children = (node as { outline?: unknown }).outline;
  if (Array.isArray(children)) {
    for (const child of children) collectFeeds(child, out);
  } else if (children) {
    collectFeeds(children, out);
  }
}

/** Parse OPML minimal (attributs xmlUrl sur outline). */
export function parseOpml(xml: string): { title: string; url: string }[] {
  const trimmed = xml.trim();
  if (!trimmed) return [];
  const out: { title: string; url: string }[] = [];
  const urlAttr = /xmlUrl\s*=\s*["']([^"']+)["']/gi;
  const titleAttr = /(?:title|text)\s*=\s*["']([^"']+)["']/gi;
  const blocks = trimmed.match(/<outline\b[^>]*\/?>/gi) ?? [];
  for (const block of blocks) {
    const urlMatch = /xmlUrl\s*=\s*["']([^"']+)["']/i.exec(block);
    if (!urlMatch?.[1]) continue;
    const url = urlMatch[1].trim();
    const titleMatch = /(?:title|text)\s*=\s*["']([^"']+)["']/i.exec(block);
    const title = titleMatch?.[1]?.trim() || url;
    out.push({ title, url });
  }
  if (out.length > 0) return out;
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const doc = parser.parse(trimmed);
    const body = doc?.opml?.body;
    if (body) collectFeeds(body, out);
  } catch {
    /* regex only */
  }
  const seen = new Set<string>();
  return out.filter((f) => {
    const key = f.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
