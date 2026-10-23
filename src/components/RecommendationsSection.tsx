import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import type { ParsedArticle } from '../types/article';
import { formatRelative } from '../utils/formatTime';
import {
  buildRecommendations,
  type RecommendedArticle,
} from '../utils/recommendations';

type Props = {
  articles: ParsedArticle[];
  readIds: Set<string>;
  favoriteIds: Set<string>;
  onOpen: (article: ParsedArticle) => void;
};

export function RecommendationsSection({
  articles,
  readIds,
  favoriteIds,
  onOpen,
}: Props) {
  const { palette, customThemes } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const items = useMemo(
    () =>
      buildRecommendations({
        articles,
        readIds,
        favoriteIds,
        customThemes,
        limit: 8,
      }),
    [articles, readIds, favoriteIds, customThemes],
  );

  if (items.length < 2) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="sparkles-outline" size={16} color={palette.accentMuted} />
        <Text style={styles.sectionTitle}>{t('recommendations.title')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.map((item) => (
          <RecoCard key={item.article.id} item={item} styles={styles} palette={palette} onOpen={onOpen} />
        ))}
      </ScrollView>
    </View>
  );
}

function RecoCard({
  item,
  styles,
  palette,
  onOpen,
}: {
  item: RecommendedArticle;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  onOpen: (article: ParsedArticle) => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => onOpen(item.article)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.reason} numberOfLines={1}>
        {item.reason}
      </Text>
      <Text style={styles.feed} numberOfLines={1}>
        {item.article.feedTitle}
      </Text>
      <Text style={styles.title} numberOfLines={3}>
        {item.article.title}
      </Text>
      <Text style={styles.meta}>{formatRelative(item.article.publishedAt)}</Text>
      <View style={styles.ctaRow}>
        <Text style={[styles.cta, { color: palette.accent }]}>{t('featured.readCta')}</Text>
        <Ionicons name="chevron-forward" size={16} color={palette.accentMuted} />
      </View>
    </Pressable>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: palette.textMuted,
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    scroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
    card: {
      width: 240,
      padding: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    reason: { ...typography.caption, color: palette.accentMuted, marginBottom: 4, fontWeight: '600' },
    feed: { ...typography.caption, color: palette.textMuted, marginBottom: 4 },
    title: { ...typography.subtitle, color: palette.text, fontSize: 15, flex: 1 },
    meta: { ...typography.caption, color: palette.textMuted, marginTop: spacing.sm },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      gap: 2,
    },
    cta: { ...typography.caption, fontWeight: '600' },
  });
}
