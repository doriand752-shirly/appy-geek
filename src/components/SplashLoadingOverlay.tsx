import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BRAND } from '../constants/brand';
import type { AppPalette } from '../constants/theme';
import { spacing } from '../constants/theme';
import { useTranslation } from '../i18n';

import { AppigeekLogoMark } from './AppigeekLogo';
import { AppigeekWordmark } from './AppigeekWordmark';

type SplashLoadingOverlayProps = {
  visible: boolean;
  /** Progression 0–1 */
  progress: number;
  palette: AppPalette;
};

const LOGO_SIZE = 88;
const BAR_HEIGHT = 4;
const BAR_MAX_WIDTH = 220;

export const SplashLoadingOverlay = memo(function SplashLoadingOverlay({
  visible,
  progress,
  palette,
}: SplashLoadingOverlayProps) {
  const { t } = useTranslation();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 0 : 220,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_MAX_WIDTH],
  });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.overlay,
        { backgroundColor: palette.bg ?? BRAND.canvasDark, opacity: opacityAnim },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('home.loadingArticles')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <View style={styles.center}>
        <AppigeekLogoMark size={LOGO_SIZE} />
        <View style={styles.wordmark}>
          <AppigeekWordmark palette={palette} />
        </View>
      </View>

      <View
        style={[styles.barTrack, { backgroundColor: palette.border }]}
        accessibilityElementsHidden
      >
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barWidth,
              backgroundColor: palette.accent,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  wordmark: {
    marginTop: spacing.md,
  },
  barTrack: {
    position: 'absolute',
    bottom: '22%',
    width: BAR_MAX_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
});
