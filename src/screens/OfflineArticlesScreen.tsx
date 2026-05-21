import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { formatReadTime } from '../utils/estimateReadTime';
import { formatRelative } from '../utils/formatTime';
import { listCachedArticles, type CachedArticleRecord } from '../utils/offlineCache';

type Props = NativeStackScreenProps<RootStackParamList, 'OfflineArticles'>;

export function OfflineArticlesScreen({ navigation }: Props) {
  const { palette } = useAppSettings();
  const { markRead } = useFeeds();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [items, setItems] = useState<CachedArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await listCachedArticles();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void load();
    });
    return unsub;
  }, [navigation, load]);

  const openArticle = useCallback(
    (record: CachedArticleRecord) => {
      const { article } = record;
      if (!article.link) return;
      void markRead(article.id);
      navigation.navigate('ArticleReader', {
        articleId: article.id,
        url: article.link,
        title: article.title,
        offlineHtml: record.html,
      });
    },
    [markRead, navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.article.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={44} color={palette.textMuted} />
              <Text style={styles.emptyText}>
                Aucun article enregistré pour l’instant. Vérifiez que l’option est activée dans les
                paramètres, puis tirez pour actualiser l’accueil et attendez la fin de
                l’enregistrement (indicateur dans les paramètres).
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const { article } = item;
            const readTime = formatReadTime(article);
            return (
              <Pressable
                onPress={() => void openArticle(item)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.feed}>{article.feedTitle}</Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <Text style={styles.meta}>
                    {readTime ? `${readTime} · ` : ''}
                    {formatRelative(article.publishedAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    list: { padding: spacing.md, paddingBottom: spacing.xl },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    emptyText: { ...typography.body, color: palette.textMuted, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: 14,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      gap: spacing.sm,
    },
    rowText: { flex: 1 },
    feed: { ...typography.caption, color: palette.accentMuted, marginBottom: 4 },
    title: { ...typography.subtitle, color: palette.text, marginBottom: 4 },
    meta: { ...typography.caption, color: palette.textMuted },
  });
}
