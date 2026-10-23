import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeCard } from '../components/ThemeCard';
import { newsThemesWithCustom } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import { useTranslation } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { ParsedArticle } from '../types/article';
import { countUnread } from '../utils/articleFilters';
import { coverUriForTheme, themeIdsForArticle } from '../utils/articleThemes';

type ThemesNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Thèmes'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ThemesScreen() {
  const navigation = useNavigation<ThemesNav>();
  const { selectedThemeIds, customThemes, palette } = useAppSettings();
  const { t } = useTranslation();
  const { articles, readIds } = useFeeds();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
      .map((theme) => {
        const items = m.get(theme.id) ?? [];
        return {
          theme,
          items,
          unread: countUnread(items, readIds),
        };
      })
      .filter((x) => selectedThemeSet.has(x.theme.id))
      .sort((a, b) => b.items.length - a.items.length || a.theme.label.localeCompare(b.theme.label));
  }, [articles, customThemes, displayThemes, readIds, selectedThemeSet]);

  const openThemePicker = useCallback(() => {
    navigation.navigate('ThemePicker');
  }, [navigation]);

  const onOpenTheme = useCallback(
    (themeId: string, themeLabel: string) => {
      navigation.navigate('ThemeArticles', { themeId, themeLabel });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('tabs.themes')}</Text>
          <Text style={styles.subtitle}>{t('themes.subtitle')}</Text>
        </View>
        <Pressable
          onPress={openThemePicker}
          style={({ pressed }) => [styles.manageBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('home.chooseThemes')}
        >
          <Ionicons name="options-outline" size={20} color={palette.accent} />
          <Text style={styles.manageBtnText}>{t('home.chooseThemes')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {selectedThemeIds.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="grid-outline" size={40} color={palette.textMuted} />
            <Text style={styles.emptyText}>{t('home.noThemesSelected')}</Text>
            <Pressable
              onPress={openThemePicker}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.primaryBtnText}>{t('home.chooseThemes')}</Text>
            </Pressable>
          </View>
        ) : themeBlocks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('home.themeHintEmpty')}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    headerText: { gap: 4 },
    title: { ...typography.title, color: palette.text },
    subtitle: { ...typography.body, color: palette.textMuted },
    manageBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    manageBtnText: { ...typography.subtitle, fontSize: 15, color: palette.accent },
    scroll: { paddingBottom: spacing.xl },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.md,
      justifyContent: 'space-between',
    },
    empty: {
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    emptyText: {
      ...typography.body,
      color: palette.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    primaryBtn: {
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: palette.accent,
    },
    primaryBtnText: { ...typography.subtitle, color: palette.onAccent },
  });
}
