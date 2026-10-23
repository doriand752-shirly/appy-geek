/**
 * Digest push — créneaux Europe/Paris (08:00 / 13:00 / 18:00) :
 * scan RSS + notification parlante (titre = 1er article, corps = source · 2e).
 * Pas de libellé « N articles… » ni rappel du soir générique.
 *
 * Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIGEST_PUSH_SECRET,
 *           EXPO_ACCESS_TOKEN (optionnel)
 *
 * Auth : header `x-digest-secret` = DIGEST_PUSH_SECRET (cron Vault / admin RPC).
 * verify_jwt reste false car pg_cron n’envoie pas de JWT utilisateur.
 *
 * Invocations :
 *   POST /functions/v1/digest-push?slot=morning|midday|evening
 *   POST body { "slot": "morning" | "midday" | "evening" }
 * Sans slot : déduit de l’heure Europe/Paris (sinon no-op).
 *
 * Déploiement : supabase functions deploy digest-push
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SLOT_DEDUP_MS = 2 * 60 * 60 * 1000;
const FIRST_PASS_RECENT_MS = 2 * 60 * 60 * 1000;
const FEED_TIMEOUT_MS = 6000;
const MAX_GUIDS = 40;
const MAX_TITLES = 8;
const BODY_MAX_CHARS = 140;
const FETCH_CONCURRENCY = 8;

type Slot = 'morning' | 'midday' | 'evening';

type DigestItem = { title: string; sourceName: string; link: string; guid: string };

type ProfileRow = {
  user_id: string;
  push_digest_enabled: boolean;
  last_digest_sent_at: string | null;
};

type SubRow = { user_id: string; feed_id: string; url: string; title: string };
type TokenRow = { user_id: string; expo_push_token: string };
type CursorRow = { user_id: string; feed_id: string; last_guids: string[] };
type FeedItem = { guid: string; title: string; publishedAt: number | null; link: string };

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing Supabase env' }, 500);
  }

  const digestSecret = Deno.env.get('DIGEST_PUSH_SECRET') ?? '';
  const provided = req.headers.get('x-digest-secret') ?? '';
  if (!digestSecret || digestSecret.length < 16 || provided !== digestSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const slot = await resolveSlot(req);
  if (!slot) {
    return json({
      ok: true,
      sent: 0,
      reason: 'outside_paris_slots',
      parisHour: parisHourNow(),
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id,push_digest_enabled,last_digest_sent_at')
    .eq('push_digest_enabled', true);

  if (profilesError) return json({ error: profilesError.message }, 500);

  const eligible = ((profiles ?? []) as ProfileRow[]).filter((p) => {
    if (!p.last_digest_sent_at) return true;
    return Date.now() - Date.parse(p.last_digest_sent_at) >= SLOT_DEDUP_MS;
  });

  if (!eligible.length) {
    return json({
      ok: true,
      slot,
      sent: 0,
      reason: 'no_eligible_users',
      stats: { profiles: (profiles ?? []).length },
    });
  }

  const userIds = eligible.map((p) => p.user_id);

  const [{ data: subs }, { data: tokens }, { data: cursors }] = await Promise.all([
    supabase.from('user_subscriptions').select('user_id,feed_id,url,title').in('user_id', userIds),
    supabase.from('push_tokens').select('user_id,expo_push_token').in('user_id', userIds),
    supabase.from('user_feed_cursors').select('user_id,feed_id,last_guids').in('user_id', userIds),
  ]);

  const subsByUser = groupBy((subs ?? []) as SubRow[], (s) => s.user_id);
  const tokensByUser = groupBy((tokens ?? []) as TokenRow[], (t) => t.user_id);
  const cursorMap = new Map<string, string[]>();
  for (const c of (cursors ?? []) as CursorRow[]) {
    cursorMap.set(`${c.user_id}:${c.feed_id}`, Array.isArray(c.last_guids) ? c.last_guids : []);
  }

  const skipped: { userId: string; reason: string }[] = [];
  const usersNeedingFeeds = eligible.filter((p) => {
    const hasSubs = (subsByUser.get(p.user_id) ?? []).length > 0;
    const hasTokens = (tokensByUser.get(p.user_id) ?? []).length > 0;
    if (!hasTokens) {
      skipped.push({ userId: p.user_id, reason: 'no_push_token' });
      return false;
    }
    if (!hasSubs) {
      skipped.push({ userId: p.user_id, reason: 'no_subscriptions' });
      return false;
    }
    return true;
  });

  const feedCache = new Map<string, FeedItem[]>();
  const uniqueUrls = [
    ...new Set(
      usersNeedingFeeds.flatMap((p) => (subsByUser.get(p.user_id) ?? []).map((s) => s.url)).filter(Boolean),
    ),
  ];
  await runPool(uniqueUrls, FETCH_CONCURRENCY, async (url) => {
    const items = await fetchFeedItems(url);
    feedCache.set(url, items);
  });

  let sent = 0;
  const results: { userId: string; count: number; firstPass: boolean; slot: Slot }[] = [];

  for (const profile of usersNeedingFeeds) {
    const userSubs = subsByUser.get(profile.user_id) ?? [];
    const userTokens = tokensByUser.get(profile.user_id) ?? [];

    let firstPass = false;
    let newCount = 0;
    const digestItems: DigestItem[] = [];
    const cursorUpdates: { feed_id: string; last_guids: string[] }[] = [];

    for (const sub of userSubs) {
      const items = feedCache.get(sub.url) ?? [];
      if (!items.length) continue;
      const guids = items.map((i) => i.guid);
      const key = `${profile.user_id}:${sub.feed_id}`;
      const prev = cursorMap.get(key) ?? [];

      let fresh: FeedItem[];
      if (!prev.length) {
        firstPass = true;
        const cutoff = Date.now() - FIRST_PASS_RECENT_MS;
        fresh = items.filter((i) => i.publishedAt != null && i.publishedAt >= cutoff);
        cursorUpdates.push({
          feed_id: sub.feed_id,
          last_guids: uniqueKeepOrder(guids).slice(0, MAX_GUIDS),
        });
      } else {
        const prevSet = new Set(prev);
        fresh = items.filter((i) => !prevSet.has(i.guid));
        cursorUpdates.push({
          feed_id: sub.feed_id,
          last_guids: uniqueKeepOrder([...fresh.map((i) => i.guid), ...prev]).slice(0, MAX_GUIDS),
        });
      }

      newCount += fresh.length;
      for (const item of fresh) {
        if (digestItems.length >= MAX_TITLES) break;
        const link = item.link || (/^https?:\/\//i.test(item.guid) ? item.guid : '');
        digestItems.push({
          title: item.title || 'Article',
          sourceName: sub.title || 'RSS',
          link,
          guid: item.guid,
        });
      }
    }

    for (const upd of cursorUpdates) {
      await supabase.from('user_feed_cursors').upsert(
        {
          user_id: profile.user_id,
          feed_id: upd.feed_id,
          last_guids: upd.last_guids,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,feed_id' },
      );
    }

    if (newCount <= 0) {
      skipped.push({
        userId: profile.user_id,
        reason: firstPass ? 'first_pass_no_recent' : 'no_new_items',
      });
      continue;
    }

    const firstArticle = digestItems.find((i) => i.link) ?? null;
    const { title, body } = formatDigestNotification(digestItems);
    const data: Record<string, string> = firstArticle
      ? {
          screen: 'ArticleReader',
          articleUrl: firstArticle.link,
          articleTitle: firstArticle.title,
          articleId: firstArticle.guid || firstArticle.link,
        }
      : { screen: 'Accueil' };
    const ok = await pushToTokens(userTokens, title, body, data);
    if (ok) {
      sent += 1;
      results.push({ userId: profile.user_id, count: newCount, firstPass, slot });
      await supabase
        .from('user_profiles')
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq('user_id', profile.user_id);
    } else {
      skipped.push({ userId: profile.user_id, reason: 'expo_push_failed' });
    }
  }

  return json({
    ok: true,
    slot,
    sent,
    results,
    skipped: skipped.slice(0, 20),
    stats: {
      eligible: eligible.length,
      tokens: (tokens ?? []).length,
      subs: (subs ?? []).length,
      feedsFetched: uniqueUrls.length,
    },
  });
});

async function resolveSlot(req: Request): Promise<Slot | null> {
  const url = new URL(req.url);
  const fromQuery = normalizeSlot(url.searchParams.get('slot'));
  if (fromQuery) return fromQuery;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const body = (await req.clone().json()) as { slot?: unknown };
      const fromBody = normalizeSlot(typeof body?.slot === 'string' ? body.slot : null);
      if (fromBody) return fromBody;
    } catch {
      /* no JSON body */
    }
  }

  return slotFromParisHour(parisHourNow());
}

