import { InteractionManager } from 'react-native';

import { shouldSkipNativeAds } from './shouldUseNativeAds';

let readyPromise: Promise<void> | null = null;

/**
 * Initialise Google Mobile Ads une seule fois (partagé entre bootstrap et bannière).
 * Différé après le premier paint pour éviter les crashes TurboModule au cold start
 * (signal battery / iOS 27 + GMA < 13.10).
 */
export function getMobileAdsReady(): Promise<void> {
  if (shouldSkipNativeAds()) {
    return Promise.resolve();
  }
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      const start = () => {
        try {
          const mobileAds = require('react-native-google-mobile-ads').default as () => {
            initialize: () => Promise<unknown>;
          };
          void mobileAds()
            .initialize()
            .then(() => resolve())
            .catch(() => resolve());
        } catch {
          resolve();
        }
      };
      InteractionManager.runAfterInteractions(() => {
        setTimeout(start, 400);
      });
    });
  }
  return readyPromise;
}
