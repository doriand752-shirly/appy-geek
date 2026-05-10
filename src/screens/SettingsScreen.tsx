import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppigeekLogoMark } from '../components/AppigeekLogo';
import { BRAND } from '../constants/brand';
import { ALL_THEME_IDS } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { VISUAL_THEME_OPTIONS } from '../constants/visualThemes';
import { useAppSettings } from '../context/AppSettingsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { ReaderDefaultView } from '../types/settings';

export function SettingsScreen() {
  const {
    readerDefaultView,
    setReaderDefaultView,
    selectedThemeIds,
    customThemes,
    palette,
    visualThemeId,
    setVisualThemeId,
  } = useAppSettings();
  const styles = useMemo(() => createSettingsStyles(palette), [palette]);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Paramètres'>>();

  const openThemePicker = useCallback(() => {
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('ThemePicker');
  }, [navigation]);

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
  });
}
