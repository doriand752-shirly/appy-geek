import { useEffect } from 'react';

import { getMobileAdsReady } from '../utils/mobileAdsInit';

/**
 * Initialise Google Mobile Ads (build avec module natif uniquement).
 * Aucun import statique de `react-native-google-mobile-ads` : sinon Expo Go plante
 * (`RNGoogleMobileAdsModule` absent du binaire).
 */
export function MobileAdsBootstrap() {
  useEffect(() => {
    void getMobileAdsReady();
  }, []);
  return null;
}
