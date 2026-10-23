/**
 * Pin Google-Mobile-Ads-SDK to a version with official iOS 27 + iPhone Duo support.
 * react-native-google-mobile-ads@17.0 ships 13.6.0; 13.11.0+ is required for iOS 27.
 * Invertase reads $RNGoogleMobileAdsSDKVersion / RNGMA_IOS_GOOGLE_MOBILE_ADS_SDK_VERSION.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# with-admob-ios-sdk';
const GMA_IOS = '13.11.0';

function withAdmobIosSdk(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) {
        return cfg;
      }

      const preamble = `${MARKER}\n$RNGoogleMobileAdsSDKVersion = '${GMA_IOS}'\n`;
      contents = preamble + contents;
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = withAdmobIosSdk;
