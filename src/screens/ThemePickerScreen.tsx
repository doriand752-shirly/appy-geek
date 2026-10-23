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
import { useTranslation } from '../i18n';
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
  const { t } = useTranslation();

  const styles = useMemo(() => createThemePickerStyles(palette), [palette]);

  const [draftLabel, setDraftLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const activeCount = selectedThemeIds.length;
  const total = ALL_THEME_IDS.length + customThemes.length;
  const allThemesOff = activeCount === 0;
  const allThemesOn = total > 0 && activeCount === total;

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
      Alert.alert(t('themePicker.removeTitle'), t('themePicker.removeMessage', { label }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('themePicker.removeConfirm'),
          style: 'destructive',
          onPress: () => void removeCustomTheme(id),
        },
      ]);
    },
    [removeCustomTheme, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>{t('themePicker.intro')}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => void selectAllThemes()}
            style={({ pressed }) => [
              styles.btn,
              allThemesOn ? styles.btnPrimary : styles.btnMuted,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={allThemesOn ? styles.btnText : styles.btnTextMuted}>
              {t('themePicker.enableAll')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void clearAllThemes()}
            style={({ pressed }) => [
              styles.btn,
              allThemesOff ? styles.btnPrimary : styles.btnMuted,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={allThemesOff ? styles.btnText : styles.btnTextMuted}>
              {t('themePicker.disableAll')}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.counter}>
          {t('themePicker.counter', { count: activeCount, total })}
        </Text>
        {activeCount === 0 ? (
          <View style={styles.warn}>
            <Ionicons name="information-circle-outline" size={20} color={palette.accentMuted} />
            <Text style={styles.warnText}>{t('themePicker.warnNone')}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>{t('themePicker.customSection')}</Text>
        <View style={styles.formCard}>
          <Text style={styles.formHint}>{t('themePicker.customHint')}</Text>
          <TextInput
            value={draftLabel}
            onChangeText={(text) => {
              setDraftLabel(text);
              if (addError) setAddError(null);
            }}
            placeholder={t('themePicker.customPlaceholder')}
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
            <Text style={styles.addBtnText}>{t('themePicker.addTheme')}</Text>
          </Pressable>
        </View>

        {customThemes.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>
              {t('themePicker.myThemes', { count: customThemes.length })}
            </Text>
            {customThemes.map((theme) => {
              const on = selectedThemeIds.includes(theme.id);
              return (
                <View key={theme.id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.themeLabel}>{theme.label}</Text>
                    <Text style={styles.themeHint} numberOfLines={2}>
                      {t('themePicker.customMatchHint')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmRemoveCustom(theme.id, theme.label)}
                    style={({ pressed }) => [styles.trashBtn, pressed && { opacity: 0.75 }]}
                    accessibilityLabel={t('themePicker.removeA11y')}
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

        <Text style={styles.sectionLabel}>{t('themePicker.builtinSection')}</Text>
        {NEWS_THEMES.map((theme) => {
          const on = selectedThemeIds.includes(theme.id);
          return (
            <View key={theme.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.themeLabel}>{theme.label}</Text>
                <Text style={styles.themeHint} numberOfLines={2}>
                  {t('themePicker.builtinMatchHint')}
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
      alignItems: 'center',
    },
    btnPrimary: {
      backgroundColor: palette.accent,
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
