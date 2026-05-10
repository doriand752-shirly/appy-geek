import { cleanArticleHtml } from './cleanArticleHtml';

/** Retire les risques évidents + blocs / phrases « bruit » typiques avant rendu RenderHtml */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return '';
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return cleanArticleHtml(stripped).trim();
}
