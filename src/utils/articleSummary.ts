import he from 'he';

import { getCommentsApiConfig } from '../constants/commentsApi';
import { getSupabase } from '../services/supabaseClient';

export type ArticleSummaryResult = {
  bullets: string[];
  source: 'ai' | 'local';
};

/** Mots-outils FR/EN — exclus du scoring titre / densités. */
const STOP_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'cet', 'cette', 'dans', 'de', 'des', 'du',
  'en', 'et', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'leurs', 'mais', 'ne',
  'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'qu', 'que', 'qui',
  'sa', 'se', 'ses', 'son', 'sur', 'un', 'une', 'vos', 'votre', 'vous', 'y',
  'est', 'sont', 'été', 'etre', 'être', 'avoir', 'a', 'ont', 'eu', 'fait',
  'plus', 'moins', 'tres', 'très', 'aussi', 'comme', 'dont', 'où', 'si', 'tout',
  'tous', 'toute', 'toutes', 'cela', 'celui', 'celle', 'ceux', 'elles', 'elle',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were',
  'has', 'have', 'had', 'not', 'but', 'its', 'into', 'than', 'then', 'they',
  'their', 'will', 'can', 'may', 'after', 'before', 'about', 'over',
]);

/** Patterns typiques de nav / cookies / CTA / crédits (FR + EN). */
const BOILERPLATE_RE =
  /\b(cookie|cookies|newsletter|s'abonner|abonnez|subscribe|sign up|suivre sur|suivez-nous|partager|share this|lire aussi|à lire aussi|related articles?|publicit[ée]|advertisement|mentions l[ée]gales|all rights reserved|droits r[ée]serv[ée]s|javascript|enable cookies|accepter (les |tous les )?cookies|politique de confidentialit[ée]|nous utilisons des cookies|click here|cliquez ici|voir plus|lire la suite|continue reading|en savoir plus|sponsored|sponsorisé)\b/i;

/** Crédits photo, bylines, dates seules, légendes. */
const METADATA_NOISE_RE =
  /\b(image d['’]illustration|photo d['’]illustration|cr[ée]dit photo|illustration\s*:|getty images|afp|reuters|shutterstock|par\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\wÀ-ÿ.'-]{1,40}(\s+et\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\wÀ-ÿ.'-]{1,40})?\s*(le\s+)?\d{1,2}\s+\w+\s+\d{4}|publié\s+le\s+\d|mis\s+[àa]\s+jour)\b/i;

const DATE_ONLY_RE =
  /^\s*\d{1,2}\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{4}\s*$/i;

const CATEGORY_PREFIX_RE =
  /^(Pop Culture|High-Tech|Tech|Sciences?|Jeux\s*vid[ée]o|Culture|Société|Économie|Economie|Mobile|Hardware|Logiciel|Actualit[ée]s?)\s+/i;

const ABBREV_GUARD_RE =
  /\b(?:M|Mme|Mlle|Dr|Pr|Prof|St|Ste|etc|approx|vol|n°|no|Nos?|vs|cf)\.\s*$/i;

/**
 * Résumé local (extractif) — toujours dispo sans clé API.
 * Score : position, longueur, overlap titre, densités informatives, pénalité boilerplate.
 */
export function summarizeLocally(
  text: string,
  maxBullets = 3,
  title = '',
): string[] {
  const clean = stripToPlainText(text);
  if (clean.length < 40) return [];

  const titleTokens = meaningfulTokens(title);
  const sentences = splitSentences(clean)
    .map((s) => normalizeBullet(s))
    .filter((s) => s.length >= 28 && s.length <= 280)
    .filter((s) => !isBoilerplate(s));

  if (!sentences.length) {
    return [trimBullet(`${clean.slice(0, 180).trim()}…`)];
  }

  const scored = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: scoreSentence(sentence, index, sentences.length, titleTokens),
  }));

  scored.sort((a, b) => b.score - a.score);

  const picked: { sentence: string; index: number }[] = [];
  for (const item of scored) {
    if (picked.length >= maxBullets) break;
    if (picked.some((p) => overlap(p.sentence, item.sentence) > 0.5)) continue;
    picked.push({ sentence: trimBullet(item.sentence), index: item.index });
  }

  if (!picked.length) {
    return [trimBullet(`${clean.slice(0, 180).trim()}…`)];
  }

  // Remettre dans l’ordre d’apparition pour une lecture naturelle.
  return picked
    .sort((a, b) => a.index - b.index)
    .map((p) => p.sentence);
}

function decodeEntities(text: string): string {
  if (!text) return text;
  try {
    return he.decode(text, { isAttributeValue: false });
  } catch {
    return text;
  }
}

