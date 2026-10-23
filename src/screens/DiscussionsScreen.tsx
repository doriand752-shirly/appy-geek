import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useComments, useRefreshCommentsOnFocus } from '../context/CommentsContext';
import { useFeeds } from '../context/FeedsContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { CommentThreadSummary } from '../types/comment';
import { formatCommentCountLabel } from '../utils/commentCountLabel';
import { normalizeArticleUrlForComments } from '../utils/commentThreadId';
import { formatRelative } from '../utils/formatTime';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Discussions'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DiscussionsScreen() {
  const navigation = useNavigation<Nav>();
  const { palette, appLocale } = useAppSettings();
  const { t } = useTranslation();
  const { articles, markRead } = useFeeds();
  const { configured, loading, error, threads, refreshStats } = useComments();
  const styles = useMemo(() => createStyles(palette), [palette]);

  useRefreshCommentsOnFocus();

  const articleByUrl = useMemo(() => {
    const map = new Map<string, (typeof articles)[number]>();
    for (const a of articles) {
      if (!a.link) continue;
      map.set(normalizeArticleUrlForComments(a.link), a);
    }
    return map;
  }, [articles]);

  const openThread = useCallback(
    (thread: CommentThreadSummary) => {
      const normalized = normalizeArticleUrlForComments(thread.articleUrl);
      const fromFeed = articleByUrl.get(normalized);
      const articleId = fromFeed?.id ?? `discussion:${thread.threadId.slice(0, 16)}`;
      const url = fromFeed?.link ?? thread.articleUrl;
      const title = fromFeed?.title ?? thread.articleTitle ?? t('discussions.articleFallback');
      void markRead(articleId);
      navigation.navigate('ArticleReader', { articleId, url, title });
    },
    [articleByUrl, markRead, navigation, t],
  );

  const onRefresh = useCallback(async () => {
    await refreshStats();
  }, [refreshStats]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('discussions.title')}</Text>
        <Text style={styles.subtitle}>{t('discussions.subtitle')}</Text>
      </View>

      {!configured ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={44} color={palette.textMuted} />
          <Text style={styles.emptyText}>{t('discussions.unavailable')}</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.threadId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading && threads.length > 0}
              onRefresh={() => void onRefresh()}
              tintColor={palette.accent}
            />
          }
          ListHeaderComponent={
            error ? (
              <Pressable onPress={() => void onRefresh()} style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={palette.accent} />
                <Text style={styles.errorText}>
                  {error} — {t('discussions.retryHint')}
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.emptyText}>{t('discussions.loading')}</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons name="chatbubble-outline" size={44} color={palette.textMuted} />
                <Text style={styles.emptyText}>{t('discussions.empty')}</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const fromFeed = articleByUrl.get(normalizeArticleUrlForComments(item.articleUrl));
            return (
              <Pressable
                onPress={() => openThread(item)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              >
                {fromFeed ? (
                  <Text style={styles.feedTag} numberOfLines={1}>
                    {fromFeed.feedTitle}
                  </Text>
                ) : null}
                <Text style={styles.cardTitle} numberOfLines={3}>
                  {item.articleTitle ?? fromFeed?.title ?? t('discussions.articleFallback')}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.countRow}>
                    <Ionicons name="chatbubbles-outline" size={16} color={palette.accentMuted} />
                    <Text style={styles.countText}>
                      {formatCommentCountLabel(item.commentCount, appLocale)}
                    </Text>
                  </View>
                  <Text style={styles.time}>{formatRelative(item.lastCommentAt)}</Text>
                </View>
                <Text style={styles.cta}>{t('discussions.viewComments')}</Text>
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
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    title: { ...typography.title, color: palette.text },
    subtitle: { ...typography.caption, color: palette.textMuted, marginTop: spacing.xs, lineHeight: 20 },
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    emptyText: {
      ...typography.body,
      color: palette.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: 10,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    errorText: { ...typography.caption, color: palette.accent, flex: 1 },
    card: {
      backgroundColor: palette.surface,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
    },
    feedTag: { ...typography.caption, color: palette.accentMuted, marginBottom: spacing.xs },
    cardTitle: { ...typography.subtitle, color: palette.text, marginBottom: spacing.sm },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
    countText: { ...typography.caption, color: palette.accentMuted, fontWeight: '600' as const },
    time: { ...typography.caption, color: palette.textMuted },
    cta: { ...typography.caption, color: palette.accent, fontWeight: '600' as const },
  });
}
