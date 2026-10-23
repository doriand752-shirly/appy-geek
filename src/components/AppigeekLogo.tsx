import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

/** Icône App Store / écran d’accueil (`app.json` → `assets/icon.png`). */
export const APP_STORE_ICON = require('../../assets/icon.png');

type AppigeekLogoMarkProps = {
  /** Côté du carré (px). Défaut 44. */
  size?: number;
};

export const AppigeekLogoMark = memo(function AppigeekLogoMark({
  size = 44,
}: AppigeekLogoMarkProps) {
  return (
    <Image
      source={APP_STORE_ICON}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="Appigeek"
    />
  );
});
