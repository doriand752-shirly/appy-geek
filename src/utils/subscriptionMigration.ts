import { MAC4EVER_FEED_URL } from '../constants/suggestedFeeds';
import { getDefaultSubscriptions, getGeekTopics } from '../constants/suggestedFeedsByLocale';
import type { AppLocale } from '../i18n/types';
import type { FeedSubscription } from '../types/article';
import type { SuggestedFeed } from '../constants/suggestedFeeds';
import { isGenericNewsFeed } from './genericFeeds';

const MAC4EVER_LEGACY_PATHS = new Set(['/rss', '/rss/']);

/** Flux retirés du catalogue — retirés aussi des abonnements existants au lancement. */
const REMOVED_FEED_URLS = [
  'https://commentcamarche.net/feed/',
  'https://zdnet.fr/feed/',
  'http://rss.macg.co',
  'https://rss.macg.co',
];

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

export function stripRemovedSubscriptions(subs: FeedSubscription[]): {
  subs: FeedSubscription[];
  changed: boolean;
  removedFeedIds: Set<string>;
} {
  const removedKeys = new Set(REMOVED_FEED_URLS.map(normalizeUrlKey));
  const removedFeedIds = new Set<string>();
  const next = subs.filter((s) => {
    const remove = removedKeys.has(normalizeUrlKey(s.url));
    if (remove) removedFeedIds.add(s.id);
    return !remove;
  });
  return {
    subs: next,
    changed: next.length !== subs.length,
    removedFeedIds,
  };
}

/** URLs du catalogue recommandé pour une langue (défauts + découverte). */
export function getLocaleCatalogUrlKeys(locale: AppLocale): Set<string> {
  const keys = new Set<string>();
  for (const f of getDefaultSubscriptions(locale)) {
    keys.add(normalizeUrlKey(f.url));
  }
  for (const topic of getGeekTopics(locale)) {
    for (const f of topic.feeds) {
      keys.add(normalizeUrlKey(f.url));
    }
  }
  return keys;
}

/** Retire les abonnements hors catalogue de la langue active. */
export function stripNonLocaleSubscriptions(
  subs: FeedSubscription[],
  locale: AppLocale,
): {
  subs: FeedSubscription[];
  changed: boolean;
  removedFeedIds: Set<string>;
} {
  const allowed = getLocaleCatalogUrlKeys(locale);
  const removedFeedIds = new Set<string>();
  const next = subs.filter((s) => {
    const keep = allowed.has(normalizeUrlKey(s.url));
    if (!keep) removedFeedIds.add(s.id);
    return keep;
  });
  return {
    subs: next,
    changed: next.length !== subs.length,
    removedFeedIds,
  };
}

/** Flux par défaut absents des abonnements (nouvelle install partielle ou MAJ). */
export function missingDefaultFeeds(
  subs: FeedSubscription[],
  locale: AppLocale = 'fr',
): SuggestedFeed[] {
  const defaults = getDefaultSubscriptions(locale);
  const seenUrls = new Set(subs.map((s) => normalizeUrlKey(s.url)));
  const hasMac4ever = subs.some(
    (s) =>
      s.title === 'Mac4ever' ||
      normalizeUrlKey(s.url) === normalizeUrlKey(MAC4EVER_FEED_URL),
  );
  const out: SuggestedFeed[] = [];
  for (const def of defaults) {
    const key = normalizeUrlKey(def.url);
    if (seenUrls.has(key)) continue;
    if (def.title === 'Mac4ever' && hasMac4ever) continue;
    out.push(def);
  }
  return out;
}
