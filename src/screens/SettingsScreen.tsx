import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppigeekLogoMark } from '../components/AppigeekLogo';
import { BRAND } from '../constants/brand';
import { ALL_THEME_IDS } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { VISUAL_THEME_OPTIONS } from '../constants/visualThemes';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { OfflineCacheCount, ReaderDefaultView, ReaderFontSize } from '../types/settings';
import {
  OFFLINE_CACHE_COUNT_OPTIONS,
  READER_FONT_SIZE_OPTIONS,
} from '../types/settings';
import { clearOfflineCache } from '../utils/offlineCache';

export function SettingsScreen() {
  const {
    readerDefaultView,
    setReaderDefaultView,
    readerFontSize,
    setReaderFontSize,
    offlineCacheEnabled,
    offlineCacheLimit,
    setOfflineCacheEnabled,
    setOfflineCacheLimit,
    selectedThemeIds,
    customThemes,
    palette,
    visualThemeId,
    setVisualThemeId,
  } = useAppSettings();
  const { articles, refresh, offlineSyncing, offlineCachedCount, syncOfflineNow } = useFeeds();
  const styles = useMemo(() => createSettingsStyles(palette), [palette]);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Paramètres'>>();
  const [limitPickerVisible, setLimitPickerVisible] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);

  const stackNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const openThemePicker = useCallback(() => {
    stackNav?.navigate('ThemePicker');
  }, [stackNav]);

  const openOfflineList = useCallback(() => {
    stackNav?.navigate('OfflineArticles');
  }, [stackNav]);

  const applyOfflineLimit = useCallback(
    async (limit: OfflineCacheCount) => {
      setLimitPickerVisible(false);
      await setOfflineCacheLimit(limit);
      if (offlineCacheEnabled && articles.length > 0) {
        setSyncingManual(true);
        try {
          const count = await syncOfflineNow();
          if (count === 0) {
            Alert.alert(
              'Aucun article enregistré',
              'Actualisez l’accueil une fois vos flux chargés, puis réessayez.',
            );
          }
        } finally {
          setSyncingManual(false);
        }
      }
    },
    [articles, offlineCacheEnabled, setOfflineCacheLimit, syncOfflineNow],
  );

  const pickOfflineLimit = useCallback(() => {
    if (Platform.OS === 'ios') {
      const labels = OFFLINE_CACHE_COUNT_OPTIONS.map((n) => `${n} articles`);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', ...labels],
          cancelButtonIndex: 0,
          title: 'Nombre d’articles enregistrés',
        },
        (index) => {
          if (index > 0) void applyOfflineLimit(OFFLINE_CACHE_COUNT_OPTIONS[index - 1]);
        },
      );
    } else {
      setLimitPickerVisible(true);
    }
  }, [applyOfflineLimit]);

  const toggleOffline = useCallback(async () => {
    const next = !offlineCacheEnabled;
    await setOfflineCacheEnabled(next);
    if (!next) {
      await clearOfflineCache();
      return;
    }
    if (articles.length > 0) {
      setSyncingManual(true);
      try {
        await syncOfflineNow();
      } finally {
        setSyncingManual(false);
      }
    } else {
      void refresh();
    }
  }, [articles, offlineCacheEnabled, offlineCacheLimit, refresh, setOfflineCacheEnabled, syncOfflineNow]);

  const row = (
    value: ReaderDefaultView,
    label: string,
    hint: string,
    icon: 'document-text-outline' | 'newspaper-outline',
  ) => {
    const selected = readerDefaultView === value;
    return (
      <Pressable
        onPress={() => void setReaderDefaultView(value)}
        style={({ pressed }) => [
          styles.option,
          selected && styles.optionSelected,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.optionIconWrap}>
          <Ionicons name={icon} size={22} color={selected ? palette.accentMuted : palette.textMuted} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{label}</Text>
          <Text style={styles.optionHint}>{hint}</Text>
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={22} color={palette.accent} />
        ) : (
          <View style={styles.optionSpacer} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
        <Text style={styles.subtitle}>
          Comportement par défaut à l’ouverture d’un article (vous pouvez toujours basculer dans le
          lecteur).
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Apparence</Text>
        {VISUAL_THEME_OPTIONS.map((opt) => {
          const selected = visualThemeId === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => void setVisualThemeId(opt.id)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={[styles.themeSwatch, { backgroundColor: opt.palette.accent }]} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionHint}>{opt.hint}</Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={palette.accent} />
              ) : (
                <View style={styles.optionSpacer} />
              )}
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>Accueil</Text>
        <Pressable
          onPress={openThemePicker}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="grid-outline" size={22} color={palette.accentMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Thèmes sur l’accueil</Text>
            <Text style={styles.optionHint}>
              {selectedThemeIds.length === 0
                ? 'Aucune tuile — les catégories sont masquées.'
                : `${selectedThemeIds.length} / ${ALL_THEME_IDS.length + customThemes.length} thème${selectedThemeIds.length > 1 ? 's' : ''} affiché${selectedThemeIds.length > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>Lecture</Text>
        {row(
          'preview',
          'Aperçu',
          'Chapô ou extrait, puis bouton « Afficher l’article entier ».',
          'document-text-outline',
        )}
        {row(
          'full',
          'Article entier',
          'Texte complet (HTML) affiché directement.',
          'newspaper-outline',
        )}

        <Text style={styles.sectionLabel}>Taille du texte (lecteur)</Text>
        {READER_FONT_SIZE_OPTIONS.map((opt) => {
          const selected = readerFontSize === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => void setReaderFontSize(opt.id as ReaderFontSize)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons
                  name="text-outline"
                  size={22}
                  color={selected ? palette.accentMuted : palette.textMuted}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionHint}>Corps à {opt.bodySize} pt</Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={palette.accent} />
              ) : (
                <View style={styles.optionSpacer} />
              )}
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>Hors ligne</Text>
        <Pressable
          onPress={() => void toggleOffline()}
          style={({ pressed }) => [
            styles.option,
            offlineCacheEnabled && styles.optionSelected,
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons
              name="cloud-download-outline"
              size={22}
              color={offlineCacheEnabled ? palette.accentMuted : palette.textMuted}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Enregistrer les derniers articles</Text>
            <Text style={styles.optionHint}>
              {offlineCacheEnabled
                ? offlineSyncing
                  ? `Téléchargement des articles complets (jusqu’à ${offlineCacheLimit})… Cela peut prendre une minute.`
                  : offlineCachedCount > 0
                    ? `${offlineCachedCount} article${offlineCachedCount > 1 ? 's' : ''} complet${offlineCachedCount > 1 ? 's' : ''} enregistré${offlineCachedCount > 1 ? 's' : ''} — actualisez l’accueil pour mettre à jour.`
                    : `Jusqu’à ${offlineCacheLimit} articles complets après actualisation de l’accueil (plus long qu’un simple extrait).`
                : 'Désactivé — activez pour lire sans connexion.'}
            </Text>
          </View>
          {offlineSyncing || syncingManual ? (
            <ActivityIndicator color={palette.accent} />
          ) : (
            <Ionicons
              name={offlineCacheEnabled ? 'toggle' : 'toggle-outline'}
              size={28}
              color={offlineCacheEnabled ? palette.accent : palette.textMuted}
            />
          )}
        </Pressable>

        {offlineCacheEnabled ? (
          <>
            <Pressable
              onPress={pickOfflineLimit}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="layers-outline" size={22} color={palette.accentMuted} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Nombre d’articles</Text>
                <Text style={styles.optionHint}>
                  {offlineCacheLimit} articles (défaut : 50)
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={palette.textMuted} />
            </Pressable>
            <Pressable
              onPress={openOfflineList}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="folder-open-outline" size={22} color={palette.accentMuted} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Voir les articles enregistrés</Text>
                <Text style={styles.optionHint}>Liste des articles disponibles hors ligne</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
            </Pressable>
          </>
        ) : null}

        <View style={styles.brandFooter}>
          <AppigeekLogoMark size={40} />
          <View style={styles.brandFooterText}>
            <Text style={[typography.subtitle, { color: palette.text }]}>{BRAND.name}</Text>
            <Text style={[typography.caption, { color: palette.textMuted, marginTop: 4 }]}>
              {BRAND.tagline}
            </Text>
            <Text style={[typography.caption, { color: palette.textMuted, marginTop: 8, opacity: 0.85 }]}>
              Version{' '}
              {typeof Constants.expoConfig?.version === 'string'
                ? Constants.expoConfig.version
                : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={limitPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLimitPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Nombre d’articles enregistrés</Text>
            <ScrollView style={styles.modalScroll}>
              {OFFLINE_CACHE_COUNT_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => void applyOfflineLimit(n)}
                  style={({ pressed }) => [
                    styles.modalRow,
                    n === offlineCacheLimit && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      n === offlineCacheLimit && styles.modalRowTextSelected,
                    ]}
                  >
                    {n} articles{n === 50 ? ' (défaut)' : ''}
                  </Text>
                  {n === offlineCacheLimit ? (
                    <Ionicons name="checkmark" size={20} color={palette.accent} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setLimitPickerVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createSettingsStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    title: { ...typography.title, color: palette.text, marginBottom: spacing.xs },
    subtitle: { ...typography.caption, color: palette.textMuted, lineHeight: 20 },
    scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    sectionLabel: {
      ...typography.caption,
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    themeSwatch: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: palette.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    optionSelected: {
      borderColor: palette.accent,
      backgroundColor: palette.surfaceSelected,
    },
    optionIconWrap: { width: 28, alignItems: 'center' },
    optionText: { flex: 1 },
    optionTitle: { ...typography.subtitle, color: palette.text, marginBottom: 4 },
    optionTitleSelected: { color: palette.text },
    optionHint: { ...typography.caption, color: palette.textMuted, lineHeight: 18 },
    optionSpacer: { width: 22 },
    brandFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    brandFooterText: { flex: 1 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: palette.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      maxHeight: '70%',
    },
    modalTitle: {
      ...typography.subtitle,
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    modalScroll: { maxHeight: 360 },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    modalRowSelected: { backgroundColor: palette.surfaceSelected },
    modalRowText: { ...typography.body, color: palette.text },
    modalRowTextSelected: { color: palette.accent, fontWeight: '600' as const },
    modalCancel: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
    },
    modalCancelText: { ...typography.subtitle, color: palette.accent },
  });
}
