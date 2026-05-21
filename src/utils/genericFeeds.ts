/** Médias généralistes à exclure du catalogue et des abonnements suggérés. */
const GENERIC_HOST_FRAGMENTS = [
  'lemonde.fr',
  'liberation.fr',
  'sudouest.fr',
  'lexpress.fr',
  'humanite.fr',
  'marianne.net',
  'nouvelobs.com',
  'bfmtv.com',
  'france24.com',
  'europe1.fr',
  'franceinter.fr',
  'orange.fr',
  'ladepeche.fr',
  'actu.fr',
  'businessinsider.fr',
  'journaldunet.com/rss.xml',
  'radio-canada.ca',
  'journalmetro.com',
] as const;

const GENERIC_TITLE_PREFIXES = [
  'le monde',
  'libération',
  'liberation',
  'sud ouest',
  'sud-ouest',
  "l'express",
  'l’express',
  "l'humanité",
  'l’humanité',
  'marianne',
  'nouvel obs',
  'bfmtv',
  'france 24',
  'europe 1',
  'france inter',
  'la dépêche',
  'la depeche',
  'actu.fr',
  'business insider',
] as const;

function hostFromUrl(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function isGenericNewsFeed(title: string, url: string): boolean {
  const host = hostFromUrl(url);
  const urlLower = url.trim().toLowerCase();
  if (GENERIC_HOST_FRAGMENTS.some((f) => host.includes(f) || urlLower.includes(f))) {
    return true;
  }
  const titleLower = title.trim().toLowerCase();
  return GENERIC_TITLE_PREFIXES.some((p) => titleLower.startsWith(p) || titleLower.includes(`(${p}`));
}

export function filterOutGenericFeeds<T extends { title: string; url: string }>(feeds: T[]): T[] {
  return feeds.filter((f) => !isGenericNewsFeed(f.title, f.url));
}
