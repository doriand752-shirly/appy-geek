import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleListToolbar } from '../components/ArticleListToolbar';
import { ArticleSelectionBar } from '../components/ArticleSelectionBar';
import { SwipeableArticleCard } from '../components/SwipeableArticleCard';
import { NEWS_THEME_BY_ID } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useComments } from '../context/CommentsContext';
import { useFeeds } from '../context/FeedsContext';
import { useTranslation } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { ParsedArticle } from '../types/article';
import { type ArticleListFilter, filterArticles } from '../utils/articleFilters';
import { useArticleSelection } from '../hooks/useArticleSelection';
import { articlesForThemeId } from '../utils/articleThemes';
import { hapticLight } from '../utils/haptics';
import { isTabletSplitLayout } from '../utils/tabletLayout';
import { ArticleReaderContent } from './ArticleReaderScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'ThemeArticles'>;

type PaneArticle = {
  articleId: string;
  url: string;
  title: string;
};

export function ThemeArticlesScreen({ route, navigation }: Props) {
  const { themeId, themeLabel: themeLabelParam } = route.params;
  const { customThemes, palette } = useAppSettings();
  const styles = useMemo(() => createThemeArticlesStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const split = isTabletSplitLayout(width);
  const wasSplitRef = useRef(split);
  const themeBuiltin = NEWS_THEME_BY_ID[themeId];
  const themeCustom = useMemo(
    () => customThemes.find((c) => c.id === themeId),
    [customThemes, themeId],
  );
  const { t } = useTranslation();
  const resolvedTitle =
    themeLabelParam ?? themeBuiltin?.label ?? themeCustom?.label ?? t('nav.themeDefault');

  const { articles, readIds, favoriteIds, markRead, markAllRead, toggleFavorite, refresh, loading } =
    useFeeds();
  const [refreshing, setRefreshing] = useState(false);
  const { configured: commentsConfigured, getCommentCount } = useComments();
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<ArticleListFilter>('all');
  const [paneArticle, setPaneArticle] = useState<PaneArticle | null>(null);
  const [paneWidth, setPaneWidth] = useState(0);
  const {
    selectionMode,
    selectedIds,
    selectedCount,
    enterSelection,
    exitSelection,
    toggleSelect,
    isSelected,
  } = useArticleSelection();

  const baseList = useMemo(() => {
    const raw = articlesForThemeId(themeId, articles, customThemes);
    return [...raw].sort((a, b) => b.publishedAt - a.publishedAt);
  }, [articles, customThemes, themeId]);

  const list = useMemo(
    () => filterArticles(baseList, listFilter, readIds, favoriteIds, searchQuery),
    [baseList, listFilter, readIds, favoriteIds, searchQuery],
  );

  const markSelectedRead = useCallback(() => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    void markAllRead(ids);
    exitSelection();
  }, [selectedIds, markAllRead, exitSelection]);

  const confirmMarkAllRead = useCallback(() => {
    const ids = list.map((a) => a.id);
    if (!ids.length) return;
    Alert.alert(t('home.markAllReadTitle'), t('home.markAllReadMessage', { count: ids.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => void markAllRead(ids) },
    ]);
  }, [list, markAllRead, t]);

  const onPullRefresh = useCallback(async () => {
    hapticLight();
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: resolvedTitle });
  }, [navigation, resolvedTitle]);

  useEffect(() => {
    const wasSplit = wasSplitRef.current;
    wasSplitRef.current = split;
    if (wasSplit && !split && paneArticle) {
      const params = paneArticle;
      setPaneArticle(null);
      navigation.navigate('ArticleReader', params);
    }
  }, [split, paneArticle, navigation]);

  const onOpen = useCallback(
    (a: ParsedArticle) => {
      if (!a.link) return;
      void markRead(a.id);
      const params = {
        articleId: a.id,
        url: a.link,
        title: a.title,
      };
      if (split) {
        setPaneArticle(params);
        return;
      }
      navigation.navigate('ArticleReader', params);
    },
    [markRead, navigation, split],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {!themeBuiltin && !themeCustom ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('themeArticles.unknown')}</Text>
        </View>
      ) : (
        <View style={[styles.screenBody, split && styles.splitRow]}>
          <View style={split ? styles.splitList : styles.flex}>
            <FlatList
              key={split ? 'theme-split' : 'theme-single'}
              data={list}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing || (loading && articles.length > 0)}
                  onRefresh={() => void onPullRefresh()}
                  tintColor={palette.accent}
                />
              }
              ListHeaderComponent={
                <ArticleListToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filter={listFilter}
                  onFilterChange={setListFilter}
                  onMarkAllRead={selectionMode ? undefined : confirmMarkAllRead}
                />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="folder-open-outline" size={44} color={palette.textMuted} />
                  <Text style={styles.emptyText}>
                    {listFilter === 'favorites'
                      ? t('themeArticles.emptyFavorites')
                      : listFilter === 'unread'
                        ? t('themeArticles.emptyUnread')
                        : t('themeArticles.emptyDefault')}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <SwipeableArticleCard
                  article={item}
                  read={readIds.has(item.id)}
                  favorite={favoriteIds.has(item.id)}
                  selectionMode={selectionMode}
                  selected={isSelected(item.id)}
                  paneActive={paneArticle?.articleId === item.id}
                  commentCount={getCommentCount(item.link)}
                  showCommentCount={commentsConfigured}
                  onOpen={() => onOpen(item)}
                  onLongPress={() => enterSelection(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onToggleFavorite={() => void toggleFavorite(item.id)}
                  onMarkRead={() => void markRead(item.id)}
                />
              )}
            />
            {selectionMode ? (
              <ArticleSelectionBar
                floating
                useTopSafeArea={false}
                selectedCount={selectedCount}
                onClose={exitSelection}
                onMarkRead={markSelectedRead}
              />
            ) : null}
          </View>
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
      )}
    </SafeAreaView>
  );
}

function createThemeArticlesStyles(palette: AppPalette) {
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
    list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
    empty: {
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    emptyText: { ...typography.body, color: palette.textMuted, textAlign: 'center' },
  });
}