function stripToPlainText(text: string): string {
  return decodeEntities(
    text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function normalizeBullet(sentence: string): string {
  let s = decodeEntities(sentence).replace(/\s+/g, ' ').trim();
  s = s.replace(CATEGORY_PREFIX_RE, '');
  return s.trim();
}

function splitSentences(text: string): string[] {
  const parts: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    if (!/[.!?…]/.test(ch)) continue;
    // Évite de couper sur M. / Dr. / etc.
    if (ch === '.' && ABBREV_GUARD_RE.test(buf)) continue;
    const next = text[i + 1];
    if (next && !/\s/.test(next)) continue;
    const trimmed = buf.trim();
    if (trimmed) parts.push(trimmed);
    buf = '';
  }
  const tail = buf.trim();
  if (tail) parts.push(tail);
  return parts;
}

function isBoilerplate(sentence: string): boolean {
  if (BOILERPLATE_RE.test(sentence)) return true;
  if (METADATA_NOISE_RE.test(sentence)) return true;
  if (DATE_ONLY_RE.test(sentence)) return true;
  // Phrases très courtes / CTA / breadcrumbs
  const tokens = meaningfulTokens(sentence);
  if (tokens.length < 4 && sentence.length < 55) return true;
  // Trop de liens / URLs
  if ((sentence.match(/https?:\/\//gi) ?? []).length >= 1) return true;
  return false;
}

function scoreSentence(
  sentence: string,
  index: number,
  total: number,
  titleTokens: string[],
): number {
  const len = sentence.length;
  const tokens = meaningfulTokens(sentence);
  let score = 0;

  // Position : lead bias (actu) + léger boost milieu ; fin souvent crédits/nav.
  const rel = total <= 1 ? 0 : index / (total - 1);
  if (rel <= 0.2) score += 2.4;
  else if (rel <= 0.45) score += 1.6;
  else if (rel <= 0.7) score += 0.9;
  else score -= 0.6;

  // Longueur : privilégier des phrases informatives (≈ 60–180 car.).
  if (len >= 60 && len <= 180) score += 1.8;
  else if (len >= 45 && len <= 220) score += 1.0;
  else if (len < 40 || len > 250) score -= 1.2;

  // Overlap avec le titre.
  if (titleTokens.length) {
    const set = new Set(tokens);
    let hits = 0;
    for (const t of titleTokens) if (set.has(t)) hits += 1;
    score += (hits / titleTokens.length) * 3.2;
  }

  // Densité de tokens informatifs (peu de mots-outils).
  const rawWords = sentence.toLowerCase().split(/\W+/).filter(Boolean);
  if (rawWords.length) {
    const density = tokens.length / rawWords.length;
    score += density * 1.2;
  }

  // Signaux factuels : chiffres, noms propres approximés, guillemets.
  if (/\d/.test(sentence)) score += 0.55;
  if (/[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]{2,}/.test(sentence)) score += 0.35;
  if (/[«»""]/.test(sentence)) score += 0.25;

  // Pénalités navigation / liste sèche / métadonnées.
  if (/^[•\-\u2013\u2014\*]/.test(sentence.trim())) score -= 0.8;
  if ((sentence.match(/\|/g) ?? []).length >= 2) score -= 1.0;
  if (BOILERPLATE_RE.test(sentence)) score -= 3.0;
  if (METADATA_NOISE_RE.test(sentence)) score -= 4.0;

  return score;
}

function meaningfulTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\W+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function trimBullet(sentence: string): string {
  let s = normalizeBullet(sentence);
  if (s.length > 200) s = `${s.slice(0, 197).trim()}…`;
  return s;
}

function overlap(a: string, b: string): number {
  const wa = new Set(meaningfulTokens(a));
  const wb = meaningfulTokens(b);
  if (!wa.size || !wb.length) return 0;
  let hit = 0;
  for (const w of wb) if (wa.has(w)) hit += 1;
  return hit / Math.max(wb.length, 1);
}

/**
 * Tente l’Edge Function Supabase `article-summary` ; sinon résumé local.
 */
export async function fetchArticleSummary(input: {
  title: string;
  text: string;
  articleUrl?: string;
}): Promise<ArticleSummaryResult> {
  const local = summarizeLocally(input.text, 3, input.title);
  const cfg = getCommentsApiConfig();
  if (!cfg.enabled || input.text.trim().length < 80) {
    return { bullets: local, source: 'local' };
  }

  try {
    const supabase = getSupabase();
    const { data: sessionData } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionData.session?.access_token;
    // Résumé IA réservé aux comptes connectés (anti-abus OpenAI).
    if (!accessToken) {
      return { bullets: local, source: 'local' };
    }

    const res = await fetch(`${cfg.supabaseUrl}/functions/v1/article-summary`, {
      method: 'POST',
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: input.title,
        text: stripToPlainText(input.text).slice(0, 6000),
        articleUrl: input.articleUrl,
      }),
    });
    if (!res.ok) return { bullets: local, source: 'local' };
    const data = (await res.json()) as { bullets?: string[] };
    const bullets = (data.bullets ?? [])
      .map((b) => trimBullet(String(b)))
      .filter((b) => b.length >= 12 && !isBoilerplate(b))
      .slice(0, 3);
    if (!bullets.length) return { bullets: local, source: 'local' };
    return { bullets, source: 'ai' };
  } catch {
    return { bullets: local, source: 'local' };
  }
}
