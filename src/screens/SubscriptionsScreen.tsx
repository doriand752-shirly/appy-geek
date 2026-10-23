import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getGeekTopics } from '../constants/suggestedFeedsByLocale';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import { useTranslation } from '../i18n';
import { parseOpml } from '../utils/opml';

export function SubscriptionsScreen() {
  const { palette, appLocale } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createSubscriptionsStyles(palette), [palette]);
  const {
    subscriptions,
    addSubscription,
    removeSubscription,
    resetToDefaults,
    getExportOpml,
    importSubscriptions,
  } = useFeeds();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => new Set());
  const geekTopics = useMemo(() => getGeekTopics(appLocale), [appLocale]);

  const hasUrl = useCallback(
    (feedUrl: string) => subscriptions.some((s) => s.url === feedUrl),
    [subscriptions],
  );

  const filteredTopics = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return geekTopics;
    return geekTopics
      .map((topic) => ({
        ...topic,
        feeds: topic.feeds.filter(
          (f) =>
            f.title.toLowerCase().includes(q) ||
            f.url.toLowerCase().includes(q) ||
            topic.title.toLowerCase().includes(q),
        ),
      }))
      .filter((topic) => topic.feeds.length > 0);
  }, [catalogQuery, geekTopics]);

  const toggleTopic = useCallback((id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onAdd = async () => {
    try {
      const raw = url.trim();
      let display = title.trim();
      if (!display && raw.length) {
        const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        display = new URL(withProto).hostname.replace(/^www\./, '');
      }
      await addSubscription(display || raw || t('subscriptions.defaultFeedName'), raw);
      setTitle('');
      setUrl('');
    } catch {
      Alert.alert(t('subscriptions.invalidUrlTitle'), t('subscriptions.invalidUrlMessage'));
    }
  };

  const confirmRemove = (name: string, id: string) => {
    Alert.alert(t('subscriptions.removeFeedTitle'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.remove'), style: 'destructive', onPress: () => void removeSubscription(id) },
    ]);
  };

  const exportOpml = async () => {
    try {
      const xml = getExportOpml();
      const path = `${FileSystem.cacheDirectory}appigeek-subscriptions.opml`;
      await FileSystem.writeAsStringAsync(path, xml, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/xml',
          dialogTitle: t('subscriptions.exportOpml'),
        });
      } else {
        Alert.alert(t('subscriptions.exportOpml'), t('subscriptions.exportUnavailable'));
      }
    } catch {
      Alert.alert(t('common.error'), t('subscriptions.exportFailed'));
    }
  };

  const importOpml = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/xml', 'application/xml', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const xml = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const feeds = parseOpml(xml);
      if (!feeds.length) {
        Alert.alert(t('subscriptions.importOpml'), t('subscriptions.importEmpty'));
        return;
      }
      const added = await importSubscriptions(feeds);
      Alert.alert(
        t('subscriptions.importDone'),
        added > 0
          ? t('subscriptions.importSuccess', { count: added })
          : t('subscriptions.importAllPresent'),
      );
    } catch {
      Alert.alert(t('subscriptions.importFailedTitle'), t('subscriptions.importFailedMessage'));
    }
  };

  const confirmReset = () => {
    Alert.alert(t('subscriptions.resetConfirmTitle'), t('subscriptions.resetConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('subscriptions.resetDefaults'),
        style: 'destructive',
        onPress: () => void resetToDefaults(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscriptions.title')}</Text>
        <Text style={styles.subtitle}>{t('subscriptions.subtitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>
          {t('subscriptions.yourFeeds', { count: subscriptions.length })}
        </Text>
        {subscriptions.length === 0 ? (
          <Text style={styles.emptyHint}>{t('subscriptions.empty')}</Text>
        ) : (
          subscriptions.map((s) => (
            <View key={s.id} style={styles.subRow}>
              <View style={styles.subText}>
                <Text style={styles.subTitle}>{s.title}</Text>
                <Text style={styles.subUrl} numberOfLines={2}>
                  {s.url}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t('subscriptions.removeA11y', { title: s.title })}
                onPress={() => confirmRemove(s.title, s.id)}
                style={({ pressed }) => [styles.trash, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="trash-outline" size={22} color={palette.danger} />
              </Pressable>
            </View>
          ))
        )}

        <Pressable
          onPress={confirmReset}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.secondaryText}>{t('subscriptions.resetDefaults')}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{t('discover.title')}</Text>
        <Text style={styles.sectionHint}>{t('discover.subtitle')}</Text>
        <TextInput
          value={catalogQuery}
          onChangeText={setCatalogQuery}
          placeholder={t('subscriptions.catalogSearch')}
          placeholderTextColor={palette.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {filteredTopics.map((topic) => {
          const open = expandedTopics.has(topic.id) || catalogQuery.trim().length > 0;
          return (
            <View key={topic.id} style={styles.topicCard}>
              <Pressable
                onPress={() => toggleTopic(topic.id)}
                style={({ pressed }) => [styles.topicHeader, pressed && { opacity: 0.9 }]}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
              >
                <View style={styles.topicHeaderText}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicDesc} numberOfLines={2}>
                    {topic.description} · {topic.feeds.length}
                  </Text>
                </View>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={palette.textMuted}
                />
              </Pressable>
              {open
                ? topic.feeds.map((f) => {
                    const added = hasUrl(f.url);
                    return (
                      <View key={f.url} style={styles.feedRow}>
                        <View style={styles.feedRowText}>
                          <Text style={styles.feedName}>{f.title}</Text>
                          <Text style={styles.feedUrl} numberOfLines={1}>
                            {f.url}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => void addSubscription(f.title, f.url)}
                          disabled={added}
                          accessibilityLabel={
                            added
                              ? t('subscriptions.alreadyAddedA11y', { title: f.title })
                              : t('subscriptions.addA11y', { title: f.title })
                          }
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
                  })
                : null}
            </View>
          );
        })}

        <Text style={styles.sectionLabel}>{t('subscriptions.addFeed')}</Text>
        <View style={styles.form}>
          <Text style={styles.label}>{t('subscriptions.feedTitle')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('subscriptions.feedTitlePlaceholder')}
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <Text style={styles.label}>{t('subscriptions.feedUrl')}</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={t('subscriptions.feedUrlPlaceholder')}
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Pressable
            onPress={() => void onAdd()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          >
            <Ionicons name="add-circle-outline" size={20} color={palette.onAccent} />
            <Text style={styles.primaryBtnText}>{t('subscriptions.add')}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t('subscriptions.opmlSection')}</Text>
        <View style={styles.opmlRow}>
          <Pressable
            onPress={() => void exportOpml()}
            style={({ pressed }) => [styles.opmlBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="share-outline" size={18} color={palette.accent} />
            <Text style={styles.opmlBtnText}>{t('subscriptions.exportOpml')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void importOpml()}
            style={({ pressed }) => [styles.opmlBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="download-outline" size={18} color={palette.accent} />
            <Text style={styles.opmlBtnText}>{t('subscriptions.importOpml')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createSubscriptionsStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    title: { ...typography.title, color: palette.text },
    subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs },
    scroll: { paddingBottom: spacing.xl },
    emptyHint: {
      ...typography.caption,
      color: palette.textMuted,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionHint: {
      ...typography.caption,
      color: palette.textMuted,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      lineHeight: 18,
    },
    searchInput: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
      color: palette.text,
      backgroundColor: palette.surfaceElevated,
    },
    topicCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    topicHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingVertical: spacing.xs,
    },
    topicHeaderText: { flex: 1 },
    topicTitle: { ...typography.subtitle, color: palette.text, marginBottom: 2 },
    topicDesc: { ...typography.caption, color: palette.textMuted },
    feedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    feedRowText: { flex: 1 },
    feedName: { ...typography.body, color: palette.text },
    feedUrl: { ...typography.caption, color: palette.textMuted },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: palette.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnPressed: { opacity: 0.85 },
    addedBtn: { backgroundColor: palette.surfaceElevated },
    form: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      gap: spacing.xs,
    },
    label: { ...typography.caption, color: palette.textMuted, marginTop: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
      color: palette.text,
      backgroundColor: palette.surfaceElevated,
    },
    primaryBtn: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 48,
      backgroundColor: palette.accent,
      paddingVertical: spacing.md,
      borderRadius: 12,
    },
    primaryBtnPressed: { opacity: 0.92 },
    primaryBtnText: { ...typography.subtitle, color: palette.onAccent },
    opmlRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    opmlBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 48,
      paddingVertical: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    opmlBtnText: { ...typography.subtitle, fontSize: 15, color: palette.accent },
    sectionLabel: {
      ...typography.subtitle,
      color: palette.text,
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      gap: spacing.sm,
    },
    subText: { flex: 1 },
    subTitle: { ...typography.body, color: palette.text },
    subUrl: { ...typography.caption, color: palette.textMuted, marginTop: 4 },
    trash: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtn: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      minHeight: 44,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    secondaryText: { ...typography.body, color: palette.textMuted },
  });
}
