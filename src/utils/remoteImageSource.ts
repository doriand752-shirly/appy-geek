import type { ImageURISource } from 'react-native';

/** UA « navigateur » : sans ça, Cloudflare / WordPress peuvent mal répondre à `Image` / `getSize`. */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const NUMERAMA_REFERER = 'https://www.numerama.com/';

function numeramaFamilyHeaders(): Record<string, string> {
  return {
    Referer: NUMERAMA_REFERER,
    Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8',
    'User-Agent': BROWSER_USER_AGENT,
  };
}

/** Tuiles thème, cartes : uniquement les domaines Numerama connus. */
function headersForImageHost(hostname: string): Record<string, string> | undefined {
  const h = hostname.toLowerCase();
  if (h.endsWith('lestechnophiles.com') || h.endsWith('numerama.com')) {
    return numeramaFamilyHeaders();
  }
  return undefined;
}

/**
 * Source pour `<Image>` — en-têtes sur les hôtes Numerama (wp-content, CDN Lemedia, etc.).
 */
export function remoteImageSource(uri: string): ImageURISource {
  const u = uri.trim();
  if (!/^https?:\/\//i.test(u)) return { uri: u };
  try {
    const headers = headersForImageHost(new URL(u).hostname);
    if (headers) return { uri: u, headers };
  } catch {
    /* ignore URL parse */
  }
  return { uri: u };
}

/** Corps d’article : en-têtes pour `expo-image` / CDN (Numerama, Lemedia, etc.). */
export function remoteArticleBodyImageSource(uri: string): ImageURISource {
  const u = uri.trim();
  if (!/^https?:\/\//i.test(u)) return { uri: u };
  try {
    const host = new URL(u).hostname.toLowerCase();
    const headers: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/*,*/*;q=0.8',
    };
    if (host.endsWith('lestechnophiles.com') || host.endsWith('numerama.com')) {
      headers.Referer = NUMERAMA_REFERER;
    }
    return { uri: u, headers };
  } catch {
    return { uri: u };
  }
}
