import Constants from 'expo-constants';

let readyPromise: Promise<void> | null = null;

/**
 * Initialise Google Mobile Ads une seule fois (partagé entre bootstrap et bannière).
 */
export function getMobileAdsReady(): Promise<void> {
  if (Constants.executionEnvironment === 'storeClient') {
    return Promise.resolve();
  }
  if (!readyPromise) {
    try {
      const mobileAds = require('react-native-google-mobile-ads').default as () => {
        initialize: () => Promise<unknown>;
      };
      readyPromise = mobileAds().initialize().then(() => undefined);
    } catch {
      readyPromise = Promise.resolve();
    }
  }
  return readyPromise;
}
