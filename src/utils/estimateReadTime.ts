const WORDS_PER_MINUTE = 200;

export function estimateReadMinutes(text: string | undefined): number | null {
  if (!text?.trim()) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 8) return null;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function formatReadTime(article: {
  title: string;
  summary?: string;
  chapoPlain?: string;
  bodyHtml?: string;
}): string | null {
  const parts = [article.title, article.summary, article.chapoPlain];
  if (article.bodyHtml) {
    parts.push(article.bodyHtml.replace(/<[^>]+>/g, ' '));
  }
  const minutes = estimateReadMinutes(parts.join(' '));
  if (minutes == null) return null;
  return `${minutes} min`;
}
