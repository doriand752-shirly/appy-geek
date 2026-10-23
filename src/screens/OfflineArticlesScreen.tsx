import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import { useTranslation } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { formatReadTime } from '../utils/estimateReadTime';
import { formatRelative } from '../utils/formatTime';
import { hapticLight } from '../utils/haptics';
import { listCachedArticles, type CachedArticleRecord } from '../utils/offlineCache';
import { isTabletSplitLayout } from '../utils/tabletLayout';
import { ArticleReaderContent } from './ArticleReaderScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'OfflineArticles'>;

type PaneArticle = {
  articleId: string;
  url: string;
  title: string;
};

export function OfflineArticlesScreen({ navigation }: Props) {
  const { palette } = useAppSettings();
  const { markRead, refresh, offlineSyncing } = useFeeds();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const split = isTabletSplitLayout(width);
  const wasSplitRef = useRef(split);
  const [items, setItems] = useState<CachedArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paneArticle, setPaneArticle] = useState<PaneArticle | null>(null);
  const [paneWidth, setPaneWidth] = useState(0);

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

  useEffect(() => {
    const wasSplit = wasSplitRef.current;
    wasSplitRef.current = split;
    if (wasSplit && !split && paneArticle) {
      const params = paneArticle;
      setPaneArticle(null);
      navigation.navigate('ArticleReader', params);
    }
  }, [split, paneArticle, navigation]);

  const onPullRefresh = useCallback(async () => {
    hapticLight();
    setRefreshing(true);
    try {
      await refresh();
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load, refresh]);

  const openArticle = useCallback(
    (record: CachedArticleRecord) => {
      const { article } = record;
      if (!article.link) return;
      void markRead(article.id);
      const params = {
        articleId: article.id,
        url: article.link,
        title: article.title,
      };
      if (split) {
        setPaneArticle(params);
        return;
      }
      navigation.navigate('ArticleReader', params);
    },
    [markRead, navigation, split],
  );

  const listPane = loading ? (
    <View style={styles.center}>
      <ActivityIndicator color={palette.accent} />
    </View>
  ) : (
    <FlatList
      key={split ? 'offline-split' : 'offline-single'}
      data={items}
      keyExtractor={(item) => item.article.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || offlineSyncing}
          onRefresh={() => void onPullRefresh()}
          tintColor={palette.accent}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={palette.textMuted} />
          <Text style={styles.emptyText}>{t('offline.emptyHint')}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const { article } = item;
        const readTime = formatReadTime(article);
        const active = paneArticle?.articleId === article.id;
        return (
          <Pressable
            onPress={() => void openArticle(item)}
            style={({ pressed }) => [
              styles.row,
              active && styles.rowActive,
              pressed && { opacity: 0.9 },
            ]}
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
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.screenBody, split && styles.splitRow]}>
        <View style={split ? styles.splitList : styles.flex}>{listPane}</View>
        {split ? (
          <View
            style={styles.splitPane}
            onLayout={(e) => setPaneWidth(e.nativeEvent.layout.width)}
          >
            {paneArticle ? (
              <ArticleReaderContent
                articleId={paneArticle.articleId}
                url={paneArticle.url}
                title={paneArticle.title}
                navigation={{ setOptions: () => {} }}
                embedded
                onRequestClose={() => setPaneArticle(null)}
                layoutWidth={paneWidth}
              />
            ) : (
              <View style={styles.splitEmpty}>
                <Ionicons name="newspaper-outline" size={40} color={palette.textMuted} />
                <Text style={styles.splitEmptyText}>{t('home.pickArticle')}</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    screenBody: { flex: 1 },
    flex: { flex: 1 },
    splitRow: { flexDirection: 'row', alignItems: 'stretch' },
    splitList: {
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: '40%',
      maxWidth: 440,
      minWidth: 280,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: palette.border,
    },
    splitPane: { flex: 1, minWidth: 280, backgroundColor: palette.bg },
    splitEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    splitEmptyText: { ...typography.body, color: palette.textMuted, textAlign: 'center' },
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
      minHeight: 44,
    },
    rowActive: {
      borderColor: palette.accent,
      backgroundColor: palette.surfaceSelected,
    },
    rowText: { flex: 1 },
    feed: { ...typography.caption, color: palette.accentMuted, marginBottom: 4 },
    title: { ...typography.subtitle, color: palette.text, marginBottom: 4 },
    meta: { ...typography.caption, color: palette.textMuted },
  });
}
