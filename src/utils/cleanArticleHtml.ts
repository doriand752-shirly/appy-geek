/**
 * Critères de nettoyage du corps d’article (heuristiques FR/EN — faux positifs possibles).
 *
 * - Balises retirées en bloc : `aside`, `nav`, `form`, `svg`, `footer` (pieds injectés dans le corps).
 * - Blocs dont la `class` contient un fragment « bruit » (`NOISE_CLASS_FRAGMENTS`) sur `div` et `section`.
 * - Bandeaux digest mobile Presse Citron, titres « Les dernières actualités », « Sur le même sujet », etc.
 * - Paragraphes courts typés : titre de rubrique seul, promo/newsletter, murs cookies statiques, pubs en capitales.
 * - Cibles éditoriales : encarts produit / partage / pub Les Numériques & équivalents ; images de notation décoratives.
 * - Pubs partenaires (Bitdefender, McDo…) : URLs dans les attributs ; blocs « Sponsorisé » ; libellé « Ne plus voir cette pub ».
 * - `div` / blocs par id : commentaires, Disqus, formulaire de note, `respond`.
 * - Préparation des images pour RN : `prepareArticleImagesForRn` (importé ici, logique dans son module).
 */

import { hostFromArticleUrl, ruleForArticleUrl } from './articleSourceRules';
import { prepareArticleImagesForRn } from './prepareArticleImagesForRn';

/** Supprime tous les blocs équilibrés pour une balise donnée (aside, nav, form…). */
function removeBalancedTagBlocks(html: string, tag: string): string {
  const lowerTag = tag.toLowerCase();
  let result = html;
  let searchPos = 0;
  while (true) {
    const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'i');
    openRe.lastIndex = searchPos;
    const m = openRe.exec(result);
    if (!m) break;
    const start = m.index;
    const contentStart = start + m[0].length;
    const lc = result.toLowerCase();
    const closeLower = `</${lowerTag}>`;
    let pos = contentStart;
    let depth = 1;
    let endOfBlock = -1;
    while (pos < result.length && depth > 0) {
      const nextClose = lc.indexOf(closeLower, pos);
      const nextOpenRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
      nextOpenRe.lastIndex = pos;
      const nextOpenMatch = nextOpenRe.exec(result);
      const nextOpen = nextOpenMatch ? nextOpenMatch.index : -1;
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        pos = nextOpen + nextOpenMatch![0].length;
      } else {
        depth -= 1;
        if (depth === 0) {
          endOfBlock = nextClose + closeLower.length;
          break;
        }
        pos = nextClose + closeLower.length;
      }
    }
    if (endOfBlock === -1) {
      searchPos = start + 1;
      continue;
    }
    result = result.slice(0, start) + result.slice(endOfBlock);
    searchPos = start;
  }
  return result;
}

/** Classes / fragments de classe souvent associés à newsletter, pubs, liés, partage. */
const NOISE_CLASS_FRAGMENTS = [
  'newsletter',
  'subscription',
  'subscribe',
  'related-post',
  'related_post',
  'relatedpost',
  'yarpp',
  'jp-relatedposts',
  'sharedaddy',
  'social-share',
  'social_share',
  'share-buttons',
  'share_buttons',
  'cookie-notice',
  'cookie_notice',
  'promo-banner',
  'advertisement',
  'adsbygoogle',
  'post-tags',
  'post_tags',
  'reading-list',
  'more-from',
  'recommended',
  'follow-us',
  'follow_us',
  'mc_embed',
  'mailchimp',
  'optin',
  'sidebar',
  /* WordPress « derniers articles », Presse Citron & équivalents */
  'latest-posts',
  'latest_posts',
  'wp-block-latest',
  'latest-news',
  'latest_news',
  'home-latest',
  /* 01net, rédactions WP / thèmes « related » */
  'related-posts',
  'related_posts',
  'yarpp-related',
  'jetpack-related',
  'jp-relatedposts',
  'rp4wp',
  'single-related',
  'more-from',
  'more_from',
  'from-the-web',
  'article-recirc',
  'recirc',
  'taboola',
  'outbrain',
  'mgid',
  'post-navigation',
  'posts-navigation',
  'adjacent-posts',
  'mv-related',
  'zergnet',
  'connatix',
  /* Les Numériques : fiche produit, notation, tableau de prix dans le corps */
  'pr__m-pt',
  'pr__i-pr',
  'ln__m-rtg',
  'ln__a-nt',
  /* Les Numériques : ligne « Nos réseaux », emplacements pub (`Publicité, …`) */
  'ln__m-shr',
  'ln__a-dc',
  /* Numerama : encarts abonnement / compteur */
  'premium-promo',
  /* 01net & régie : widgets Keleops / Optidigital */
  'keleops-ad',
  'optidigital',
  /* MailChimp for WordPress (Presse Citron, etc.) si résidu hors <form> */
  'mc4wp',
  /* Humanoid (Frandroid, etc.) : bloc « Ce contenu est bloqué… cookies / traceurs » (Didomi + embeds) */
  'embed-consent-overlay',
  /* Commentaires & fils (WP, Disqus, Humanoid, Gameblog…) */
  'comments-component',
  'comments-area',
  'comments-section',
  'comment-section',
  'comment-respond',
  'article__comments',
  'article__share',
  'sharer',
  /* Articles liés JV / Gameblog */
  'post-related-games',
  'common-post-list',
  /* WP Product Review / étoiles (Presse citron, etc.) */
  'wppr-review',
  'review-grade-widget',
  'review-statistics',
  /* ZDNet : formulaire « notez cet article » */
  'cnzd__lyt__form',
  /* Régies / habillage pub */
  'ad--',
  'pub-section',
  'oop_ad',
  /* Numerama / Humanoid : bons plans, contenus partenaires, in-read */
  'bons-plans',
  'bons_plans',
  'sponsored-article',
  'article-sponsored',
  'content-sponsored',
  'is-sponsored',
  'partner-block',
  'brand-content',
  'native-ad',
  'inread-ad',
  'inread_',
  'affiliate-box',
  'shop-block',
  'humanoid-inread',
  'wp-block-humanoid',
  /* iPhon.fr : partage social, auteur, tags */
  'mvp-post-soc',
  'mvp-author',
  'gtm-post-soc',
  'mvp-post-tags',
  'mvp-post-head',
  'mvp-post-feat-img',
  /* Phonandroid : encarts auteur */
  'author-box',
  'post-author',
  /* Encarts « Sponsorisé » / marque (Humanoid, Numerama…) */
  'contenu-sponsorise',
  'contenu-sponsoris',
  'sponsor-label',
  'native-banner',
  'brand-partner',
  /* BeGeek : bio auteur, CTA Google, « À découvrir », partage de fin */
  'article-end',
  'google-cta',
  'discover',
  /* Consomac : réactions forum + barre de partage */
  'reaction-bloc',
  'news-share',
  /* iPhoneSoft : partage, méta auteur, badge Google, suite d’articles */
  'post-share',
  'post-info',
  'post-tag',
  'google-preferred-source',
  'underpost',
  'nexus-insert',
  'memesujet',
  'depeche-h2',
];

