import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
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

const FILTERS: { id: ArticleListFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'unread', label: 'Non lus' },
  { id: 'favorites', label: 'Favoris' },
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
  searchPlaceholder = 'Rechercher un article…',
}: Props) {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={palette.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
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
              Toutes les sources
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
        {FILTERS.map((f) => {
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
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
        {onMarkAllRead ? (
          <Pressable
            onPress={onMarkAllRead}
            style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={palette.accentMuted} />
            <Text style={styles.markAllText}>Tout lu</Text>
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
      paddingVertical: spacing.xs,
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
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    markAllText: { ...typography.caption, color: palette.accentMuted },
    sourceScroll: {
      gap: spacing.xs,
      paddingRight: spacing.md,
    },
    sourceChip: {
      maxWidth: 200,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
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
