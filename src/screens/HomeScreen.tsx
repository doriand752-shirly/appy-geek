import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SavedArticlesSection } from '../components/SavedArticlesSection';
import { SwipeableArticleCard } from '../components/SwipeableArticleCard';
import { ThemeCard } from '../components/ThemeCard';
import { BRAND } from '../constants/brand';
import { newsThemesWithCustom } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { ParsedArticle } from '../types/article';
import type { CachedArticleRecord } from '../utils/offlineCache';
import { type ArticleListFilter, countUnread, filterArticles } from '../utils/articleFilters';
import { useArticleSelection } from '../hooks/useArticleSelection';
import { coverUriForTheme, themeIdsForArticle } from '../utils/articleThemes';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Accueil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const {
    selectedThemeIds,
    customThemes,
    palette,
    themeHomeSectionHidden,
    setThemeHomeSectionHidden,
  } = useAppSettings();
  const styles = useMemo(() => createHomeStyles(palette), [palette]);
  const { width } = useWindowDimensions();
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

  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<ArticleListFilter>('all');
  const [feedFilterId, setFeedFilterId] = useState<string | null>(null);
  const {
    selectionMode,
    selectedIds,
    selectedCount,
    enterSelection,
    exitSelection,
    toggleSelect,
    isSelected,
  } = useArticleSelection();

  const cardWidth = Math.floor((width - spacing.md * 2 - spacing.sm) / 2);
  const selectedThemeSet = useMemo(() => new Set(selectedThemeIds), [selectedThemeIds]);
  const displayThemes = useMemo(() => newsThemesWithCustom(customThemes), [customThemes]);

  const feedSourcesForFilter = useMemo(() => {
    const idsWithArticles = new Set(articles.map((a) => a.feedId));
    return subscriptions
      .filter((s) => idsWithArticles.has(s.id))
      .map((s) => ({ id: s.id, title: s.title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
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

  const totalUnread = useMemo(() => countUnread(articles, readIds), [articles, readIds]);

  const themeBlocks = useMemo(() => {
    const m = new Map<string, ParsedArticle[]>();
    for (const a of articles) {
      for (const tid of themeIdsForArticle(a, customThemes)) {
        if (!m.has(tid)) m.set(tid, []);
        m.get(tid)!.push(a);
      }
    }
    return displayThemes
      .map((t) => {
        const items = m.get(t.id) ?? [];
        return {
          theme: t,
          items,
          unread: countUnread(items, readIds),
        };
      })
      .filter((x) => x.items.length > 0 && selectedThemeSet.has(x.theme.id))
      .sort((a, b) => b.items.length - a.items.length);
  }, [articles, customThemes, displayThemes, readIds, selectedThemeSet]);

  const openThemePicker = useCallback(() => {
    navigation.navigate('ThemePicker');
  }, [navigation]);

  const onOpen = useCallback(
    (a: ParsedArticle, offlineHtml?: string) => {
      if (!a.link) return;
      void markRead(a.id);
      navigation.navigate('ArticleReader', {
        articleId: a.id,
        url: a.link,
        title: a.title,
        offlineHtml,
      });
    },
    [markRead, navigation],
  );

  const onOpenSaved = useCallback(
    (record: CachedArticleRecord) => {
      onOpen(record.article, record.html);
    },
    [onOpen],
  );

  const onOpenTheme = useCallback(
    (themeId: string, themeLabel: string) => {
      navigation.navigate('ThemeArticles', { themeId, themeLabel });
    },
    [navigation],
  );

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
      'Tout marquer comme lu',
      `${ids.length} article${ids.length > 1 ? 's' : ''} dans cette liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => void markAllRead(ids) },
      ],
    );
  }, [filteredArticles, markAllRead]);

  const showThemeSection =
    selectedThemeIds.length > 0 || !themeHomeSectionHidden;

  const hideThemeSection = useCallback(() => {
    void setThemeHomeSectionHidden(true);
  }, [setThemeHomeSectionHidden]);

  const listHeader = useMemo(
    () => (
      <View style={styles.lead}>
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <AppigeekWordmark palette={palette} />
            <Text style={styles.sub}>
              {BRAND.tagline}
              {lastUpdated
                ? ` · MAJ ${new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
              {offlineSyncing ? ' · téléchargement des articles complets…' : ''}
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
        {showThemeSection ? (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleInline}>Par thème</Text>
              {selectedThemeIds.length === 0 ? (
                <Pressable
                  onPress={hideThemeSection}
                  hitSlop={8}
                  style={({ pressed }) => [styles.hideSectionBtn, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.hideSectionBtnText}>Masquer</Text>
                </Pressable>
              ) : null}
            </View>
            {selectedThemeIds.length === 0 ? (
              <View style={styles.themeEmptyWrap}>
                <Text style={[styles.themeHint, styles.themeHintFlush]}>
                  Aucun thème sélectionné. Choisissez ceux à afficher sur l’accueil.
                </Text>
                <Pressable
                  onPress={openThemePicker}
                  style={({ pressed }) => [styles.themePickerBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.themePickerBtnText}>Choisir les thèmes</Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.accent} />
                </Pressable>
              </View>
            ) : themeBlocks.length === 0 && !loading && !refreshing ? (
              <Text style={styles.themeHint}>
                Les articles seront classés ici d’après leur titre (thèmes intégrés ou votre nom de
                thème personnalisé). Ajoutez des flux pour remplir l’accueil.
              </Text>
            ) : null}
            <View style={styles.themeGrid}>
              {themeBlocks.map(({ theme, items, unread }) => (
                <ThemeCard
                  key={theme.id}
                  label={theme.label}
                  count={items.length}
                  unreadCount={unread}
                  cardWidth={cardWidth}
                  imageUri={coverUriForTheme(items, theme.fallbackImageUrl)}
                  onPress={() => onOpenTheme(theme.id, theme.label)}
                />
              ))}
            </View>
          </>
        ) : null}
        <SavedArticlesSection onOpenArticle={onOpenSaved} />
        <Text style={styles.sectionTitle}>
          Fil d’actualité
          {totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` : ''}
        </Text>
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
              ? `Rechercher dans ${selectedFeedTitle}…`
              : 'Rechercher un article…'
          }
          onMarkAllRead={selectionMode ? undefined : confirmMarkAllRead}
        />
      </View>
    ),
    [
      cardWidth,
      confirmMarkAllRead,
      feedFilterId,
      feedSourcesForFilter,
      error,
      hideThemeSection,
      lastUpdated,
      listFilter,
      selectedFeedTitle,
      loading,
      offlineSyncing,
      onOpenSaved,
      onOpenTheme,
      openThemePicker,
      palette,
      refreshing,
      searchQuery,
      selectedThemeIds.length,
      showThemeSection,
      styles,
      themeBlocks,
      totalUnread,
    ],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.screenBody}>
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={palette.accent}
            />
          }
          ListEmptyComponent={
            loading && articles.length === 0 ? (
              <View style={styles.empty}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.emptyText}>Chargement des articles…</Text>
              </View>
            ) : refreshing && articles.length === 0 ? (
              <View style={styles.empty}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.emptyText}>Actualisation…</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="newspaper-outline" size={40} color={palette.textMuted} />
                <Text style={styles.emptyText}>
                  {subscriptions.length === 0
                    ? 'Ajoutez votre premier flux dans « Découvrir » ou « Abonnements ».'
                    : listFilter === 'favorites'
                      ? 'Aucun favori pour l’instant.'
                      : listFilter === 'unread'
                        ? 'Tous les articles sont lus.'
                        : feedFilterId && selectedFeedTitle
                          ? `Aucun article pour ${selectedFeedTitle}${searchQuery.trim() ? ' avec cette recherche' : ''}.`
                          : searchQuery.trim()
                            ? 'Aucun résultat pour cette recherche.'
                            : 'Aucun article pour l’instant. Tirez pour actualiser.'}
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
    </SafeAreaView>
  );
}

function createHomeStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    screenBody: { flex: 1 },
    lead: { paddingBottom: spacing.xs },
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
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    sectionTitleInline: {
      ...typography.subtitle,
      color: palette.textMuted,
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    hideSectionBtn: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    hideSectionBtnText: {
      ...typography.subtitle,
      fontSize: 14,
      color: palette.textMuted,
    },
    themeEmptyWrap: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    themeHint: {
      ...typography.caption,
      color: palette.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    themeHintFlush: { paddingHorizontal: 0, marginBottom: 0 },
    themePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    themePickerBtnText: {
      ...typography.subtitle,
      fontSize: 15,
      color: palette.accent,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.md,
      justifyContent: 'space-between',
    },
    list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
    empty: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
    emptyText: { ...typography.body, color: palette.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
  });
}
