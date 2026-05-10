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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleCard } from '../components/ArticleCard';
import { ThemeCard } from '../components/ThemeCard';
import { newsThemesWithCustom } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { ParsedArticle } from '../types/article';
import { coverUriForTheme, themeIdsForArticle } from '../utils/articleThemes';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Accueil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { selectedThemeIds, customThemes, palette } = useAppSettings();
  const styles = useMemo(() => createHomeStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const {
    articles,
    readIds,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    markRead,
    subscriptions,
  } = useFeeds();

  const cardWidth = Math.floor((width - spacing.md * 2 - spacing.sm) / 2);

  const selectedThemeSet = useMemo(() => new Set(selectedThemeIds), [selectedThemeIds]);

  const displayThemes = useMemo(() => newsThemesWithCustom(customThemes), [customThemes]);

  const themeBlocks = useMemo(() => {
    const m = new Map<string, ParsedArticle[]>();
    for (const a of articles) {
      for (const tid of themeIdsForArticle(a, customThemes)) {
        if (!m.has(tid)) m.set(tid, []);
        m.get(tid)!.push(a);
      }
    }
    return displayThemes
      .map((t) => ({ theme: t, items: m.get(t.id) ?? [] }))
      .filter((x) => x.items.length > 0 && selectedThemeSet.has(x.theme.id))
      .sort((a, b) => b.items.length - a.items.length);
  }, [articles, customThemes, displayThemes, selectedThemeSet]);

  const openThemePicker = useCallback(() => {
    navigation.navigate('ThemePicker');
  }, [navigation]);

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

  const onOpenTheme = useCallback(
    (themeId: string, themeLabel: string) => {
      navigation.navigate('ThemeArticles', { themeId, themeLabel });
    },
    [navigation],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.lead}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Appy Geek</Text>
            <Text style={styles.sub}>
              Votre veille geek, un flux à la fois
              {lastUpdated
                ? ` · MAJ ${new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </Text>
          </View>
          <Ionicons name="planet-outline" size={28} color={palette.accent} />
        </View>
        {error ? (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={18} color={palette.danger} />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>Par thème</Text>
        {selectedThemeIds.length === 0 ? (
          <View style={styles.themeEmptyWrap}>
            <Text style={[styles.themeHint, styles.themeHintFlush]}>
              Aucun thème sélectionné : les tuiles sont masquées. Choisissez ceux à afficher sur
              l’accueil.
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
            Les articles seront classés ici d’après leur titre (thèmes intégrés ou votre nom de thème
            personnalisé). Ajoutez des flux pour remplir l’accueil.
          </Text>
        ) : null}
        <View style={styles.themeGrid}>
          {themeBlocks.map(({ theme, items }) => (
            <ThemeCard
              key={theme.id}
              label={theme.label}
              count={items.length}
              cardWidth={cardWidth}
              imageUri={coverUriForTheme(items, theme.fallbackImageUrl)}
              onPress={() => onOpenTheme(theme.id, theme.label)}
            />
          ))}
        </View>
        <Text style={styles.sectionTitle}>Fil d’actualité</Text>
      </View>
    ),
    [
      cardWidth,
      error,
      lastUpdated,
      loading,
      onOpenTheme,
      openThemePicker,
      refreshing,
      palette,
      selectedThemeIds.length,
      styles,
      themeBlocks,
    ],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.accent}
          />
        }
        ListEmptyComponent={
          loading || refreshing ? (
            <View style={styles.empty}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.emptyText}>Chargement des articles…</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={40} color={palette.textMuted} />
              <Text style={styles.emptyText}>
                {subscriptions.length === 0
                  ? 'Ajoutez votre premier flux dans « Découvrir » ou « Abonnements ».'
                  : 'Aucun article pour l’instant. Tirez pour actualiser.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            read={readIds.has(item.id)}
            onOpen={() => onOpen(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function createHomeStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    lead: { paddingBottom: spacing.xs },
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brand: { ...typography.title, color: palette.text },
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
    emptyText: { ...typography.body, color: palette.textMuted },
  });
}
