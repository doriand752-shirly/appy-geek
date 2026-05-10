import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, Image as RNImage } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { remoteImageSource } from '../utils/remoteImageSource';

type Props = {
  label: string;
  imageUri?: string;
  count: number;
  cardWidth: number;
  onPress: () => void;
};

export function ThemeCard({ label, imageUri, count, cardWidth, onPress }: Props) {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const h = Math.round(cardWidth * 0.88);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.press,
        { width: cardWidth, minHeight: h },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.frame, { height: h }]}>
        {imageUri ? (
          <RNImage
            source={remoteImageSource(imageUri)}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="folder-outline" size={36} color={palette.accentMuted} />
          </View>
        )}
        <View style={styles.scrim} />
        <View style={styles.bottom}>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    press: {
      marginBottom: spacing.sm,
    },
    pressed: { opacity: 0.92 },
    frame: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    placeholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8,10,16,0.45)',
    },
    bottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    label: {
      ...typography.subtitle,
      color: palette.themeCardTitle,
      flex: 1,
      fontSize: 14,
      textShadowColor: 'rgba(0,0,0,0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    badge: {
      backgroundColor: palette.accent,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeText: {
      ...typography.caption,
      fontWeight: '700',
      color: palette.onAccent,
      fontSize: 12,
    },
  });
}
