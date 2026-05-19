import { shouldSkipNativeAds } from './shouldUseNativeAds';

export type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

/** Pas d’import statique : obligatoire pour Expo Go (pas de RNGoogleMobileAdsModule). */
export function loadGoogleMobileAds(): GoogleMobileAdsModule | null {
  if (shouldSkipNativeAds()) return null;
  try {
    return require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
  } catch {
    return null;
  }
}
