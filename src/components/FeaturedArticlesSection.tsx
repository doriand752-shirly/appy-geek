import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { getCommentsApiConfig } from '../constants/commentsApi';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import { useFeeds } from '../context/FeedsContext';
import {
  fetchActiveFeaturedArticles,
  type FeaturedArticle,
} from '../services/featuredArticlesService';
import type { ParsedArticle } from '../types/article';
import { remoteImageSource } from '../utils/remoteImageSource';

type Props = {
  onOpen: (item: FeaturedArticle) => void;
  /** Compact home layout: smaller cards + section title style matching other sections */
  compact?: boolean;
};

function isFeaturedRead(
  item: FeaturedArticle,
  articles: ParsedArticle[],
  readIds: Set<string>,
): boolean {
  const match = articles.find((a) => a.link === item.articleUrl);
  if (match && readIds.has(match.id)) return true;
  if (readIds.has(`featured:${item.id}`)) return true;
  return false;
}

export function FeaturedArticlesSection({ onOpen, compact = false }: Props) {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  const { articles, readIds } = useFeeds();
  const styles = useMemo(() => createStyles(palette, compact), [palette, compact]);
  const [items, setItems] = useState<FeaturedArticle[]>([]);
  const [loading, setLoading] = useState(() => getCommentsApiConfig().enabled);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    if (!getCommentsApiConfig().enabled) {
      setItems([]);
      setLoadedOnce(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchActiveFeaturedArticles();
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = useMemo(
    () => items.filter((item) => !isFeaturedRead(item, articles, readIds)),
    [items, articles, readIds],
  );

  if (!loadedOnce && loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.headerBlock}>
          <Text style={styles.sectionTitle}>{t('featured.title')}</Text>
        </View>
        <ActivityIndicator color={palette.accent} style={styles.loader} />
      </View>
    );
  }

  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerBlock}>
        <Text style={styles.sectionTitle}>{t('featured.title')}</Text>
        {!compact ? <Text style={styles.subtitle}>{t('featured.badge')}</Text> : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="fast"
        snapToInterval={compact ? 228 : 292}
      >
        {visible.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={t('featured.readArticleA11y', { title: item.title })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.imageFrame}>
              {item.imageUrl ? (
                <RNImage
                  source={remoteImageSource(item.imageUrl)}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="newspaper-outline" size={compact ? 28 : 36} color={palette.accentMuted} />
                </View>
              )}
              <View style={styles.imageScrim} />
              <View style={styles.chip}>
                <Ionicons name="star" size={11} color={palette.onAccent} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {item.note?.trim() || t('featured.badge')}
                </Text>
              </View>
            </View>
            <View style={styles.body}>
              {item.feedTitle ? (
                <Text style={styles.feed} numberOfLines={1}>
                  {item.feedTitle}
                </Text>
              ) : null}
              <Text style={styles.title} numberOfLines={compact ? 2 : 3}>
                {item.title}
              </Text>
              <View style={styles.ctaRow}>
                <Text style={[styles.cta, { color: palette.accent }]}>{t('featured.readCta')}</Text>
                <Ionicons name="chevron-forward" size={16} color={palette.accent} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(palette: AppPalette, compact: boolean) {
  return StyleSheet.create({
    wrap: {
      marginBottom: compact ? spacing.sm : spacing.lg,
      paddingTop: spacing.xs,
    },
    headerBlock: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      gap: 4,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: palette.textMuted,
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    subtitle: {
      ...typography.caption,
      color: palette.textMuted,
    },
    loader: { marginVertical: spacing.md },
    scroll: {
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      paddingBottom: 2,
    },
    card: {
      width: compact ? 216 : 280,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: palette.surfaceElevated,
      borderWidth: compact ? 1 : 1.5,
      borderColor: compact ? palette.border : palette.accent,
    },
    cardPressed: { opacity: 0.92 },
    imageFrame: {
      height: compact ? 96 : 148,
      backgroundColor: palette.surface,
    },
    imagePlaceholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
    },
    imageScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.bg === '#ffffff' || palette.bg === '#fff'
        ? 'rgba(0,0,0,0.18)'
        : 'rgba(8,10,16,0.28)',
    },
    chip: {
      position: 'absolute',
      left: spacing.sm,
      top: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '88%',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: palette.accent,
    },
    chipText: {
      ...typography.caption,
      color: palette.onAccent,
      fontWeight: '700',
      fontSize: 11,
      flexShrink: 1,
    },
    body: {
      padding: compact ? spacing.sm : spacing.md,
      gap: 4,
      minHeight: compact ? 88 : 118,
    },
    feed: {
      ...typography.caption,
      color: palette.accentMuted,
      fontWeight: '600',
    },
    title: {
      ...typography.subtitle,
      color: palette.text,
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 19 : 22,
      flexGrow: 1,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
      gap: 2,
    },
    cta: { ...typography.caption, fontWeight: '700' },
  });
}
