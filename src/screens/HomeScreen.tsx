import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleListToolbar } from '../components/ArticleListToolbar';
import { ArticleSelectionBar } from '../components/ArticleSelectionBar';
import { AppigeekLogoMark } from '../components/AppigeekLogo';
import { AppigeekWordmark } from '../components/AppigeekWordmark';
import { FeaturedArticlesSection } from '../components/FeaturedArticlesSection';
import { SavedArticlesSection } from '../components/SavedArticlesSection';
import { RecommendationsSection } from '../components/RecommendationsSection';
import { SwipeableArticleCard } from '../components/SwipeableArticleCard';
import type { FeaturedArticle } from '../services/featuredArticlesService';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useComments, useRefreshCommentsOnFocus } from '../context/CommentsContext';
import { useFeeds } from '../context/FeedsContext';
import { localeDateTimeLocale, useTranslation } from '../i18n';
import { hapticLight } from '../utils/haptics';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import { ArticleReaderContent } from './ArticleReaderScreen';
import type { ParsedArticle } from '../types/article';
import type { CachedArticleRecord } from '../utils/offlineCache';
import { type ArticleListFilter, countUnread, filterArticles } from '../utils/articleFilters';
import { useArticleSelection } from '../hooks/useArticleSelection';
import { isTabletSplitLayout } from '../utils/tabletLayout';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Accueil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { palette, appLocale } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createHomeStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const split = isTabletSplitLayout(width);
  const wasSplitRef = useRef(split);
  const {
    articles,
    readIds,
    favoriteIds,
    loading,
    refreshing,
    offlineSyncing,
    error,
    lastUpdated,
    refresh,
    markRead,
    markAllRead,
    toggleFavorite,
    subscriptions,
  } = useFeeds();
  const { configured: commentsConfigured, getCommentCount, refreshStats } = useComments();

  useRefreshCommentsOnFocus();

  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<ArticleListFilter>('all');
  const [feedFilterId, setFeedFilterId] = useState<string | null>(null);
  const [paneArticle, setPaneArticle] = useState<{
    articleId: string;
    url: string;
    title: string;
  } | null>(null);
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

  const feedSourcesForFilter = useMemo(() => {
    const idsWithArticles = new Set(articles.map((a) => a.feedId));
    return subscriptions
      .filter((s) => idsWithArticles.has(s.id))
      .map((s) => ({ id: s.id, title: s.title }))
      .sort((a, b) => a.title.localeCompare(b.title, localeDateTimeLocale(appLocale)));
  }, [articles, subscriptions]);

  const filteredArticles = useMemo(
    () => filterArticles(articles, listFilter, readIds, favoriteIds, searchQuery, feedFilterId),
    [articles, listFilter, readIds, favoriteIds, searchQuery, feedFilterId],
  );

  const selectedFeedTitle = useMemo(() => {
    if (!feedFilterId) return null;
    return subscriptions.find((s) => s.id === feedFilterId)?.title ?? null;
  }, [feedFilterId, subscriptions]);

  useEffect(() => {
    if (feedFilterId && !subscriptions.some((s) => s.id === feedFilterId)) {
      setFeedFilterId(null);
    }
  }, [feedFilterId, subscriptions]);

  /** Duo / Split View : en repassant en 1 colonne, ouvrir le lecteur plein écran. */
  useEffect(() => {
    const wasSplit = wasSplitRef.current;
    wasSplitRef.current = split;
    if (wasSplit && !split && paneArticle) {
      const params = paneArticle;
      setPaneArticle(null);
      navigation.navigate('ArticleReader', params);
    }
  }, [split, paneArticle, navigation]);

  const totalUnread = useMemo(() => countUnread(articles, readIds), [articles, readIds]);

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

  const onOpenSaved = useCallback(
    (record: CachedArticleRecord) => {
      onOpen(record.article);
    },
    [onOpen],
  );

  const onOpenFeatured = useCallback(
    (item: FeaturedArticle) => {
      const match = articles.find((a) => a.link === item.articleUrl);
      if (match) {
        onOpen(match);
        return;
      }
      const articleId = `featured:${item.id}`;
      void markRead(articleId);
      const params = {
        articleId,
        url: item.articleUrl,
        title: item.title,
      };
      if (split) {
        setPaneArticle(params);
        return;
      }
      navigation.navigate('ArticleReader', params);
    },
    [articles, markRead, navigation, onOpen, split],
  );

  const handleRefresh = useCallback(async () => {
    hapticLight();
    await Promise.all([refresh(), refreshStats()]);
  }, [refresh, refreshStats]);

  const markSelectedRead = useCallback(() => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    void markAllRead(ids);
    exitSelection();
  }, [selectedIds, markAllRead, exitSelection]);

  const confirmMarkAllRead = useCallback(() => {
    const ids = filteredArticles.map((a) => a.id);
    if (!ids.length) return;
    Alert.alert(
      t('home.markAllReadTitle'),
      t('home.markAllReadMessage', { count: ids.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => void markAllRead(ids) },
      ],
    );
  }, [filteredArticles, markAllRead, t]);

  const [extrasOpen, setExtrasOpen] = useState(false);
  const [showSwipeTip, setShowSwipeTip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const seen = await AsyncStorage.getItem('appigeek_swipe_tip_v1');
        if (!cancelled && seen !== '1') setShowSwipeTip(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissSwipeTip = useCallback(() => {
    setShowSwipeTip(false);
    void AsyncStorage.setItem('appigeek_swipe_tip_v1', '1');
  }, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.lead}>
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <AppigeekWordmark palette={palette} />
            <Text style={styles.sub} maxFontSizeMultiplier={1.35}>
              {t('brand.tagline')}
              {lastUpdated
                ? ` · ${t('home.updatedAt')} ${new Date(lastUpdated).toLocaleTimeString(localeDateTimeLocale(appLocale), { hour: '2-digit', minute: '2-digit' })}`
                : ''}
              {offlineSyncing ? ` · ${t('home.offlineSyncing')}` : ''}
            </Text>
          </View>
          <AppigeekLogoMark size={48} />
        </View>
        {error ? (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={18} color={palette.danger} />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        <ArticleListToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          feedSources={feedSourcesForFilter}
          selectedFeedId={feedFilterId}
          onFeedIdChange={setFeedFilterId}
          searchPlaceholder={
            selectedFeedTitle
              ? t('home.searchInFeed', { feed: selectedFeedTitle })
              : t('home.searchArticles')
          }
          onMarkAllRead={selectionMode ? undefined : confirmMarkAllRead}
        />

        <FeaturedArticlesSection onOpen={onOpenFeatured} compact />

        <Text style={styles.sectionTitle}>
          {t('home.feed')}
          {totalUnread > 0 ? ` · ${totalUnread} ${t('home.unreadCount')}` : ''}
        </Text>

        {showSwipeTip ? (
          <Pressable
            onPress={dismissSwipeTip}
            style={({ pressed }) => [styles.swipeTip, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={t('home.swipeTipDismiss')}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={palette.accent} />
            <Text style={styles.swipeTipText} maxFontSizeMultiplier={1.35}>
              {t('home.swipeTip')}
            </Text>
            <Text style={styles.swipeTipDismiss}>{t('home.swipeTipDismiss')}</Text>
          </Pressable>
        ) : null}
      </View>
    ),
    [
      confirmMarkAllRead,
      feedFilterId,
      feedSourcesForFilter,
      error,
      lastUpdated,
      listFilter,
      selectedFeedTitle,
      offlineSyncing,
      onOpenFeatured,
      palette,
      searchQuery,
      styles,
      totalUnread,
      appLocale,
      t,
      selectionMode,
      showSwipeTip,
      dismissSwipeTip,
    ],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.trail}>
        <Pressable
          onPress={() => setExtrasOpen((v) => !v)}
          style={({ pressed }) => [styles.extrasToggle, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityState={{ expanded: extrasOpen }}
        >
          <Text style={styles.extrasToggleText}>
            {extrasOpen ? t('home.hideExtras') : t('home.showExtras')}
          </Text>
          <Ionicons
            name={extrasOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={palette.accent}
          />
        </Pressable>
        {extrasOpen ? (
          <>
            <SavedArticlesSection onOpenArticle={onOpenSaved} />
            <RecommendationsSection
              articles={articles}
              readIds={readIds}
              favoriteIds={favoriteIds}
              onOpen={onOpen}
            />
          </>
        ) : null}
      </View>
    ),
    [
      articles,
      extrasOpen,
      favoriteIds,
      onOpen,
      onOpenSaved,
      palette.accent,
      readIds,
      styles,
      t,
    ],
  );

  return (
    <SafeAreaView
      style={styles.safe}
      // iOS native tabs / Duo vertical chrome: respect left+right insets (asymmetric).
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.screenBody, split && styles.splitRow]}>
        <View style={split ? styles.splitList : styles.flex}>
          <FlatList
          key={split ? 'home-split' : 'home-single'}
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={palette.accent}
            />
          }
          ListEmptyComponent={
            loading && articles.length === 0 ? (
              <View style={styles.empty}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.emptyText}>{t('home.loadingArticles')}</Text>
              </View>
            ) : refreshing && articles.length === 0 ? (
              <View style={styles.empty}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.emptyText}>{t('home.refreshing')}</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="newspaper-outline" size={40} color={palette.textMuted} />
                <Text style={styles.emptyText}>
                  {subscriptions.length === 0
                    ? t('home.emptyNoFeeds')
                    : listFilter === 'favorites'
                      ? t('home.emptyNoFavorites')
                      : listFilter === 'unread'
                        ? t('home.emptyAllRead')
                        : feedFilterId && selectedFeedTitle
                          ? t('home.emptyFeedSearch', {
                              feed: selectedFeedTitle,
                              search: searchQuery.trim() ? ` (${t('home.emptySearch')})` : '',
                            })
                          : searchQuery.trim()
                            ? t('home.emptySearch')
                            : t('home.emptyDefault')}
                </Text>
              </View>
            )
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
    </SafeAreaView>
  );
}

function createHomeStyles(palette: AppPalette) {
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
    lead: { paddingBottom: spacing.xs },
    trail: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitles: { flex: 1, paddingRight: spacing.sm },
    sub: { ...typography.caption, color: palette.textMuted, marginTop: 4 },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.sm,
      borderRadius: 10,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    bannerText: { ...typography.caption, color: palette.text, flex: 1 },
    sectionTitle: {
      ...typography.subtitle,
      color: palette.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    extrasToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    extrasToggleText: {
      ...typography.subtitle,
      fontSize: 14,
      color: palette.accent,
    },
    swipeTip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    swipeTipText: {
      ...typography.caption,
      color: palette.text,
      flex: 1,
      lineHeight: 18,
    },
    swipeTipDismiss: {
      ...typography.caption,
      color: palette.accent,
      fontWeight: '700',
    },
    list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
    empty: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
    emptyText: { ...typography.body, color: palette.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
  });
}
