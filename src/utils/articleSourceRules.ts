/**
 * Règles par domaine : extraction du corps, extraits RSS seulement, nettoyage ciblé.
 */

export type ArticleSourceRule = {
  /** Hôtes normalisés (sans www.) */
  hosts: string[];
  /** Le flux ne livre qu’un extrait — toujours récupérer la page */
  excerptOnly?: boolean;
  /** IDs HTML à cibler en priorité pour l’extraction */
  extractIds?: string[];
  /** Classes CSS additionnelles pour l’extraction */
  extractClasses?: string[];
};

export const ARTICLE_SOURCE_RULES: ArticleSourceRule[] = [
  {
    hosts: ['consomac.fr'],
    excerptOnly: true,
    /* News : #newscontent. Fiches produit : .texteanalyseproduit (secours). */
    extractIds: ['newscontent'],
    extractClasses: ['texteanalyseproduit'],
  },
  {
    hosts: ['iphon.fr'],
    excerptOnly: true,
    extractIds: ['mvp-content-main'],
    extractClasses: ['mvp-content-main'],
  },
  {
    hosts: ['phonandroid.com'],
    excerptOnly: true,
    extractIds: ['jarticleinside'],
  },
  {
    hosts: ['begeek.fr'],
    excerptOnly: true,
    extractClasses: ['article__body', 'content-container'],
  },
  {
    hosts: ['zdnet.fr'],
    excerptOnly: true,
    extractIds: ['content'],
    extractClasses: ['cn__p-pb__ar', 'cnzd__lyt__article'],
  },
  {
    hosts: ['tomshardware.fr', 'tomsguide.fr'],
    excerptOnly: true,
    extractClasses: ['article__body', 'article__content', 'td-post-content'],
  },
  {
    hosts: ['android-mt.com', 'android-mt.ouest-france.fr'],
    excerptOnly: true,
    extractClasses: ['post-content', 'entry-content'],
  },
  {
    hosts: ['iphonesoft.fr'],
    excerptOnly: true,
    /* Le corps est dans #content (pas entry-content WP). */
    extractIds: ['content'],
    extractClasses: ['entry-content', 'post-content', 'article-content'],
  },
  {
    hosts: ['clubic.com'],
    excerptOnly: true,
    extractClasses: ['article-content', 'content-article', 'entry-content'],
  },
  {
    hosts: ['macg.co', 'mac4ever.com'],
    excerptOnly: false,
    extractClasses: ['article-body', 'entry-content', 'post-content'],
  },
];

const EXCERPT_ONLY_HOSTS = new Set(
  ARTICLE_SOURCE_RULES.filter((r) => r.excerptOnly).flatMap((r) => r.hosts),
);

export function hostFromArticleUrl(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

export function ruleForHost(host: string | null | undefined): ArticleSourceRule | null {
  if (!host) return null;
  const h = host.toLowerCase();
  return ARTICLE_SOURCE_RULES.find((r) => r.hosts.some((x) => h === x || h.endsWith(`.${x}`))) ?? null;
}

export function ruleForArticleUrl(url: string | undefined | null): ArticleSourceRule | null {
  return ruleForHost(hostFromArticleUrl(url));
}

export function isExcerptOnlyHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  return [...EXCERPT_ONLY_HOSTS].some((x) => h === x || h.endsWith(`.${x}`));
}

export function isExcerptOnlyArticleUrl(url: string | undefined | null): boolean {
  return isExcerptOnlyHost(hostFromArticleUrl(url));
}

export function extractionHintsForUrl(url: string | undefined | null): {
  ids: string[];
  classes: string[];
} {
  const rule = ruleForArticleUrl(url);
  return {
    ids: rule?.extractIds ?? [],
    classes: rule?.extractClasses ?? [],
  };
}