function escapeRegexClassFragment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retire les balises `tag` dont l’attribut class contient un fragment « bruit » (équilibré).
 * Les `<section>` portent souvent widgets pubs / related (01net, thèmes WP) alors que seuls les div étaient traités.
 */
function removeNoiseClassTaggedBlocks(html: string, tag: string): string {
  const lowerTag = tag.toLowerCase();
  const openNeedle = `<${lowerTag}`;
  const closeNeedle = `</${lowerTag}>`;
  const closeNeedleLen = closeNeedle.length;

  let result = html;
  for (const frag of NOISE_CLASS_FRAGMENTS) {
    const esc = escapeRegexClassFragment(frag);
    const openRe = new RegExp(
      `<${lowerTag}\\b[^>]*\\bclass=['"][^'"]*${esc}[^'"]*['"][^>]*>`,
      'i',
    );
    let guard = 0;
    while (guard++ < 400) {
      openRe.lastIndex = 0;
      const m = openRe.exec(result);
      if (!m || m.index === undefined) break;
      const start = m.index;
      const startContent = start + m[0].length;
      const lc = result.toLowerCase();
      let pos = startContent;
      let depth = 1;
      let endOfBlock = -1;
      while (pos < result.length && depth > 0) {
        const openIdx = lc.indexOf(openNeedle, pos);
        const closeIdx = lc.indexOf(closeNeedle, pos);
        if (closeIdx === -1) break;
        if (openIdx !== -1 && openIdx < closeIdx) {
          depth += 1;
          pos = openIdx + openNeedle.length;
        } else {
          depth -= 1;
          if (depth === 0) {
            endOfBlock = closeIdx + closeNeedleLen;
            break;
          }
          pos = closeIdx + closeNeedleLen;
        }
      }
      if (endOfBlock === -1) break;
      result = result.slice(0, start) + result.slice(endOfBlock);
    }
  }
  return result;
}

function removeNoiseClassDivs(html: string): string {
  return removeNoiseClassTaggedBlocks(html, 'div');
}

function removeNoiseClassSections(html: string): string {
  return removeNoiseClassTaggedBlocks(html, 'section');
}

/** Passe div + section pour les classes « bruit ». */
function removeNoiseClassBlockElements(html: string): string {
  let x = removeNoiseClassDivs(html);
  x = removeNoiseClassSections(x);
  return x;
}

