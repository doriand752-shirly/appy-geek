import { DEFAULT_SUBSCRIPTIONS, MAC4EVER_FEED_URL } from '../constants/suggestedFeeds';
import type { FeedSubscription } from '../types/article';
import type { SuggestedFeed } from '../constants/suggestedFeeds';
import { isGenericNewsFeed } from './genericFeeds';

const MAC4EVER_LEGACY_PATHS = new Set(['/rss', '/rss/']);

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.host.toLowerCase()}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function isLegacyMac4everUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.hostname.replace(/^www\./i, '') !== 'mac4ever.com') return false;
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return MAC4EVER_LEGACY_PATHS.has(path);
  } catch {
    return false;
  }
}

/** Corrige l’ancienne URL Mac4ever (/rss → flux XML). */
export function fixMac4everSubscriptionUrls(subs: FeedSubscription[]): {
  subs: FeedSubscription[];
  changed: boolean;
} {
  let changed = false;
  const next = subs.map((s) => {
    if (isLegacyMac4everUrl(s.url)) {
      changed = true;
      return { ...s, url: MAC4EVER_FEED_URL };
    }
    return s;
  });
  return { subs: next, changed };
}

/** Retire les médias généralistes (Le Monde, Libération, etc.). */
export function stripGenericSubscriptions(subs: FeedSubscription[]): {
  subs: FeedSubscription[];
  changed: boolean;
} {
  const next = subs.filter((s) => !isGenericNewsFeed(s.title, s.url));
  return { subs: next, changed: next.length !== subs.length };
}

/** Flux par défaut absents des abonnements (nouvelle install partielle ou MAJ). */
export function missingDefaultFeeds(subs: FeedSubscription[]): SuggestedFeed[] {
  const seenUrls = new Set(subs.map((s) => normalizeUrlKey(s.url)));
  const hasMac4ever = subs.some(
    (s) =>
      s.title === 'Mac4ever' ||
      normalizeUrlKey(s.url) === normalizeUrlKey(MAC4EVER_FEED_URL),
  );
  const out: SuggestedFeed[] = [];
  for (const def of DEFAULT_SUBSCRIPTIONS) {
    const key = normalizeUrlKey(def.url);
    if (seenUrls.has(key)) continue;
    if (def.title === 'Mac4ever' && hasMac4ever) continue;
    out.push(def);
  }
  return out;
}
