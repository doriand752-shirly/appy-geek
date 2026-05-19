/**
 * AdMob — aligné sur la console (SDK Google Mobile Ads).
 *
 * | Élément console | Valeur |
 * | --- | --- |
 * | ID d’application (Appi Geek) | `ca-app-pub-5892183761290562~9981862026` → `app.json` (plugin Android + iOS) |
 * | Bloc « minipub » (bannière) | `ca-app-pub-5892183761290562/6312483860` → `admobBannerUnitId` |
 * | Bloc « Intégré » (natif avancé) | `ca-app-pub-5892183761290562/1483337163` → `admobArticleNativeUnitId` |
 *
 * Emplacements :
 * - Bannière ancrée adaptative au-dessus des onglets — `BottomAdStrip`
 * - Natif avancé en fin d’article (lecteur) — `ArticleFooterAd`
 *
 * En `__DEV__`, **TestIds** Google sauf si `useProductionAdsInDev` est à `true`.
 *
 * Builds **EAS `preview` / `development`** : variable `EXPO_PUBLIC_ADMOB_USE_TEST_IDS=1` dans `eas.json`
 * pour toujours charger la bannière de **test Google** sur émulateur / sans inventaire réel.
 * Retire-la sur le profil `preview` si tu veux tester l’unit production en internal.
 * Respect des [Règles AdMob](https://support.google.com/admob/answer/6128543) : pas de libellés
 * trompeurs, pas d’incitation aux clics, emplacement cohérent avec le contenu.
 */
export const APP_AD_CONFIG = {
  /** Bloc « minipub » — bannière (barre d’onglets) */
  admobBannerUnitId: 'ca-app-pub-5892183761290562/6312483860',

  /** Fin d’article — format natif avancé « Intégré » (console AdMob). */
  admobArticleNativeUnitId: 'ca-app-pub-5892183761290562/1483337163',

  /** Uniquement si tu dois valider les unit IDs avec un build de dev (sinon laisser false). */
  useProductionAdsInDev: false,

  /** Première ouverture : 1 = toujours montrer l’emplacement bannière (recommandé pour une pub bas d’écran). */
  initialShowProbability: 1,
  /** À chaque passage de la minuterie si l’utilisateur a fermé l’encart */
  periodicShowProbability: 0.35,
  /** Intervalle entre deux tirages (ms) */
  periodicIntervalMs: 9 * 60 * 1000,

  /** Fallback Expo Go (pas de module natif AdMob) */
  fallbackUrl: 'https://expo.dev',
  fallbackTitle: 'Soutenir l’application',
} as const;
