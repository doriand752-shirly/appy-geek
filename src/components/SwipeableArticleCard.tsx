import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

import { ArticleCard } from './ArticleCard';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import type { ParsedArticle } from '../types/article';

type Props = {
  article: ParsedArticle;
  read: boolean;
  favorite: boolean;
  selectionMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onLongPress: () => void;
  onToggleSelect: () => void;
  onToggleFavorite: () => void;
  onMarkRead: () => void;
  onOpenSource?: () => void;
};

export function SwipeableArticleCard({
  article,
  read,
  favorite,
  selectionMode,
  selected,
  onOpen,
  onLongPress,
  onToggleSelect,
  onToggleFavorite,
  onMarkRead,
  onOpenSource,
}: Props) {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-120, 0],
      outputRange: [1, 0.6],
      extrapolate: 'clamp',
    });
    return (
      <RectButton
        style={styles.swipeRead}
        onPress={() => {
          swipeRef.current?.close();
          onMarkRead();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="checkmark-circle-outline" size={26} color={palette.onAccent} />
          <Text style={styles.swipeLabel}>Lu</Text>
        </Animated.View>
      </RectButton>
    );
  };

  const card = (
    <View style={[styles.row, selectionMode && selected && styles.rowSelected]}>
      {selectionMode ? (
        <Pressable
          onPress={onToggleSelect}
          hitSlop={8}
          style={({ pressed }) => [styles.selectCol, pressed && { opacity: 0.85 }]}
          accessibilityLabel={selected ? 'Désélectionner' : 'Sélectionner'}
        >
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? palette.accent : palette.textMuted}
          />
        </Pressable>
      ) : null}
      <View style={styles.cardFlex}>
        <ArticleCard
          article={article}
          read={read}
          favorite={favorite}
          highlighted={selectionMode && selected}
          onPress={selectionMode ? onToggleSelect : onOpen}
          onLongPress={selectionMode ? undefined : onLongPress}
          onToggleFavorite={onToggleFavorite}
          onOpenSource={onOpenSource}
        />
      </View>
    </View>
  );

  if (selectionMode) {
    return card;
  }

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={48}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {card}
    </Swipeable>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    rowSelected: {
      opacity: 1,
    },
    selectCol: {
      justifyContent: 'center',
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    cardFlex: { flex: 1 },
    swipeRead: {
      backgroundColor: palette.accent,
      justifyContent: 'center',
      alignItems: 'center',
      width: 88,
      marginBottom: spacing.sm,
      marginRight: spacing.md,
      borderRadius: 14,
    },
    swipeLabel: {
      ...typography.caption,
      color: palette.onAccent,
      marginTop: 4,
      fontWeight: '600' as const,
    },
  });
}
