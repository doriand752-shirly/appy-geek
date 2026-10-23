/**
 * Sync App Store download counts → admin_store_metrics (quotidien via pg_cron).
 *
 * Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIGEST_PUSH_SECRET,
 *           ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8
 *
 * Auth : header `x-digest-secret` = DIGEST_PUSH_SECRET
 * verify_jwt = false (cron)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const APP_ID = Deno.env.get('ASC_APP_ID') || '6768642167';
const ASC = 'https://api.appstoreconnect.apple.com/v1';

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const digestSecret = Deno.env.get('DIGEST_PUSH_SECRET') ?? '';
  const provided = req.headers.get('x-digest-secret') ?? '';
  if (!digestSecret || digestSecret.length < 16 || provided !== digestSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const keyId = Deno.env.get('ASC_KEY_ID') ?? '';
  const issuerId = Deno.env.get('ASC_ISSUER_ID') ?? '';
  const keyP8 = Deno.env.get('ASC_KEY_P8') ?? '';
  if (!supabaseUrl || !serviceKey) return json({ error: 'Missing Supabase env' }, 500);
  if (!keyId || !issuerId || !keyP8) return json({ error: 'Missing ASC env' }, 500);

  try {
    const token = await createAscJwt(keyP8, keyId, issuerId);
    const requestId = await ensureAnalyticsRequest(token);
    if (!requestId) {
      return json({ ok: true, synced: false, reason: 'no_analytics_request' });
    }

    const metrics = await sumDownloadsFromAnalytics(token, requestId);
    if (!metrics) {
      return json({
        ok: true,
        synced: false,
        reason: 'reports_not_ready',
        hint: 'Apple génère les rapports 24–48h après la 1re demande ; le cron réessaiera demain.',
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from('admin_store_metrics').upsert(
      {
        id: 1,
        downloads_total: metrics.total,
        downloads_7d: metrics.last7,
        downloads_today: metrics.today,
        source: metrics.source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, synced: true, ...metrics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function createAscJwt(keyP8: string, keyId: string, issuerId: string): Promise<string> {
  const pem = keyP8
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const enc = new TextEncoder();
  const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
    const bytes =
      typeof buf === 'string'
        ? enc.encode(buf)
        : buf instanceof Uint8Array
          ? buf
          : new Uint8Array(buf);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 1200,
      aud: 'appstoreconnect-v1',
    }),
  );
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(data),
  );
  return `${data}.${b64url(sig)}`;
}

async function asc(token: string, method: string, path: string, body?: unknown) {
  const r = await fetch(ASC + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

async function ensureAnalyticsRequest(token: string): Promise<string | null> {
  const list = await asc(token, 'GET', `/apps/${APP_ID}/analyticsReportRequests?limit=20`);
  if (list.ok) {
    const existing = (list.j.data || []).find(
      (r: { attributes?: { accessType?: string; stoppedDueToInactivity?: boolean } }) =>
        r.attributes?.accessType === 'ONGOING' && r.attributes?.stoppedDueToInactivity !== true,
    );
    if (existing?.id) return existing.id as string;
  }

  const create = await asc(token, 'POST', '/analyticsReportRequests', {
    data: {
      type: 'analyticsReportRequests',
      attributes: { accessType: 'ONGOING' },
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
      },
    },
  });
  return create.ok ? (create.j.data?.id as string) : null;
}

async function gunzipToText(buf: ArrayBuffer): Promise<string> {
  try {
    const ds = new DecompressionStream('gzip');
    const stream = new Response(buf).body!.pipeThrough(ds);
    return await new Response(stream).text();
  } catch {
    return new TextDecoder().decode(buf);
  }
}

async function sumDownloadsFromAnalytics(token: string, requestId: string) {
  const reports = await asc(token, 'GET', `/analyticsReportRequests/${requestId}/reports?limit=50`);
  if (!reports.ok) return null;

  const downloadReport = (reports.j.data || []).find(
    (r: { attributes?: { name?: string; category?: string } }) => {
      const name = String(r.attributes?.name || r.attributes?.category || '').toLowerCase();
      return name.includes('download');
    },
  );
  if (!downloadReport) return null;

  const instances = await asc(
    token,
    'GET',
    `/analyticsReports/${downloadReport.id}/instances?filter[granularity]=DAILY&limit=30`,
  );
  if (!instances.ok) return null;
  const rows = instances.j.data || [];
  if (!rows.length) return null;

  let total = 0;
  let last7 = 0;
  let today = 0;
  const todayStr = ymd(new Date());
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekStr = ymd(weekAgo);

  for (const inst of rows.slice(0, 14)) {
    const segs = await asc(token, 'GET', `/analyticsReportInstances/${inst.id}/segments`);
    if (!segs.ok) continue;
    for (const seg of segs.j.data || []) {
      const url = seg.attributes?.url as string | undefined;
      if (!url) continue;
      const resp = await fetch(url);
      const buf = await resp.arrayBuffer();
      const text = await gunzipToText(buf);
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) continue;
      const headers = lines[0].split('\t');
      const countIdx = headers.findIndex((h) => /counts?/i.test(h));
      const dateIdx = headers.findIndex((h) => /date|day/i.test(h));
      const typeIdx = headers.findIndex((h) => /download.?type/i.test(h));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const type = typeIdx >= 0 ? cols[typeIdx] : '';
        if (type && /update/i.test(type)) continue;
        const n = Number(cols[countIdx] || 0);
        if (!Number.isFinite(n)) continue;
        total += n;
        const d = dateIdx >= 0 ? cols[dateIdx] : '';
        if (d >= weekStr) last7 += n;
        if (d === todayStr) today += n;
      }
    }
  }

  return { total, last7, today, source: 'asc_analytics' };
}
