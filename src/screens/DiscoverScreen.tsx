import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GEEK_TOPICS } from '../constants/suggestedFeeds';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';

export function DiscoverScreen() {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createDiscoverStyles(palette), [palette]);
  const { addSubscription, subscriptions } = useFeeds();

  const hasUrl = useCallback(
    (url: string) => subscriptions.some((s) => s.url === url),
    [subscriptions],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Découvrir</Text>
        <Text style={styles.subtitle}>
          Ajoutez des flux par thème geek — tech, jeux, science, pop culture.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {GEEK_TOPICS.map((topic) => (
          <View key={topic.id} style={styles.topicCard}>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <Text style={styles.topicDesc}>{topic.description}</Text>
            {topic.feeds.map((f) => {
              const added = hasUrl(f.url);
              return (
                <View key={f.url} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.feedName}>{f.title}</Text>
                    <Text style={styles.feedUrl} numberOfLines={1}>
                      {f.url}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void addSubscription(f.title, f.url)}
                    disabled={added}
                    style={({ pressed }) => [
                      styles.addBtn,
                      added && styles.addedBtn,
                      pressed && !added && styles.addBtnPressed,
                    ]}
                  >
                    {added ? (
                      <Ionicons name="checkmark" size={20} color={palette.success} />
                    ) : (
                      <Ionicons name="add" size={22} color={palette.onAccent} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createDiscoverStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    title: { ...typography.title, color: palette.text },
    subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs },
    scroll: { paddingBottom: spacing.xl },
    topicCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    topicTitle: { ...typography.subtitle, color: palette.text, marginBottom: 4 },
    topicDesc: { ...typography.caption, color: palette.textMuted, marginBottom: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    rowText: { flex: 1 },
    feedName: { ...typography.body, color: palette.text },
    feedUrl: { ...typography.caption, color: palette.textMuted },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: palette.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnPressed: { opacity: 0.85 },
    addedBtn: { backgroundColor: palette.surfaceElevated },
  });
}
