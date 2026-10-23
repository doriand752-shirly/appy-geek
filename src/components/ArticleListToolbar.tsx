import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import type { ArticleListFilter } from '../utils/articleFilters';

export type FeedSourceOption = { id: string; title: string };

type Props = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filter: ArticleListFilter;
  onFilterChange: (f: ArticleListFilter) => void;
  onMarkAllRead?: () => void;
  /** Filtre par flux (accueil uniquement). */
  feedSources?: FeedSourceOption[];
  selectedFeedId?: string | null;
  onFeedIdChange?: (feedId: string | null) => void;
  searchPlaceholder?: string;
};

const FILTER_KEYS: { id: ArticleListFilter; key: 'toolbar.all' | 'toolbar.unread' | 'toolbar.favorites' }[] = [
  { id: 'all', key: 'toolbar.all' },
  { id: 'unread', key: 'toolbar.unread' },
  { id: 'favorites', key: 'toolbar.favorites' },
];

export function ArticleListToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onMarkAllRead,
  feedSources,
  selectedFeedId = null,
  onFeedIdChange,
  searchPlaceholder,
}: Props) {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const placeholder = searchPlaceholder ?? t('home.searchArticles');

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={palette.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      {feedSources && feedSources.length > 0 && onFeedIdChange ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceScroll}
        >
          <Pressable
            onPress={() => onFeedIdChange(null)}
            style={({ pressed }) => [
              styles.sourceChip,
              selectedFeedId === null && styles.sourceChipActive,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text
              style={[
                styles.sourceChipText,
                selectedFeedId === null && styles.sourceChipTextActive,
              ]}
            >
              {t('toolbar.allSources')}
            </Text>
          </Pressable>
          {feedSources.map((s) => {
            const active = selectedFeedId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => onFeedIdChange(active ? null : s.id)}
                style={({ pressed }) => [
                  styles.sourceChip,
                  active && styles.sourceChipActive,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text
                  style={[styles.sourceChipText, active && styles.sourceChipTextActive]}
                  numberOfLines={1}
                >
                  {s.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={styles.chipsRow}>
        {FILTER_KEYS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => onFilterChange(f.id)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(f.key)}</Text>
            </Pressable>
          );
        })}
        {onMarkAllRead ? (
          <Pressable
            onPress={onMarkAllRead}
            accessibilityRole="button"
            accessibilityLabel={t('toolbar.markAllRead')}
            style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={palette.accentMuted} />
            <Text style={styles.markAllText}>{t('toolbar.markAllRead')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: palette.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: palette.text,
      paddingVertical: spacing.sm,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    chipActive: {
      borderColor: palette.accent,
      backgroundColor: palette.surfaceSelected,
    },
    chipText: { ...typography.caption, color: palette.textMuted },
    chipTextActive: { color: palette.accent, fontWeight: '600' as const },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    markAllText: { ...typography.caption, color: palette.accentMuted },
    sourceScroll: {
      gap: spacing.xs,
      paddingRight: spacing.md,
      alignItems: 'center',
    },
    sourceChip: {
      maxWidth: 200,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    sourceChipActive: {
      borderColor: palette.accent,
      backgroundColor: palette.surfaceSelected,
    },
    sourceChipText: {
      ...typography.caption,
      color: palette.textMuted,
    },
    sourceChipTextActive: {
      color: palette.accent,
      fontWeight: '600' as const,
    },
  });
}