function normalizeSlot(raw: string | null): Slot | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === 'morning' || s === 'midday' || s === 'evening') return s;
  if (s === 'matin') return 'morning';
  if (s === 'midi') return 'midday';
  if (s === 'soir') return 'evening';
  return null;
}

function parisHourNow(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // en-GB hour12:false can yield "24" at midnight in some engines
  const n = Number.parseInt(hour, 10);
  return n === 24 ? 0 : n;
}

function slotFromParisHour(hour: number): Slot | null {
  if (hour === 8) return 'morning';
  if (hour === 13) return 'midday';
  if (hour === 18) return 'evening';
  return null;
}

function formatDigestNotification(items: DigestItem[]): { title: string; body: string } {
  const TITLE_MAX = 80;
  const cleaned = items
    .map((i) => ({
      title: collapseWs(i.title),
      sourceName: collapseWs(i.sourceName),
    }))
    .filter((i) => i.title);

  if (!cleaned.length) {
    return { title: 'Appigeek', body: '' };
  }

  const first = cleaned[0];
  const headline = truncate(first.title, TITLE_MAX);

  if (cleaned.length === 1) {
    const body = first.sourceName
      ? truncate(first.sourceName, BODY_MAX_CHARS)
      : truncate(first.title, BODY_MAX_CHARS);
    return { title: headline, body };
  }

  const second = cleaned[1];
  const body = truncate(
    second.sourceName ? `${second.sourceName} · ${second.title}` : second.title,
    BODY_MAX_CHARS,
  );
  return { title: headline, body };
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 1) return '…';
  return `${s.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

async function pushToTokens(
  userTokens: TokenRow[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  const messages = userTokens
    .map((t) => t.expo_push_token)
    .filter((tok) => tok.startsWith('ExponentPushToken[') || tok.startsWith('ExpoPushToken['))
    .map((to) => ({
      to,
      sound: 'default' as const,
      title,
      body,
      data: data ?? { screen: 'Accueil' },
    }));
  if (!messages.length) return false;
  return sendExpoPush(messages);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function uniqueKeepOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

async function fetchFeedItems(url: string): Promise<FeedItem[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'AppigeekDigest/1.0',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const text = await res.text();
    return extractItems(text).slice(0, MAX_GUIDS);
  } catch {
    return [];
  }
}

function extractItems(xml: string): FeedItem[] {
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ];
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  for (const m of blocks) {
    const block = m[0];
    const guidRaw =
      firstTag(block, 'guid') ||
      firstTag(block, 'id') ||
      hrefFromLink(block) ||
      firstTag(block, 'link');
    const guid = guidRaw ? stripCdata(guidRaw).trim() : '';
    if (!guid || seen.has(guid)) continue;
    seen.add(guid);
    const titleRaw = firstTag(block, 'title');
    const title = titleRaw ? decodeXmlEntities(stripCdata(titleRaw)) : '';
    const dateRaw =
      firstTag(block, 'pubDate') || firstTag(block, 'published') || firstTag(block, 'updated');
    const publishedAt = dateRaw ? Date.parse(stripCdata(dateRaw)) : NaN;
    items.push({
      guid,
      title: collapseWs(title) || 'Nouvel article',
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : null,
      link: extractLink(block, guid),
    });
  }
  return items;
}

function firstTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = re.exec(block);
  return m ? m[1] : null;
}

function hrefFromLink(block: string): string | null {
  const m = /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(block);
  return m ? m[1] : null;
}

function extractLink(block: string, guid: string): string {
  const href = hrefFromLink(block);
  if (href && /^https?:\/\//i.test(href.trim())) return href.trim();
  const linkTag = firstTag(block, 'link');
  if (linkTag) {
    const text = stripCdata(linkTag).trim();
    if (/^https?:\/\//i.test(text)) return text;
  }
  if (/^https?:\/\//i.test(guid)) return guid;
  return '';
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/i, '').replace(/\]\]>$/, '').trim();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function sendExpoPush(
  messages: { to: string; title: string; body: string; sound: 'default'; data?: Record<string, string> }[],
): Promise<boolean> {
  if (!messages.length) return false;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const access = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (access) headers.Authorization = `Bearer ${access}`;

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });
    if (!res.ok) return false;
    const payload = (await res.json()) as {
      data?: { status?: string } | { status?: string }[];
    };
    const tickets = Array.isArray(payload.data)
      ? payload.data
      : payload.data
        ? [payload.data]
        : [];
    return tickets.some((t) => t?.status === 'ok');
  } catch {
    return false;
  }
}
