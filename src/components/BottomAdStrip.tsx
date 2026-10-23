import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { APP_AD_CONFIG } from '../constants/appAds';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import { getMobileAdsReady } from '../utils/mobileAdsInit';
import { shouldUseGoogleTestAdIds } from '../utils/admobTestIds';
import { loadGoogleMobileAds } from '../utils/googleMobileAdsModule';

/**
 * Fine bande au-dessus de la tab bar : bannière AdMob uniquement si une annonce se charge.
 */
export function BottomAdStrip() {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [slotEligible, setSlotEligible] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [mobileAdsReady, setMobileAdsReady] = useState(false);
  const rolledInitial = useRef(false);

  const adsModule = useMemo(() => loadGoogleMobileAds(), []);
  const bannerWidth = Math.max(200, Math.round(windowWidth - CLOSE_BTN_WIDTH));

  const unitId = useMemo(() => {
    if (!adsModule) return APP_AD_CONFIG.admobBannerUnitId;
    if (shouldUseGoogleTestAdIds()) {
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
      setSlotEligible(true);
    }
  }, []);

  useEffect(() => {
    if (!slotEligible) setAdLoaded(false);
  }, [slotEligible]);

  useEffect(() => {
    const id = setInterval(() => {
      setSlotEligible((was) => {
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

  if (!slotEligible) return null;

  if (adsModule) {
    if (!mobileAdsReady) return null;
    const { BannerAd, BannerAdSize } = adsModule;
    return (
      <View
        style={[
          styles.nativeRow,
          { backgroundColor: palette.surface, borderTopColor: palette.border },
          !adLoaded && styles.collapsed,
        ]}
        pointerEvents={adLoaded ? 'auto' : 'none'}
      >
        <View style={styles.bannerWrap}>
          <BannerAd
            unitId={unitId}
            width={bannerWidth}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdLoaded={() => setAdLoaded(true)}
            onAdFailedToLoad={() => setSlotEligible(false)}
          />
        </View>
        {adLoaded ? (
          <Pressable
            onPress={() => setSlotEligible(false)}
            hitSlop={10}
            accessibilityLabel={t('ad.hideA11y')}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color={palette.textMuted} />
          </Pressable>
        ) : null}
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
        accessibilityLabel={t('ad.fallbackA11y', { title: t('ad.fallbackTitle') })}
      >
        <Text style={[styles.badge, { color: palette.textMuted }]}>{t('ad.label')}</Text>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {t('ad.fallbackTitle')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setSlotEligible(false)}
        hitSlop={10}
        accessibilityLabel={t('ad.hideA11y')}
        style={styles.closeBtn}
      >
        <Ionicons name="close" size={22} color={palette.textMuted} />
      </Pressable>
    </View>
  );
}

const CLOSE_BTN_WIDTH = 52;

const styles = StyleSheet.create({
  collapsed: {
    height: 0,
    minHeight: 0,
    overflow: 'hidden',
    opacity: 0,
    borderTopWidth: 0,
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