/** Les Numériques : widget tiers vide en pied d’article. */
function removePooolWidgetPlaceholder(html: string): string {
  return html.replace(/<div\b[^>]*\bid\s*=\s*["']poool-widget["'][^>]*>\s*<\/div>/gi, '');
}

/** IDs fréquents : bloc commentaires, Disqus, réponse WP « respond », formulaire de note (ZDNet…). */
const COMMENT_AND_RATING_DIV_IDS = [
  'comments',
  'disqus_thread',
  'disqus-root',
  'rating-form',
  'respond',
  'commentform',
] as const;

/** Retire un `<div id="…">` équilibré (le bloc peut être volumineux). */
function removeBalancedDivsById(html: string, idValue: string): string {
  const esc = escapeRegexClassFragment(idValue);
  const openRe = new RegExp(`<div\\b[^>]*\\bid\\s*=\\s*["']${esc}["'][^>]*>`, 'i');
  let result = html;
  let guard = 0;
  while (guard++ < 80) {
    openRe.lastIndex = 0;
    const m = openRe.exec(result);
    if (!m || m.index === undefined) break;
    const start = m.index;
    const contentStart = start + m[0].length;
    const after = findBalancedCloseEnd(result, contentStart, 'div');
    if (after === null) break;
    result = result.slice(0, start) + result.slice(after);
  }
  return result;
}

function removeCommentRatingBlocksById(html: string): string {
  let x = html;
  for (const id of COMMENT_AND_RATING_DIV_IDS) {
    x = removeBalancedDivsById(x, id);
  }
  return x;
}

/**
 * Ferme la balise `tag` ouverte juste avant `contentStart` (contenu intérieur = à partir de contentStart).
 * Retourne l’index dans `html` juste après `</tag>`.
 */
function findBalancedCloseEnd(html: string, contentStart: number, tag: string): number | null {
  const lc = html.toLowerCase();
  const closeLower = `</${tag.toLowerCase()}>`;
  let pos = contentStart;
  let depth = 1;
  while (pos < html.length && depth > 0) {
    const nextClose = lc.indexOf(closeLower, pos);
    const nextOpenRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    nextOpenRe.lastIndex = pos;
    const nextOpenMatch = nextOpenRe.exec(html);
    const nextOpen = nextOpenMatch ? nextOpenMatch.index : -1;
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + nextOpenMatch![0].length;
    } else {
      depth -= 1;
      if (depth === 0) return nextClose + closeLower.length;
      pos = nextClose + closeLower.length;
    }
  }
  return null;
}

/** Texte du bloc jusqu’à la balise fermante correspondante (pour analyse « digest »). */
function findBalancedRange(
  html: string,
  contentStart: number,
  tag: string,
): { inner: string; afterClose: number } | null {
  const lc = html.toLowerCase();
  const closeLower = `</${tag.toLowerCase()}>`;
  let pos = contentStart;
  let depth = 1;
  while (pos < html.length && depth > 0) {
    const nextClose = lc.indexOf(closeLower, pos);
    const nextOpenRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    nextOpenRe.lastIndex = pos;
    const nextOpenMatch = nextOpenRe.exec(html);
    const nextOpen = nextOpenMatch ? nextOpenMatch.index : -1;
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + nextOpenMatch![0].length;
    } else {
      depth -= 1;
      if (depth === 0) {
        return {
          inner: html.slice(contentStart, nextClose),
          afterClose: nextClose + closeLower.length,
        };
      }
      pos = nextClose + closeLower.length;
    }
  }
  return null;
}

/**
 * Marqueurs dans les URLs d’attributs (`src`, `href`, `data-src`…) : encarts partenaires
 * (Numerama, Humanoid). Pas de test sur le texte seul pour éviter les faux positifs éditoriaux.
 */
const PARTNER_AD_URL_MARKERS = [
  'bitdefender',
  'mcdonalds',
  'mcdo.fr',
  'mcdonalds.fr',
  'go.mcdonalds',
  'mcdonalds.com',
] as const;

