import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ALL_THEME_IDS, NEWS_THEMES } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ThemePicker'>;

export function ThemePickerScreen(_props: Props) {
  const {
    selectedThemeIds,
    toggleThemeId,
    selectAllThemes,
    clearAllThemes,
    customThemes,
    addCustomTheme,
    removeCustomTheme,
    palette,
  } = useAppSettings();

  const styles = useMemo(() => createThemePickerStyles(palette), [palette]);

  const [draftLabel, setDraftLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const activeCount = selectedThemeIds.length;
  const total = ALL_THEME_IDS.length + customThemes.length;

  const submitCustom = useCallback(async () => {
    setAddError(null);
    const r = await addCustomTheme(draftLabel);
    if (r.error) {
      setAddError(r.error);
      return;
    }
    setDraftLabel('');
  }, [addCustomTheme, draftLabel]);

  const confirmRemoveCustom = useCallback(
    (id: string, label: string) => {
      Alert.alert(
        'Supprimer ce thème',
        `« ${label} » sera retiré. Les articles restent dans le fil général.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => void removeCustomTheme(id),
          },
        ],
      );
    },
    [removeCustomTheme],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Activez les tuiles sous « Par thème » sur l’accueil. Ajoutez vos propres thèmes : les
          articles sont rangés dans une tuile si leur titre contient le nom que vous avez choisi.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => void selectAllThemes()}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnText}>Tout activer</Text>
          </Pressable>
          <Pressable
            onPress={() => void clearAllThemes()}
            style={({ pressed }) => [styles.btn, styles.btnMuted, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnTextMuted}>Tout désactiver</Text>
          </Pressable>
        </View>
        <Text style={styles.counter}>
          {activeCount} / {total} thème{total > 1 ? 's' : ''} visible{activeCount > 1 ? 's' : ''}
        </Text>
        {activeCount === 0 ? (
          <View style={styles.warn}>
            <Ionicons name="information-circle-outline" size={20} color={palette.accentMuted} />
            <Text style={styles.warnText}>
              Aucune tuile sur l’accueil : ajoutez au moins un thème ou rouvrez « Tout activer ».
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Thème personnalisé</Text>
        <View style={styles.formCard}>
          <Text style={styles.formHint}>
            Un ou plusieurs mots : tout article dont le titre les contient sera classé ici (comme
            pour les thèmes intégrés).
          </Text>
          <TextInput
            value={draftLabel}
            onChangeText={(t) => {
              setDraftLabel(t);
              if (addError) setAddError(null);
            }}
            placeholder="Ex. Steam Deck, Rust, Framework Laptop…"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={() => void submitCustom()}
          />
          {addError ? <Text style={styles.formError}>{addError}</Text> : null}
          <Pressable
            onPress={() => void submitCustom()}
            style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
          >
            <Ionicons name="add-circle-outline" size={20} color={palette.onAccent} />
            <Text style={styles.addBtnText}>Ajouter ce thème</Text>
          </Pressable>
        </View>

        {customThemes.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Mes thèmes ({customThemes.length})</Text>
            {customThemes.map((theme) => {
              const on = selectedThemeIds.includes(theme.id);
              return (
                <View key={theme.id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.themeLabel}>{theme.label}</Text>
                    <Text style={styles.themeHint} numberOfLines={2}>
                      Correspondance par mots du titre.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmRemoveCustom(theme.id, theme.label)}
                    style={({ pressed }) => [styles.trashBtn, pressed && { opacity: 0.75 }]}
                    accessibilityLabel="Supprimer le thème"
                  >
                    <Ionicons name="trash-outline" size={22} color={palette.danger} />
                  </Pressable>
                  <Switch
                    value={on}
                    onValueChange={() => void toggleThemeId(theme.id)}
                    trackColor={{ false: palette.border, true: palette.accent }}
                    thumbColor={palette.thumbSwitch}
                    ios_backgroundColor={palette.border}
                  />
                </View>
              );
            })}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Thèmes intégrés</Text>
        {NEWS_THEMES.map((theme) => {
          const on = selectedThemeIds.includes(theme.id);
          return (
            <View key={theme.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.themeLabel}>{theme.label}</Text>
                <Text style={styles.themeHint} numberOfLines={2}>
                  Classés par mots-clés dans le titre des articles.
                </Text>
              </View>
              <Switch
                value={on}
                onValueChange={() => void toggleThemeId(theme.id)}
                trackColor={{ false: palette.border, true: palette.accent }}
                thumbColor={palette.thumbSwitch}
                ios_backgroundColor={palette.border}
              />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function createThemePickerStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    intro: {
      ...typography.body,
      color: palette.textMuted,
      marginBottom: spacing.md,
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    btn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: palette.accent,
      alignItems: 'center',
    },
    btnMuted: {
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    btnPressed: { opacity: 0.88 },
    btnText: { ...typography.subtitle, color: palette.onAccent, fontSize: 14 },
    btnTextMuted: { ...typography.subtitle, color: palette.text, fontSize: 14 },
    counter: {
      ...typography.caption,
      color: palette.textMuted,
      marginBottom: spacing.md,
    },
    warn: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.sm,
      marginBottom: spacing.md,
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    warnText: { ...typography.caption, color: palette.textMuted, flex: 1, lineHeight: 18 },
    sectionLabel: {
      ...typography.subtitle,
      color: palette.textMuted,
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    formCard: {
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
      gap: spacing.sm,
    },
    formHint: {
      ...typography.caption,
      color: palette.textMuted,
      lineHeight: 18,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.text,
      backgroundColor: palette.surface,
    },
    formError: {
      ...typography.caption,
      color: palette.danger,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: palette.accent,
    },
    addBtnText: { ...typography.subtitle, color: palette.onAccent, fontSize: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
      backgroundColor: palette.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    rowText: { flex: 1 },
    trashBtn: { padding: spacing.xs },
    themeLabel: { ...typography.subtitle, color: palette.text, marginBottom: 2 },
    themeHint: { ...typography.caption, color: palette.textMuted, fontSize: 12 },
  });
}
