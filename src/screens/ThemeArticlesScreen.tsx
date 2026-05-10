import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleCard } from '../components/ArticleCard';
import { NEWS_THEME_BY_ID } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { ParsedArticle } from '../types/article';
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

  useLayoutEffect(() => {
    navigation.setOptions({ title: resolvedTitle });
  }, [navigation, resolvedTitle]);

  const { articles, readIds, markRead } = useFeeds();

  const list = useMemo(() => {
    const raw = articlesForThemeId(themeId, articles, customThemes);
    return [...raw].sort((a, b) => b.publishedAt - a.publishedAt);
  }, [articles, customThemes, themeId]);

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
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={44} color={palette.textMuted} />
              <Text style={styles.emptyText}>
                Aucun article ne correspond à ce thème pour l’instant (classement par titre).
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              read={readIds.has(item.id)}
              onOpen={() => onOpen(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createThemeArticlesStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
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
