import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { APP_AD_CONFIG } from '../constants/appAds';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { getMobileAdsReady } from '../utils/mobileAdsInit';

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

/** Pas d’import statique : obligatoire pour Expo Go (pas de RNGoogleMobileAdsModule). */
function loadGoogleMobileAds(): GoogleMobileAdsModule | null {
  if (Constants.executionEnvironment === 'storeClient') return null;
  try {
    return require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
  } catch {
    return null;
  }
}

/**
 * Fine bande au-dessus de la tab bar : bannière AdMob si le binaire inclut le SDK,
 * sinon lien « maison » (Expo Go ou échec du module).
 */
function useGoogleTestBannerAds(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !APP_AD_CONFIG.useProductionBannerInDev) {
    return true;
  }
  return process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS === '1';
}

export function BottomAdStrip() {
  const { palette } = useAppSettings();
  const { width: windowWidth } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [mobileAdsReady, setMobileAdsReady] = useState(false);
  const [adLoadFailed, setAdLoadFailed] = useState(false);
  const rolledInitial = useRef(false);

  const adsModule = useMemo(() => loadGoogleMobileAds(), []);
  const bannerWidth = Math.max(200, Math.round(windowWidth - CLOSE_BTN_WIDTH));

  const unitId = useMemo(() => {
    if (!adsModule) return APP_AD_CONFIG.admobBannerUnitId;
    if (useGoogleTestBannerAds()) {
      return adsModule.TestIds.BANNER;
    }
    return APP_AD_CONFIG.admobBannerUnitId;
  }, [adsModule]);

  useEffect(() => {
    if (!adsModule) {
      setMobileAdsReady(true);
      return;
    }
    void getMobileAdsReady().then(() => setMobileAdsReady(true));
  }, [adsModule]);

  useEffect(() => {
    if (rolledInitial.current) return;
    rolledInitial.current = true;
    if (Math.random() < APP_AD_CONFIG.initialShowProbability) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible((was) => {
        if (was) return was;
        return Math.random() < APP_AD_CONFIG.periodicShowProbability;
      });
    }, APP_AD_CONFIG.periodicIntervalMs);
    return () => clearInterval(id);
  }, []);

  const openFallbackAd = () => {
    void WebBrowser.openBrowserAsync(APP_AD_CONFIG.fallbackUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      enableBarCollapsing: true,
    });
  };

  if (!visible) return null;

  if (adsModule) {
    const { BannerAd, BannerAdSize } = adsModule;
    return (
      <View
        style={[
          styles.nativeRow,
          { backgroundColor: palette.surface, borderTopColor: palette.border },
        ]}
      >
        <View style={styles.bannerWrap}>
          {!mobileAdsReady ? (
            <ActivityIndicator color={palette.textMuted} style={styles.loader} />
          ) : adLoadFailed ? (
            <Text
              style={[styles.adPlaceholder, { color: palette.textMuted }]}
              numberOfLines={2}
            >
              Espace publicitaire — annonce indisponible pour le moment
            </Text>
          ) : (
            <BannerAd
              unitId={unitId}
              width={bannerWidth}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: false,
              }}
              onAdLoaded={() => setAdLoadFailed(false)}
              onAdFailedToLoad={() => setAdLoadFailed(true)}
            />
          )}
        </View>
        <Pressable
          onPress={() => setVisible(false)}
          hitSlop={10}
          accessibilityLabel="Masquer cette annonce"
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={22} color={palette.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, { backgroundColor: palette.surface, borderTopColor: palette.border }]}
    >
      <Pressable
        onPress={openFallbackAd}
        style={({ pressed }) => [styles.touch, pressed && { opacity: 0.92 }]}
        accessibilityRole="link"
        accessibilityLabel={`Publicité : ${APP_AD_CONFIG.fallbackTitle}`}
      >
        <Text style={[styles.badge, { color: palette.textMuted }]}>Publicité</Text>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {APP_AD_CONFIG.fallbackTitle}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setVisible(false)}
        hitSlop={10}
        accessibilityLabel="Masquer cette annonce"
        style={styles.closeBtn}
      >
        <Ionicons name="close" size={22} color={palette.textMuted} />
      </Pressable>
    </View>
  );
}

/** Largeur réservée au bouton fermer à droite (aligné sur le padding du bouton). */
const CLOSE_BTN_WIDTH = 52;

const styles = StyleSheet.create({
  adPlaceholder: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  nativeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  bannerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 50,
  },
  loader: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingLeft: spacing.md,
  },
  touch: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
  },
  badge: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
