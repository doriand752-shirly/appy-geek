import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { fetchArticleSummary } from '../utils/articleSummary';
import { useTranslation } from '../i18n';

type Props = {
  title: string;
  articleUrl: string;
  /** Texte brut ou HTML pour le résumé. */
  sourceText: string;
};

export function ArticleSummaryCard({ title, articleUrl, sourceText }: Props) {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bullets, setBullets] = useState<string[]>([]);
  const [source, setSource] = useState<'ai' | 'local' | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setFailed(false);
    try {
      const result = await fetchArticleSummary({
        title,
        text: sourceText,
        articleUrl,
      });
      setBullets(result.bullets);
      setSource(result.source);
      setFailed(!result.bullets.length);
    } catch {
      setBullets([]);
      setSource(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [articleUrl, sourceText, title]);

  useEffect(() => {
    setOpen(false);
    setBullets([]);
    setSource(null);
    setFailed(false);
  }, [articleUrl]);

  useEffect(() => {
    if (!open || bullets.length || loading || failed) return;
    void load();
  }, [open, bullets.length, loading, failed, load]);

  if (!sourceText.trim() || sourceText.trim().length < 60) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t('summary.title')}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.88 }]}
      >
        <Ionicons name="list-outline" size={18} color={palette.accentMuted} />
        <Text style={styles.headerText}>{t('summary.title')}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={palette.textMuted}
        />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.loadingText}>{t('summary.generating')}</Text>
            </View>
          ) : bullets.length ? (
            <>
              {bullets.map((b, i) => (
                <View key={`${i}-${b.slice(0, 24)}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
              {source ? (
                <Text style={styles.sourceHint}>
                  {source === 'ai' ? t('summary.ai') : t('summary.local')}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.empty}>{t('summary.unavailable')}</Text>
              <Pressable
                onPress={() => {
                  void load();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('summary.retry')}
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.retryText}>{t('summary.retry')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.accentMuted + '22',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerText: {
      ...typography.subtitle,
      color: palette.text,
      flex: 1,
      fontSize: 15,
    },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    loadingText: { ...typography.caption, color: palette.textMuted },
    bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    bulletDot: { ...typography.body, color: palette.accentMuted, lineHeight: 22 },
    bulletText: { ...typography.body, color: palette.text, flex: 1, lineHeight: 22 },
    sourceHint: { ...typography.caption, color: palette.textMuted, marginTop: spacing.xs },
    emptyBlock: { gap: spacing.sm },
    empty: { ...typography.caption, color: palette.textMuted },
    retryBtn: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    retryText: { ...typography.caption, color: palette.accentMuted, fontWeight: '600' },
  });
}
