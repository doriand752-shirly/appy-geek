import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';

type Props = {
  selectedCount: number;
  onClose: () => void;
  onMarkRead: () => void;
  /** Barre en surimpression en haut de l’écran (pas dans la liste). */
  floating?: boolean;
  /** Sur un écran avec barre de navigation native, mettre à false. */
  useTopSafeArea?: boolean;
};

export function ArticleSelectionBar({
  selectedCount,
  onClose,
  onMarkRead,
  floating = false,
  useTopSafeArea = true,
}: Props) {
  const { palette } = useAppSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const bar = (
    <View style={styles.bar}>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityLabel="Quitter le mode sélection"
        style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="close" size={24} color={palette.text} />
      </Pressable>
      <Text style={styles.label}>
        {selectedCount === 0
          ? 'Sélectionnez des articles'
          : `${selectedCount} sélectionné${selectedCount > 1 ? 's' : ''}`}
      </Text>
      <Pressable
        onPress={onMarkRead}
        disabled={selectedCount === 0}
        style={({ pressed }) => [
          styles.actionBtn,
          selectedCount === 0 && styles.actionBtnDisabled,
          pressed && selectedCount > 0 && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="checkmark-done-outline" size={18} color={palette.onAccent} />
        <Text style={styles.actionText}>Lu</Text>
      </Pressable>
    </View>
  );

  if (!floating) {
    return bar;
  }

  return (
    <View
      style={[
        styles.floatingWrap,
        { paddingTop: (useTopSafeArea ? insets.top : 0) + spacing.xs },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.floatingShadow} pointerEvents="auto">
        {bar}
      </View>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    floatingWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingHorizontal: spacing.md,
    },
    floatingShadow: {
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
        },
        android: { elevation: 12 },
      }),
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
      backgroundColor: palette.surfaceSelected,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.accent,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    label: {
      ...typography.body,
      color: palette.text,
      flex: 1,
      fontSize: 14,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      backgroundColor: palette.accent,
    },
    actionBtnDisabled: {
      opacity: 0.45,
    },
    actionText: {
      ...typography.caption,
      color: palette.onAccent,
      fontWeight: '600' as const,
    },
  });
}
