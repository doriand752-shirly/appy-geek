import { APP_AD_CONFIG } from '../constants/appAds';

/** Annonces de test Google (dev / EXPO_PUBLIC_ADMOB_USE_TEST_IDS). */
export function shouldUseGoogleTestAdIds(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !APP_AD_CONFIG.useProductionAdsInDev) {
    return true;
  }
  return process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS === '1';
}
