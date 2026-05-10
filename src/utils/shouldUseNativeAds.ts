import Constants from 'expo-constants';

/**
 * Expo Go ne livre pas `react-native-google-mobile-ads` côté natif.
 * `appOwnership === 'expo'` est la détection la plus fiable ; `storeClient`
 * reste gardé pour les anciennes combinaisons SDK.
 */
export function shouldSkipNativeAds(): boolean {
  if (Constants.appOwnership === 'expo') return true;
  return Constants.executionEnvironment === 'storeClient';
}
