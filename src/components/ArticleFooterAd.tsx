import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { APP_AD_CONFIG } from '../constants/appAds';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { shouldUseGoogleTestAdIds } from '../utils/admobTestIds';
import { loadGoogleMobileAds } from '../utils/googleMobileAdsModule';
import { getMobileAdsReady } from '../utils/mobileAdsInit';

type NativeAdInstance = import('react-native-google-mobile-ads').NativeAd;

type Props = {
  /** Recharge l’annonce quand l’article change. */
  reloadKey: string;
};

/**
 * Annonce native avancée AdMob en fin d’article (défilement, après le texte).
 * Bloc « Intégré » — `admobArticleNativeUnitId` dans `appAds.ts`.
 */
export function ArticleFooterAd({ reloadKey }: Props) {
  const { palette } = useAppSettings();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [mobileAdsReady, setMobileAdsReady] = useState(false);
  const [nativeAd, setNativeAd] = useState<NativeAdInstance | null>(null);
  const [loading, setLoading] = useState(true);

  const adsModule = useMemo(() => loadGoogleMobileAds(), []);
  const contentWidth = Math.max(200, Math.round(windowWidth - spacing.md * 2));
  const mediaHeight = Math.min(200, Math.round((contentWidth * 9) / 16));

  const unitId = useMemo(() => {
    if (!adsModule) return APP_AD_CONFIG.admobArticleNativeUnitId;
    if (shouldUseGoogleTestAdIds()) {
      return adsModule.TestIds.NATIVE;
    }
    return APP_AD_CONFIG.admobArticleNativeUnitId;
  }, [adsModule]);

  useEffect(() => {
    if (!adsModule) return;
    void getMobileAdsReady().then(() => setMobileAdsReady(true));
  }, [adsModule]);

  useEffect(() => {
    if (!adsModule || !mobileAdsReady) return;

    const {
      NativeAd,
      NativeMediaAspectRatio,
    } = adsModule;

    let cancelled = false;
    let loaded: NativeAdInstance | null = null;

    setLoading(true);
    setNativeAd(null);

    void NativeAd.createForAdRequest(unitId, {
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      startVideoMuted: true,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        loaded = ad;
        setNativeAd(ad);
      })
      .catch(() => {
        if (!cancelled) setNativeAd(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [adsModule, mobileAdsReady, unitId, reloadKey]);

  if (!adsModule) return null;

  if (loading) {
    return (
      <View style={[styles.wrap, { borderTopColor: palette.border }]}>
        <ActivityIndicator color={palette.textMuted} style={styles.loader} />
      </View>
    );
  }

  if (!nativeAd) return null;

  const {
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
  } = adsModule;

  return (
    <View style={[styles.wrap, { borderTopColor: palette.border }]}>
      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        <Text style={styles.attribution}>Publicité</Text>
        <NativeMediaView
          resizeMode="cover"
          style={[styles.media, { width: contentWidth, height: mediaHeight }]}
        />
        <View style={styles.textBlock}>
          {nativeAd.icon ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image
                source={{ uri: nativeAd.icon.url }}
                width={40}
                height={40}
                style={styles.icon}
              />
            </NativeAsset>
          ) : null}
          <View style={styles.copy}>
            {nativeAd.headline ? (
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.headline} numberOfLines={2}>
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
            ) : null}
            {nativeAd.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.body} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            ) : null}
          </View>
        </View>
        {nativeAd.advertiser ? (
          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text style={styles.advertiser} numberOfLines={1}>
              {nativeAd.advertiser}
            </Text>
          </NativeAsset>
        ) : null}
        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta}>{nativeAd.callToAction}</Text>
          </NativeAsset>
        ) : null}
      </NativeAdView>
    </View>
  );
}

function createStyles(palette: import('../constants/theme').AppPalette) {
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.xl,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    loader: {
      paddingVertical: spacing.lg,
    },
    card: {
      width: '100%',
      paddingTop: spacing.xs,
    },
    attribution: {
      ...typography.caption,
      fontSize: 11,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: palette.textMuted,
      marginBottom: spacing.sm,
    },
    media: {
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: spacing.sm,
      backgroundColor: palette.surfaceElevated,
    },
    textBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    icon: {
      borderRadius: 8,
      backgroundColor: palette.surfaceElevated,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    headline: {
      ...typography.subtitle,
      color: palette.text,
      fontSize: 15,
      marginBottom: 4,
    },
    body: {
      ...typography.caption,
      color: palette.textMuted,
      lineHeight: 18,
    },
    advertiser: {
      ...typography.caption,
      color: palette.textMuted,
      marginTop: spacing.xs,
    },
    cta: {
      ...typography.caption,
      color: palette.accentMuted,
      fontWeight: '600',
      marginTop: spacing.sm,
    },
  });
}
