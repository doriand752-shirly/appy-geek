/**
 * Identité Appigeek — couleurs marque (indépendantes des thèmes UI).
 * Le logo conserve ce dégradé pour rester reconnaissable ; le wordmark « Geek »
 * utilise la palette courante (accent) à l’écran.
 */
export const BRAND = {
  name: 'Appigeek',
  /** Fallback FR — l’UI affiche `t('brand.tagline')`. */
  tagline: 'Votre veille geek, un flux à la fois',
  /** Dégradé signature du monogramme AG (icône app + logo in-app) */
  gradientStart: '#5b47e0',
  gradientMid: '#7c5cff',
  gradientEnd: '#9d7cff',
  /** Fond sombre historique (splash, prévisualisations) */
  canvasDark: '#0c0e14',
} as const;

export const BRAND_GRADIENT: readonly [string, string, string] = [
  BRAND.gradientStart,
  BRAND.gradientMid,
  BRAND.gradientEnd,
];
