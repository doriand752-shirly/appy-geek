import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import type { ParsedArticle } from '../types/article';
import { formatRelative } from '../utils/formatTime';

type Props = {
  article: ParsedArticle;
  read: boolean;
  onOpen: () => void;
};

export function ArticleCard({ article, read, onOpen }: Props) {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const disabled = !article.link;
  return (
    <Pressable
      onPress={onOpen}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        pressed && !disabled && styles.pressed,
        read && styles.readCard,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.feedTag, read && styles.muted]} numberOfLines={1}>
          {article.feedTitle}
        </Text>
        <Text style={styles.time}>{formatRelative(article.publishedAt)}</Text>
      </View>
      <Text style={[styles.title, read && styles.readTitle]} numberOfLines={3}>
        {article.title}
      </Text>
      {article.summary ? (
        <Text style={[styles.summary, read && styles.muted]} numberOfLines={2}>
          {article.summary}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.cta}>{disabled ? 'Lien indisponible' : 'Lire l’article'}</Text>
        {!disabled ? (
          <Ionicons name="chevron-forward" size={18} color={palette.accentMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderRadius: 14,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
    },
    pressed: { opacity: 0.92 },
    readCard: { opacity: 0.72 },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    feedTag: {
      ...typography.caption,
      color: palette.accentMuted,
      flex: 1,
    },
    time: { ...typography.caption, color: palette.textMuted },
    title: { ...typography.subtitle, color: palette.text, marginBottom: spacing.xs },
    readTitle: { fontWeight: '500' as const },
    summary: { ...typography.body, color: palette.textMuted, marginBottom: spacing.sm },
    muted: { color: palette.textMuted },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cta: { ...typography.caption, color: palette.accent },
  });
}
