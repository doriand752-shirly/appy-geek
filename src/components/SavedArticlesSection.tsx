import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import { formatRelative } from '../utils/formatTime';
import { listCachedArticles, type CachedArticleRecord } from '../utils/offlineCache';

const PREVIEW_LIMIT = 6;

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Accueil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  onOpenArticle: (record: CachedArticleRecord) => void;
};

export function SavedArticlesSection({ onOpenArticle }: Props) {
  const navigation = useNavigation<Nav>();
  const { palette, offlineCacheEnabled } = useAppSettings();
  const { offlineCachedCount } = useFeeds();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [items, setItems] = useState<CachedArticleRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!offlineCacheEnabled) {
      setItems([]);
      return;
    }
    setLoading(true);
    const list = await listCachedArticles();
    setItems(list.slice(0, PREVIEW_LIMIT));
    setLoading(false);
  }, [offlineCacheEnabled]);

  useEffect(() => {
    void load();
  }, [load, offlineCachedCount]);

  const openAll = useCallback(() => {
    navigation.navigate('OfflineArticles');
  }, [navigation]);

  if (!offlineCacheEnabled) return null;
  if (!loading && items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Articles sauvegardés</Text>
        <Pressable onPress={openAll} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.75 }}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator color={palette.accent} style={styles.loader} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {items.map((item) => (
            <Pressable
              key={item.article.id}
              onPress={() => onOpenArticle(item)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.feed} numberOfLines={1}>
                {item.article.feedTitle}
              </Text>
              <Text style={styles.title} numberOfLines={3}>
                {item.article.title}
              </Text>
              <Text style={styles.meta}>{formatRelative(item.article.publishedAt)}</Text>
            </Pressable>
          ))}
          {offlineCachedCount > PREVIEW_LIMIT ? (
            <Pressable
              onPress={openAll}
              style={({ pressed }) => [styles.moreCard, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="chevron-forward" size={28} color={palette.accent} />
              <Text style={styles.moreText}>
                +{offlineCachedCount - PREVIEW_LIMIT} autre
                {offlineCachedCount - PREVIEW_LIMIT > 1 ? 's' : ''}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    seeAll: { ...typography.caption, color: palette.accent, fontWeight: '600' as const },
    loader: { marginVertical: spacing.md },
    scroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
    card: {
      width: 220,
      padding: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    feed: { ...typography.caption, color: palette.accentMuted, marginBottom: 4 },
    title: { ...typography.subtitle, color: palette.text, fontSize: 15, flex: 1 },
    meta: { ...typography.caption, color: palette.textMuted, marginTop: spacing.sm },
    moreCard: {
      width: 120,
      padding: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    moreText: { ...typography.caption, color: palette.accent, textAlign: 'center' },
  });
}
