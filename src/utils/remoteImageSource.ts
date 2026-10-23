import type { ImageURISource } from 'react-native';

/** UA « navigateur » : sans ça, Cloudflare / WordPress peuvent mal répondre à `Image` / `getSize`. */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const NUMERAMA_REFERER = 'https://www.numerama.com/';

/** Hôtes dont les CDN exigent un Referer du site éditorial. */
const REFERER_BY_HOST_SUFFIX: ReadonlyArray<{ suffix: string; referer: string }> = [
  { suffix: 'numerama.com', referer: NUMERAMA_REFERER },
  { suffix: 'lestechnophiles.com', referer: NUMERAMA_REFERER },
  { suffix: 'tomshardware.fr', referer: 'https://www.tomshardware.fr/' },
  { suffix: 'tomsguide.fr', referer: 'https://www.tomsguide.fr/' },
  { suffix: 'phonandroid.com', referer: 'https://www.phonandroid.com/' },
  { suffix: 'wp-pa.phonandroid.com', referer: 'https://www.phonandroid.com/' },
  { suffix: 'zdnet.fr', referer: 'https://www.zdnet.fr/' },
  { suffix: 'begeek.fr', referer: 'https://www.begeek.fr/' },
  { suffix: 'iphon.fr', referer: 'https://www.iphon.fr/' },
  { suffix: 'consomac.fr', referer: 'https://consomac.fr/' },
  { suffix: 'android-mt.ouest-france.fr', referer: 'https://www.android-mt.com/' },
  { suffix: 'android-mt.com', referer: 'https://www.android-mt.com/' },
  { suffix: 'clubic.com', referer: 'https://www.clubic.com/' },
  { suffix: 'macg.co', referer: 'https://www.macg.co/' },
  { suffix: 'mac4ever.com', referer: 'https://www.mac4ever.com/' },
  { suffix: 'iphonesoft.fr', referer: 'https://iphonesoft.fr/' },
];

function refererForImageHost(hostname: string): string | undefined {
  const h = hostname.toLowerCase();
  for (const { suffix, referer } of REFERER_BY_HOST_SUFFIX) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return referer;
  }
  return undefined;
}

function numeramaFamilyHeaders(): Record<string, string> {
  return {
    Referer: NUMERAMA_REFERER,
    Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8',
    'User-Agent': BROWSER_USER_AGENT,
  };
}

/** Tuiles thème, cartes : en-têtes pour les CDN connus. */
function headersForImageHost(hostname: string): Record<string, string> | undefined {
  const referer = refererForImageHost(hostname);
  if (!referer) return undefined;
  return {
    Referer: referer,
    Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8',
    'User-Agent': BROWSER_USER_AGENT,
  };
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
    const referer = refererForImageHost(host);
    if (referer) headers.Referer = referer;
    return { uri: u, headers };
  } catch {
    return { uri: u };
  }
}
