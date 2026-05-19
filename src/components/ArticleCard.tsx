import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import type { ParsedArticle } from '../types/article';
import { formatReadTime } from '../utils/estimateReadTime';
import { formatRelative } from '../utils/formatTime';

type Props = {
  article: ParsedArticle;
  read: boolean;
  favorite?: boolean;
  highlighted?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleFavorite?: () => void;
  onOpenSource?: () => void;
};

export function ArticleCard({
  article,
  read,
  favorite = false,
  highlighted = false,
  onPress,
  onLongPress,
  onToggleFavorite,
  onOpenSource,
}: Props) {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const disabled = !article.link;
  const readTime = formatReadTime(article);

  const openSource = () => {
    if (onOpenSource) {
      onOpenSource();
      return;
    }
    if (!article.link) return;
    void WebBrowser.openBrowserAsync(article.link, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      enableBarCollapsing: true,
    });
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={disabled && !onLongPress}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.cardHighlighted,
        pressed && !disabled && styles.pressed,
        read && !highlighted && styles.readCard,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.feedTag, read && styles.muted]} numberOfLines={1}>
          {article.feedTitle}
        </Text>
        <View style={styles.topMeta}>
          {readTime ? <Text style={styles.readTime}>{readTime}</Text> : null}
          <Text style={styles.time}>{formatRelative(article.publishedAt)}</Text>
        </View>
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
        <View style={styles.actions}>
          {onToggleFavorite ? (
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={10}
              accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
            >
              <Ionicons
                name={favorite ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={favorite ? palette.accent : palette.textMuted}
              />
            </Pressable>
          ) : null}
          {article.link ? (
            <Pressable
              onPress={openSource}
              hitSlop={10}
              accessibilityLabel="Ouvrir sur le site source"
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name="open-outline" size={20} color={palette.textMuted} />
            </Pressable>
          ) : null}
          {!disabled ? (
            <Ionicons name="chevron-forward" size={18} color={palette.accentMuted} />
          ) : null}
        </View>
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
    cardHighlighted: {
      borderColor: palette.accent,
      backgroundColor: palette.surfaceSelected,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    feedTag: {
      ...typography.caption,
      color: palette.accentMuted,
      flex: 1,
    },
    topMeta: { alignItems: 'flex-end', gap: 2 },
    readTime: { ...typography.caption, color: palette.textMuted, fontSize: 11 },
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
    cta: { ...typography.caption, color: palette.accent, flex: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    iconBtn: { padding: 4 },
  });
}
