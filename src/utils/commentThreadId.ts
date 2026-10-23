import * as Crypto from 'expo-crypto';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
]);

/** URL canonique pour regrouper les commentaires d’un même article. */
export function normalizeArticleUrlForComments(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.replace(/^www\./i, '').toLowerCase();
    return u.toString();
  } catch {
    return url.trim();
  }
}

export async function threadIdForArticleUrl(url: string): Promise<string> {
  const normalized = normalizeArticleUrlForComments(url);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
}
