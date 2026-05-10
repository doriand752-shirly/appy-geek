import { memo, useId } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BRAND_GRADIENT } from '../constants/brand';

type AppigeekLogoMarkProps = {
  /** Côté du carré (px). Défaut 44. */
  size?: number;
};

/**
 * Monogramme AG : fond en dégradé (SVG) + lettres en Text natif.
 * Les traits SVG se brouillaient en petit ; le texte système reste net sur Expo Go.
 */
export const AppigeekLogoMark = memo(function AppigeekLogoMark({
  size = 44,
}: AppigeekLogoMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `agBg_${uid}`;
  const fs = Math.round(size * 0.4 * 10) / 10;
  const overlap = fs * 0.2;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel="Appigeek"
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={BRAND_GRADIENT[0]} />
            <Stop offset="50%" stopColor={BRAND_GRADIENT[1]} />
            <Stop offset="100%" stopColor={BRAND_GRADIENT[2]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} rx={23} fill={`url(#${gradId})`} />
      </Svg>

      <View style={[styles.overlay, { borderRadius: size * 0.23 }]}>
        <View style={styles.row}>
          <Text
            style={[styles.letter, { fontSize: fs }]}
            allowFontScaling={false}
          >
            A
          </Text>
          <Text
            style={[styles.letter, { fontSize: fs, marginLeft: -overlap }]}
            allowFontScaling={false}
          >
            G
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: -0.5,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
