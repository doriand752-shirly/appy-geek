/**
 * Résumé d’article (3 puces) — réservé aux utilisateurs connectés.
 *
 * Secrets (optionnels) :
 * - OPENAI_API_KEY — si absent, renvoie 503 et l’app bascule en résumé local
 *
 * Auth : JWT utilisateur (verify_jwt = true). La clé anon seule est refusée.
 *
 * Deploy : supabase functions deploy article-summary
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(),
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!supabaseUrl || !anon || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized', bullets: [] }, 401);
    }

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'login_required', bullets: [] }, 401);
    }

    const body = (await req.json()) as {
      title?: string;
      text?: string;
      articleUrl?: string;
    };
    const title = (body.title ?? '').trim();
    const text = (body.text ?? '').trim();
    if (text.length < 80) {
      return json({ error: 'text_too_short' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'openai_not_configured', bullets: [] }, 503);
    }

    const system = [
      'Tu es un rédacteur de briefs tech/geek pour Appigeek.',
      'Tu produis uniquement 3 puces factuelles en français.',
      'Règles strictes :',
      '- Exactement 3 lignes, chacune commençant par "- ".',
      '- Une idée concrète par puce (fait, chiffre, annonce, impact).',
      '- Max 22 mots par puce ; style direct, sans fluff.',
      '- Pas d’intro, conclusion, titre, emoji, ni phrase du type « cet article ».',
      '- Pas de spéculation ni d’opinion ; reste fidèle au texte.',
      '- Ignore cookies, newsletter, pubs, navigation et appels à l’action.',
      '- Ignore crédits photo, « image d’illustration », bylines, dates de publication et catégories.',
      '- Décode toute entité HTML (&mdash;, &#039;, etc.) en caractères normaux.',
      '- Si le texte mélange plusieurs sujets, priorise ce que le titre annonce.',
    ].join('\n');

    const user = [
      `Titre : ${title || '(sans titre)'}`,
      body.articleUrl ? `URL : ${body.articleUrl}` : null,
      '',
      'Texte de l’article :',
      text.slice(0, 5500),
      '',
      'Réponds uniquement avec les 3 puces.',
    ]
      .filter((line) => line !== null)
      .join('\n');

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.15,
        max_tokens: 280,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!aiRes.ok) {
      return json({ error: 'openai_failed', bullets: [] }, 502);
    }

    const data = (await aiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    const bullets = parseBullets(content);

    if (bullets.length < 1) {
      return json({ error: 'empty_summary', bullets: [] }, 502);
    }

    return json({ bullets });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'unknown', bullets: [] },
      500,
    );
  }
});

function parseBullets(content: string): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')
        .replace(/^["«]\s*|\s*["»]$/g, '')
        .trim(),
    )
    .filter((l) => l.length >= 12)
    .filter((l) => !/^(voici|résumé|summary|en résumé)\b/i.test(l));

  const deduped: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().slice(0, 48);
    if (deduped.some((d) => d.toLowerCase().startsWith(key.slice(0, 32)))) {
      continue;
    }
    deduped.push(line.length > 180 ? `${line.slice(0, 177).trim()}…` : line);
    if (deduped.length >= 3) break;
  }
  return deduped;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-digest-secret',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