function innerLooksLikePartnerAdBlock(inner: string): boolean {
  const re =
    /(?:\b(?:src|href|data-(?:src|url|lazy-src)|poster)\s*=\s*["'])([^"']+)/gi;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const val = m[1].toLowerCase();
    for (const marker of PARTNER_AD_URL_MARKERS) {
      if (val.includes(marker)) return true;
    }
  }
  return false;
}

/**
 * Encart « native » avec mention Sponsorisé + marque ou lien traceur (ex. McDo au milieu d’un article).
 */
function innerLooksLikeSponsoredLabelBlock(inner: string): boolean {
  const plain = stripHtmlInner(inner);
  if (plain.length > 12_000) return false;
  const hasSponsorWord =
    /\b(sponsorisé|sponsor(?:isé|ing)?|contenu sponsorisé|article sponsorisé|partenaire officiel)\b/i.test(
      plain,
    ) || /\bsponsored\s+content\b|\bpaid\s+partnership\b/i.test(plain);
  if (!hasSponsorWord) return false;
  if (innerLooksLikePartnerAdBlock(inner)) return true;
  if (/mcdonald|mc\s*do\b|mcdo\.|burger\s*king|subway\.fr|quick\.fr/i.test(plain)) return true;
  /* Widget court avec uniquement le badge + visuel / CTA */
  if (plain.length <= 4_500 && /\bsponsorisé\b/i.test(plain)) return true;
  return false;
}

function paragraphLooksLikePartnerLinkOnly(innerHtml: string): boolean {
  const text = stripHtmlInner(innerHtml);
  if (text.length > 140) return false;
  return innerLooksLikePartnerAdBlock(innerHtml);
}

/**
 * Figures / div / section : pubs partenaires (URLs) ou blocs étiquetés Sponsorisé (McDo, etc.).
 */
function removePartnerAdBlocksByUrl(html: string): string {
  const maxInner = 18_000;
  const tags = ['figure', 'div', 'section'] as const;
  let result = html;
  for (const tag of tags) {
    let guard = 0;
    while (guard++ < 450) {
      const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
      let found: { start: number; removeEnd: number } | null = null;
      let m: RegExpExecArray | null;
      while ((m = openRe.exec(result)) !== null) {
        const start = m.index;
        const contentStart = start + m[0].length;
        const range = findBalancedRange(result, contentStart, tag);
        if (!range || range.inner.length > maxInner) continue;
        const inner = range.inner;
        if (
          !innerLooksLikePartnerAdBlock(inner) &&
          !innerLooksLikeSponsoredLabelBlock(inner)
        ) {
          continue;
        }
        found = { start, removeEnd: range.afterClose };
        break;
      }
      if (!found) break;
      result = result.slice(0, found.start) + result.slice(found.removeEnd);
    }
  }
  return result;
}

/**
 * Supprime des balises (`article`, `section`…) dont la classe contient un fragment,
 * en fermeture équilibrée. Les Numériques insère une carte produit
 * `<article class="pr__i-pr__md-lst">` (photo, notes en étoiles, « Donnez votre avis »).
 */
function removeTaggedBlocksByClassFragment(
  html: string,
  tag: string,
  classFragment: string,
): string {
  const esc = escapeRegexClassFragment(classFragment);
  const openRe = new RegExp(
    `<${tag}\\b[^>]*\\bclass=['"][^'"]*${esc}[^'"]*['"][^>]*>`,
    'gi',
  );
  let result = html;
  let guard = 0;
  while (guard++ < 80) {
    openRe.lastIndex = 0;
    const m = openRe.exec(result);
    if (!m || m.index === undefined) break;
    const start = m.index;
    const contentStart = start + m[0].length;
    const after = findBalancedCloseEnd(result, contentStart, tag);
    if (after === null) break;
    result = result.slice(0, start) + result.slice(after);
  }
  return result;
}

/** Sprites / images de notation restantes (Les Numériques, WP Product Review, tests…). */
function removeRatingDecorationImages(html: string): string {
  return html.replace(
    /<img\b[^>]*\bsrc=["'][^"']*(?:rating_ed|\/stars\/|\/star-|note-utilisateur|\/notation\/|wppr-|review-stars|review-rating|star-rating|review-grade|\.amazon\.[^"']*review\/stars)[^"']*["'][^>]*\/?>/gi,
    '',
  );
}

/** Logo « Ajoutez-nous à vos favoris Google » (Les Numériques), si le bloc span a déjà été retiré. */
function removeGoogleLogoDecorationImages(html: string): string {
  return html.replace(
    /<img\b[^>]*\bsrc=["'][^"']*logo-google\.svg[^"']*["'][^>]*\/?>/gi,
    '',
  );
}

/** Minuscules, espaces, sans accents — pour comparer au HTML réel (Presse Citron, &nbsp;, etc.). */
function normalizeHeadingInner(html: string): string {
  return stripHtmlInner(html)
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Titres « autres articles / flux » — motifs sans accents car normalizeHeadingInner les retire.
 * Presse Citron : « Les dernières actualités » est souvent dans <div class="section-title"><span>…
 */
const DIGEST_HEADING_RES = [
  /^les dernieres actualites(?: du jour)?$/,
  /^nos dernieres actualites$/,
  /^dernieres actualites$/,
  /^les derniers articles$/,
  /^nos derniers articles$/,
  /^les articles recents$/,
  /^articles recents$/,
  /^autres articles$/,
  /^articles similaires$/,
  /^a ne pas manquer$/,
  /^latest news$/,
  /^more stories$/,
];

/**
 * Formulations courantes des bandeaux « autres articles » (titres courts, sans être le corps du texte).
 * Utiliser avec une limite de longueur sur `norm` pour limiter les faux positifs.
 */
function digestShortTitleLooksRelated(norm: string): boolean {
  if (norm.length > 200) return false;
  const needles: { s: string; maxLen: number }[] = [
    /* 01net : barres widget-title (Top téléchargements, …) */
    { s: 'top telechargements', maxLen: 45 },
    { s: 'les tests a la une', maxLen: 50 },
    { s: 'sur le meme sujet', maxLen: 90 },
    { s: 'sur le meme theme', maxLen: 90 },
    { s: 'les derniers tests', maxLen: 70 },
    { s: 'les derniers bons plans', maxLen: 90 },
    { s: 'decouvrez aussi', maxLen: 90 },
    { s: 'decouvrez egalement', maxLen: 100 },
    { s: 'vous aimerez aussi', maxLen: 90 },
    { s: 'consulter aussi', maxLen: 90 },
    { s: 'articles recommandes', maxLen: 110 },
    { s: 'notre selection', maxLen: 90 },
    { s: 'selection de la redaction', maxLen: 120 },
    { s: 'related articles', maxLen: 90 },
    { s: 'more stories', maxLen: 70 },
    { s: 'more from', maxLen: 70 },
    { s: 'you may also like', maxLen: 100 },
    { s: 'from around the web', maxLen: 110 },
    { s: 'les plus lus', maxLen: 70 },
    { s: 'les plus commentes', maxLen: 90 },
    { s: 'la redaction vous propose', maxLen: 130 },
    { s: 'ca peut aussi vous interesser', maxLen: 130 },
    { s: 'on en parle aussi', maxLen: 100 },
    { s: 'trending now', maxLen: 70 },
    { s: 'autres sujets', maxLen: 80 },
    { s: 'articles recents', maxLen: 60 },
    { s: 'les articles recents', maxLen: 70 },
  ];
  for (const { s, maxLen } of needles) {
    if (norm.length <= maxLen && norm.includes(s)) return true;
  }
  /* « Lire aussi » seul ou quasi seul */
  if ((norm === 'lire aussi' || norm === 'a lire aussi') && norm.length <= 16) return true;
  return false;
}

function blockInnerMatchesDigest(innerHtml: string): boolean {
  const t = normalizeHeadingInner(innerHtml);
  if (t.length > 400) return false;
  for (const re of DIGEST_HEADING_RES) {
    if (re.test(t)) return true;
  }
  if (t.length <= 200 && t.includes('les dernieres actualites')) return true;
  if (t.length <= 200 && t.includes('nos dernieres actualites')) return true;
  if (digestShortTitleLooksRelated(t)) return true;
  return false;
}

/** Ne pas traiter les wrappers de corps d’article comme un titre digest. */
function isLikelyMainContentWrapperOpen(openTag: string): boolean {
  return /\b(?:entry-content|post-content|article-body|article__body|single-content|entry__content)\b/i.test(
    openTag,
  );
}

/**
 * 01net & co. : titres « Sur le même sujet » dans un simple <div> (pas <h2>), sous-classe .text-3xl, etc.
 */
function removeDigestLikeShortDivBlocks(html: string): string {
  let result = html;
  for (let iter = 0; iter < 45; iter++) {
    const openRe = /<div\b[^>]*>/gi;
    let removed = false;
    let m: RegExpExecArray | null;
    openRe.lastIndex = 0;
    while ((m = openRe.exec(result)) !== null) {
      if (isLikelyMainContentWrapperOpen(m[0])) continue;
      const start = m.index;
      const contentStart = start + m[0].length;
      const range = findBalancedRange(result, contentStart, 'div');
      if (!range || range.inner.length > 9000) continue;
      if (!blockInnerMatchesDigest(range.inner)) continue;
      let removeEnd = range.afterClose;
      let pos = removeEnd;
      while (pos < result.length && /\s/.test(result[pos])) pos++;
      for (let chain = 0; chain < 14; chain++) {
        const tail = result.slice(pos);
        const wrap = pickNextWrapperOpen(tail);
        if (!wrap) break;
        const innerContentStart = pos + wrap.fullLen;
        const afterBlock = findBalancedCloseEnd(result, innerContentStart, wrap.tag);
        if (afterBlock === null) break;
        removeEnd = afterBlock;
        pos = removeEnd;
        while (pos < result.length && /\s/.test(result[pos])) pos++;
      }
      result = result.slice(0, start) + result.slice(removeEnd);
      removed = true;
      break;
    }
    if (!removed) break;
  }
  return result;
}

/**
 * Bloc mobile Presse Citron : div lg:hidden + print:hidden + mt-12 contenant section-title + grille.
 */
function removeMobileDigestOuterBlocks(html: string): string {
  let result = html;
  const openRe =
    /<div\b(?=[^>]*\blg:hidden\b)(?=[^>]*\bprint:hidden\b)(?=[^>]*\bmt-12\b)[^>]*>/gi;
  for (let iter = 0; iter < 18; iter++) {
    let m: RegExpExecArray | null;
    let removed = false;
    openRe.lastIndex = 0;
    while ((m = openRe.exec(result)) !== null) {
      const start = m.index;
      const contentStart = start + m[0].length;
      const range = findBalancedRange(result, contentStart, 'div');
      if (!range) continue;
      const plain = normalizeHeadingInner(range.inner);
      if (
        !plain.includes('les dernieres actualites') &&
        !plain.includes('dernieres actualites')
      ) {
        continue;
      }
      result = result.slice(0, start) + result.slice(range.afterClose);
      removed = true;
      break;
    }
    if (!removed) break;
  }
  return result;
}

/** <div class="… section-title …"> souvent utilisé sans <h2> (Presse Citron). */
function removeDigestSectionTitleDivs(html: string): string {
  let result = html;
  const openRe =
    /<div\b[^>]*\bclass=['"][^'"]*\bsection-title\b[^'"]*['"][^>]*>/gi;
  for (let iter = 0; iter < 22; iter++) {
    let m: RegExpExecArray | null;
    let removed = false;
    openRe.lastIndex = 0;
    while ((m = openRe.exec(result)) !== null) {
      const start = m.index;
      const contentStart = start + m[0].length;
      const range = findBalancedRange(result, contentStart, 'div');
      if (!range || !blockInnerMatchesDigest(range.inner)) continue;
      let removeEnd = range.afterClose;
      let pos = removeEnd;
      while (pos < result.length && /\s/.test(result[pos])) pos++;
      for (let chain = 0; chain < 12; chain++) {
        const tail = result.slice(pos);
        const wrap = pickNextWrapperOpen(tail);
        if (!wrap) break;
        const innerContentStart = pos + wrap.fullLen;
        const afterBlock = findBalancedCloseEnd(result, innerContentStart, wrap.tag);
        if (afterBlock === null) break;
        removeEnd = afterBlock;
        pos = removeEnd;
        while (pos < result.length && /\s/.test(result[pos])) pos++;
      }
      result = result.slice(0, start) + result.slice(removeEnd);
      removed = true;
      break;
    }
    if (!removed) break;
  }
  return result;
}

function pickNextWrapperOpen(rest: string): { tag: string; fullLen: number } | null {
  const candidates = ['section', 'aside', 'div', 'ul', 'ol'] as const;
  for (const tag of candidates) {
    const m = new RegExp(`^<${tag}\\b[^>]*>`, 'i').exec(rest);
    if (m) return { tag, fullLen: m[0].length };
  }
  return null;
}

/**
 * Supprime un titre « Les dernières actualités » (h1–h6) et les blocs HTML qui suivent
 * (section, div, listes), jusqu’à ce qu’il n’y ait plus de wrapper évident.
 */
function removeDigestHeadingBlocks(html: string): string {
  let result = html;
  for (let iter = 0; iter < 25; iter++) {
    const openRe = /<h([1-6])\b[^>]*>/gi;
    let found: { headStart: number; removeEnd: number } | null = null;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(result)) !== null) {
      const level = parseInt(m[1], 10);
      const headStart = m.index;
      const afterOpen = headStart + m[0].length;
      const closeLower = `</h${level}>`;
      const closeIdx = result.toLowerCase().indexOf(closeLower.toLowerCase(), afterOpen);
      if (closeIdx === -1) continue;
      const inner = result.slice(afterOpen, closeIdx);
      if (!blockInnerMatchesDigest(inner)) continue;
      let removeEnd = closeIdx + closeLower.length;
      let pos = removeEnd;
      while (pos < result.length && /\s/.test(result[pos])) pos++;
      for (let chain = 0; chain < 10; chain++) {
        const tail = result.slice(pos);
        const wrap = pickNextWrapperOpen(tail);
        if (!wrap) break;
        const innerContentStart = pos + wrap.fullLen;
        const afterBlock = findBalancedCloseEnd(result, innerContentStart, wrap.tag);
        if (afterBlock === null) break;
        removeEnd = afterBlock;
        pos = removeEnd;
        while (pos < result.length && /\s/.test(result[pos])) pos++;
      }
      found = { headStart, removeEnd };
      break;
    }
    if (!found) break;
    result = result.slice(0, found.headStart) + result.slice(found.removeEnd);
  }
  return result;
}

function stripHtmlInner(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rubrique seule, sans phrase (titres « à lire aussi », etc.). */
const SECTION_TITLE_ONLY = new RegExp(
  '^[\\s]*(?:' +
    'à lire aussi|à lire également|sur le même sujet|sur le même thème|articles? li[ée]s|en continu|fil info|brèves|la suite après publicité|publicité|découvrez aussi|' +
    'les dernières actualités|nos dernières actualités|dernières actualités|nos derniers articles|les derniers articles' +
    ')\\s*[.:…]?\\s*$',
  'i',
);

/**
 * Formulations très typées de blocs promo / inscription (ligne souvent courte).
 * On n’applique pas à un long paragraphe pour éviter d’effacer du vrai contenu.
 */
const PROMO_OR_SIGNUP_LINE = new RegExp(
  '^[\\s]*(?:' +
    'inscrivez[-\\s]?vous(?:\\s+à)?\\s|s[\'’]abonner\\s|recevez (?:la )?newsletter|rejoignez[-\\s]nous sur|suivez[-\\s]nous sur (?:twitter|facebook|linkedin|instagram)|' +
    'abonnez[-\\s]vous|newsletter\\s*:|notre newsletter|téléchargez (?:gratuitement )?l[\'’]application|' +
    'subscribe(?:\\s+to)?\\s|sign up for|join our|follow us on|' +
    'share this (?:article|story|post) on|partagez cet article sur|' +
    'publicité\\s|annonce sponsorisée|contenu sponsorisé|advertisement|sponsored content|cookies?\\s*policy' +
    ')\\b',
  'i',
);

/** Murs consentement / cookies (embeds Disqus, vidéos, etc.) restés en HTML statique. */
function paragraphLooksLikeCookieConsentWall(innerHtml: string): boolean {
  const t = normalizeHeadingInner(innerHtml);
  if (t.length < 35 || t.length > 900) return false;
  if (
    t.includes('contenu est bloque') &&
    (t.includes('cookies') || t.includes('traceurs'))
  )
    return true;
  if (t.includes('this content is blocked') && /cookies?|trackers?/i.test(t)) return true;
  if (
    t.includes('vous devez accepter les cookies') ||
    t.includes('acceptez les cookies pour afficher')
  )
    return true;
  return false;
}

function paragraphLooksLikeNoise(innerHtml: string): boolean {
  const text = stripHtmlInner(innerHtml);
  if (text.length < 8) return false;
  if (paragraphLooksLikePartnerLinkOnly(innerHtml)) return true;
  if (text.length <= 55 && /^(?:publicité\s*)?sponsorisé\.?\s*$/i.test(text.trim())) return true;
  if (text.length <= 90 && /ne plus voir cette pub/i.test(text)) return true;
  if (paragraphLooksLikeCookieConsentWall(innerHtml)) return true;
  const nt = normalizeHeadingInner(innerHtml);
  if (nt.length <= 200 && digestShortTitleLooksRelated(nt)) return true;
  if (SECTION_TITLE_ONLY.test(text)) return true;
  /* Bloc promo / inscription : seulement si le paragraphe reste relativement court */
  if (text.length <= 220 && PROMO_OR_SIGNUP_LINE.test(text)) return true;
  /* Bandeau pub tout en capitales */
  if (
    text.length < 48 &&
    /^[A-Z0-9\s\-–—&:+'’]+$/u.test(text) &&
    /PUBLICITÉ|SPONSORISÉ|PROMO|PUBLICIDAD/i.test(text)
  )
    return true;
  return false;
}

/** Retire les <p>…</p> jugés bruit (parcours itéré pour attraper plusieurs patterns). */
function removeNoiseParagraphs(html: string): string {
  let result = html;
  let prev = '';
  let guard = 0;
  while (prev !== result && guard++ < 25) {
    prev = result;
    result = result.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (full, inner) =>
      paragraphLooksLikeNoise(inner) ? '' : full,
    );
  }
  return result;
}

function removeHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/** Chaînes vides / espaces entre balises superflues */
function collapseWhitespace(html: string): string {
  return html
    .replace(/\s*(<\/(?:p|div|h[1-6]|li|blockquote|figure|section)>)\s*/gi, '$1 ')
    .replace(/(<(?:br|hr)\s*\/?>)\s*\1+/gi, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Retire avatars Gravatar et images de profil auteur (souvent énormes sans CSS du site). */
function removeAuthorAvatarImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/gravatar\.com|secure\.gravatar/i.test(tag)) return '';
    if (/\bclass=["'][^"']*\bavatar\b/i.test(tag) && /gravatar|\/avatar\//i.test(tag)) return '';
    return tag;
  });
}

/** iPhon.fr : le wrapper #mvp-post-content inclut en-tête, image hero et partage — on le découpe si besoin. */
function trimIphonPostWrapper(html: string): string {
  const main = /<div\b[^>]*\bid=["']mvp-content-main["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (main?.[1] && main[1].trim().length > 120) return main[1];
  return html;
}

/** ZDNet / BeGeek : titres et fil d’Ariane en tête du bloc #content. */
function removeDuplicateArticleChrome(html: string): string {
  let out = html;
  out = out.replace(/<ol\b[^>]*\bbreadcrumb\b[^>]*>[\s\S]*?<\/ol>/gi, '');
  out = out.replace(/<div\b[^>]*>\s*<ol\b[^>]*\bbreadcrumb\b[^>]*>[\s\S]*?<\/ol>\s*<\/div>/gi, '');
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');
  out = out.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, '');
  return out;
}

/** Blocs pub / partage courts avec liens X, Facebook, partage d’article. */
function removeSocialShareBlocks(html: string): string {
  if (html.length > 55_000) return html;
  let result = html;
  const tags = ['div', 'section', 'p', 'ul'] as const;
  for (const tag of tags) {
    let guard = 0;
    while (guard++ < 40) {
      const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
      let found: { start: number; removeEnd: number } | null = null;
      let m: RegExpExecArray | null;
      while ((m = openRe.exec(result)) !== null) {
        const start = m.index;
        const contentStart = start + m[0].length;
        const range = findBalancedRange(result, contentStart, tag);
        if (!range || range.inner.length > 6000) continue;
        const inner = range.inner;
        const plain = stripHtmlInner(inner);
        if (plain.length > 900) continue;
        const socialUrl =
          /twitter\.com|x\.com\/intent|facebook\.com\/sharer|linkedin\.com\/share|whatsapp\.com\/send/i.test(
            inner,
          );
        const shareLabel =
          plain.length <= 220 &&
          /partagez|partager cet article|share this|suivez-nous sur|follow us on/i.test(plain);
        if (!socialUrl && !shareLabel) continue;
        found = { start, removeEnd: range.afterClose };
        break;
      }
      if (!found) break;
      result = result.slice(0, found.start) + result.slice(found.removeEnd);
    }
  }
  return result;
}

/** Consomac : bannières « fiche produit » injectées en tête des dépêches. */
function removeConsomacProductTeasers(html: string): string {
  return removeTaggedBlocksByClassFragment(html, 'div', 'texteanalyseproduit');
}

/** iPhoneSoft : pub in-article / slots vides qui laissent un trou. */
function removeIphonesoftChrome(html: string): string {
  let out = html;
  out = removeTaggedBlocksByClassFragment(out, 'div', 'pub');
  out = out.replace(/<ins\b[^>]*\bclass=["'][^"']*adsbygoogle[^"']*["'][^>]*>[\s\S]*?<\/ins>/gi, '');
  out = out.replace(/<div\b[^>]*\bid=["']promo-one["'][^>]*>\s*<\/div>/gi, '');
  out = out.replace(/<ul\b[^>]*\bclass=["'][^"']*post-share[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '');
  out = out.replace(/<ul\b[^>]*\bclass=["'][^"']*post-info[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '');
  out = out.replace(/<ul\b[^>]*\bclass=["'][^"']*post-tag[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '');
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');
  return out;
}

function applyHostArticleCleaning(html: string, pageUrl?: string): string {
  const host = hostFromArticleUrl(pageUrl);
  const rule = ruleForArticleUrl(pageUrl);
  if (!host || !rule) return html;
  let out = html;
  if (host === 'iphon.fr' || host.endsWith('.iphon.fr')) {
    out = trimIphonPostWrapper(out);
  }
  if (
    host === 'zdnet.fr' ||
    host.endsWith('.zdnet.fr') ||
    host === 'begeek.fr' ||
    host.endsWith('.begeek.fr')
  ) {
    out = removeDuplicateArticleChrome(out);
    out = removeTaggedBlocksByClassFragment(out, 'div', 'nexus-insert');
    out = out.replace(/<div\b[^>]*\bid=["']hit-inc-[^"']*["'][^>]*>\s*<\/div>/gi, '');
  }
  if (host === 'consomac.fr' || host.endsWith('.consomac.fr')) {
    /*
     * Dépêches : #newscontent + teaser .texteanalyseproduit à retirer.
     * Fiches produit : le corps EST .texteanalyseproduit — ne pas le supprimer
     * si #newscontent est absent du fragment.
     */
    if (/id=["']newscontent["']/i.test(out)) {
      out = removeConsomacProductTeasers(out);
    }
  }
  if (host === 'iphonesoft.fr' || host.endsWith('.iphonesoft.fr')) {
    out = removeIphonesoftChrome(out);
  }
  out = removeAuthorAvatarImages(out);
  out = removeSocialShareBlocks(out);
  return out;
}

export function cleanArticleHtml(html: string, pageUrl?: string): string {
  if (!html || html.trim().length < 12) return html;
  let out = removeHtmlComments(html);
  out = prepareArticleImagesForRn(out, pageUrl);
  out = removeBalancedTagBlocks(out, 'aside');
  out = removeBalancedTagBlocks(out, 'nav');
  out = removeBalancedTagBlocks(out, 'form');
  out = removeBalancedTagBlocks(out, 'footer');
  out = removeBalancedTagBlocks(out, 'svg');
  out = removeNoiseClassBlockElements(out);
  out = removePartnerAdBlocksByUrl(out);
  out = removeMobileDigestOuterBlocks(out);
  out = removeDigestSectionTitleDivs(out);
  out = removeDigestHeadingBlocks(out);
  out = removeDigestLikeShortDivBlocks(out);
  out = removeNoiseParagraphs(out);
  /* Les Numériques : encart produit <article class="pr__i-pr…"> + images de notes orphelines */
  out = removeTaggedBlocksByClassFragment(out, 'article', 'pr__i-pr');
  /* Bandeau « Ajoutez-nous à vos favoris Google » (<span class="… is--gg …">…) */
  out = removeTaggedBlocksByClassFragment(out, 'span', 'is--gg');
  /* Les Numériques : boutons sociaux flottants (icônes FB/X/…) */
  out = removeTaggedBlocksByClassFragment(out, 'span', 'ln__a-btn-s');
  out = removeRatingDecorationImages(out);
  out = removeGoogleLogoDecorationImages(out);
  out = removeCommentRatingBlocksById(out);
  /* seconde passe : blocs imbriqués ou classes révélées après coupes */
  out = removeNoiseClassBlockElements(out);
  out = removePartnerAdBlocksByUrl(out);
  out = removeCommentRatingBlocksById(out);
  out = removePooolWidgetPlaceholder(out);
  out = applyHostArticleCleaning(out, pageUrl);
  out = collapseWhitespace(out);
  return out;
}
