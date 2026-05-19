import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleListToolbar } from '../components/ArticleListToolbar';
import { ArticleSelectionBar } from '../components/ArticleSelectionBar';
import { SwipeableArticleCard } from '../components/SwipeableArticleCard';
import { NEWS_THEME_BY_ID } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { ParsedArticle } from '../types/article';
import { type ArticleListFilter, filterArticles } from '../utils/articleFilters';
import { useArticleSelection } from '../hooks/useArticleSelection';
import { articlesForThemeId } from '../utils/articleThemes';

type Props = NativeStackScreenProps<RootStackParamList, 'ThemeArticles'>;

export function ThemeArticlesScreen({ route, navigation }: Props) {
  const { themeId, themeLabel: themeLabelParam } = route.params;
  const { customThemes, palette } = useAppSettings();
  const styles = useMemo(() => createThemeArticlesStyles(palette), [palette]);
  const themeBuiltin = NEWS_THEME_BY_ID[themeId];
  const themeCustom = useMemo(
    () => customThemes.find((c) => c.id === themeId),
    [customThemes, themeId],
  );
  const resolvedTitle =
    themeLabelParam ?? themeBuiltin?.label ?? themeCustom?.label ?? 'Thème';

  const { articles, readIds, favoriteIds, markRead, markAllRead, toggleFavorite } = useFeeds();
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<ArticleListFilter>('all');
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
    Alert.alert('Tout marquer comme lu', `Marquer ${ids.length} article(s) de ce thème ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => void markAllRead(ids) },
    ]);
  }, [list, markAllRead]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: resolvedTitle });
  }, [navigation, resolvedTitle]);

  const onOpen = useCallback(
    async (a: ParsedArticle) => {
      if (!a.link) return;
      await markRead(a.id);
      navigation.navigate('ArticleReader', {
        articleId: a.id,
        url: a.link,
        title: a.title,
      });
    },
    [markRead, navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {!themeBuiltin && !themeCustom ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Thème inconnu ou supprimé.</Text>
        </View>
      ) : (
        <View style={styles.screenBody}>
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
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
                    ? 'Aucun favori dans ce thème.'
                    : listFilter === 'unread'
                      ? 'Tous les articles de ce thème sont lus.'
                      : 'Aucun article ne correspond à ce thème pour l’instant (classement par titre).'}
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
      )}
    </SafeAreaView>
  );
}

function createThemeArticlesStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    screenBody: { flex: 1 },
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
