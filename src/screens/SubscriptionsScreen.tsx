import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
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

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';

export function SubscriptionsScreen() {
  const { palette } = useAppSettings();
  const styles = useMemo(() => createSubscriptionsStyles(palette), [palette]);
  const { subscriptions, addSubscription, removeSubscription, resetToDefaults } = useFeeds();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const onAdd = async () => {
    try {
      const raw = url.trim();
      let display = title.trim();
      if (!display && raw.length) {
        const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        display = new URL(withProto).hostname.replace(/^www\./, '');
      }
      await addSubscription(display || raw || 'Flux RSS', raw);
      setTitle('');
      setUrl('');
    } catch {
      Alert.alert('URL invalide', 'Collez une adresse de flux RSS ou Atom valide (https://…).');
    }
  };

  const confirmRemove = (name: string, id: string) => {
    Alert.alert('Retirer ce flux ?', name, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => void removeSubscription(id) },
    ]);
  };

  const confirmReset = () => {
    Alert.alert(
      'Réinitialiser',
      'Revenir aux flux par défaut et effacer la liste des articles lus ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: () => void resetToDefaults() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes abonnements</Text>
        <Text style={styles.subtitle}>
          Gérez vos sources. Astuce : beaucoup de sites proposent un lien « RSS » en bas de page.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.label}>Nom affiché (optionnel)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ma source préférée"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <Text style={styles.label}>URL du flux</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://exemple.com/feed.xml"
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
            <Text style={styles.primaryBtnText}>Ajouter le flux</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Flux suivis ({subscriptions.length})</Text>
        {subscriptions.map((s) => (
          <View key={s.id} style={styles.subRow}>
            <View style={styles.subText}>
              <Text style={styles.subTitle}>{s.title}</Text>
              <Text style={styles.subUrl} numberOfLines={2}>
                {s.url}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Retirer ${s.title}`}
              onPress={() => confirmRemove(s.title, s.id)}
              style={({ pressed }) => [styles.trash, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name="trash-outline" size={22} color={palette.danger} />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={confirmReset}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.secondaryText}>Réinitialiser les flux par défaut</Text>
        </Pressable>
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
      color: palette.text,
      backgroundColor: palette.surfaceElevated,
    },
    primaryBtn: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.accent,
      paddingVertical: spacing.md,
      borderRadius: 12,
    },
    primaryBtnPressed: { opacity: 0.92 },
    primaryBtnText: { ...typography.subtitle, color: palette.onAccent },
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
    trash: { padding: spacing.xs },
    secondaryBtn: {
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.md,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    secondaryText: { ...typography.body, color: palette.textMuted },
  });
}
