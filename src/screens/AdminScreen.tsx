import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAuth } from '../context/AuthContext';
import { useFeeds } from '../context/FeedsContext';
import { checkIsAppAdmin } from '../services/adminService';
import {
  adminDeleteComment,
  fetchOpenCommentReports,
  setCommentReportStatus,
  type AdminCommentReport,
} from '../services/adminReportsService';
import { fetchAdminStatsGlance, type AdminStatsGlance } from '../services/adminStatsService';
import {
  endFeaturedArticle,
  fetchAllFeaturedArticles,
  pinFeaturedArticle,
  reorderFeaturedArticles,
  type FeaturedArticle,
} from '../services/featuredArticlesService';
import {
  approveFeaturedProposal,
  fetchPendingFeaturedProposals,
  rejectFeaturedProposal,
  type FeaturedProposal,
} from '../services/featuredProposalsService';
import { triggerDigestPush, type DigestSlot } from '../services/digestPushService';
import type { ParsedArticle } from '../types/article';

export function AdminScreen() {
  const { palette } = useAppSettings();
  const { user } = useAuth();
  const { articles } = useFeeds();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStatsGlance | null>(null);
  const [featured, setFeatured] = useState<FeaturedArticle[]>([]);
  const [proposals, setProposals] = useState<FeaturedProposal[]>([]);
  const [reports, setReports] = useState<AdminCommentReport[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const isAdmin = await checkIsAppAdmin();
      setAllowed(isAdmin);
      if (!isAdmin) return;
      const [s, f, p, r] = await Promise.all([
        fetchAdminStatsGlance(),
        fetchAllFeaturedArticles(),
        fetchPendingFeaturedProposals(),
        fetchOpenCommentReports(),
      ]);
      setStats(s);
      setFeatured(f);
      setProposals(p);
      setReports(r);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Chargement admin impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const pinFromArticle = useCallback(
    async (article: ParsedArticle) => {
      setBusy(true);
      try {
        await pinFeaturedArticle({
          articleUrl: article.link,
          title: article.title,
          feedTitle: article.feedTitle,
          imageUrl: article.imageUrl ?? null,
        });
        setPickerVisible(false);
        await refreshAll();
      } catch (e) {
        Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec du pin');
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const submitManual = useCallback(async () => {
    const url = manualUrl.trim();
    const title = manualTitle.trim();
    if (url.length < 8 || title.length < 1) {
      Alert.alert('Champs requis', 'Indiquez une URL et un titre.');
      return;
    }
    setBusy(true);
    try {
      await pinFeaturedArticle({
        articleUrl: url,
        title,
        note: manualNote.trim() || null,
      });
      setManualVisible(false);
      setManualUrl('');
      setManualTitle('');
      setManualNote('');
      await refreshAll();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setBusy(false);
    }
  }, [manualNote, manualTitle, manualUrl, refreshAll]);

  const moveFeatured = useCallback(
    async (id: string, dir: -1 | 1) => {
      const idx = featured.findIndex((f) => f.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= featured.length) return;
      const ordered = [...featured];
      const tmp = ordered[idx]!;
      ordered[idx] = ordered[next]!;
      ordered[next] = tmp;
      setFeatured(ordered);
      setBusy(true);
      try {
        await reorderFeaturedArticles(ordered.map((f) => f.id));
      } catch (e) {
        Alert.alert('Erreur', e instanceof Error ? e.message : 'Réordonnancement impossible');
        await refreshAll();
      } finally {
        setBusy(false);
      }
    },
    [featured, refreshAll],
  );

  const unpin = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await endFeaturedArticle(id);
        await refreshAll();
      } catch (e) {
        Alert.alert('Erreur', e instanceof Error ? e.message : 'Retrait impossible');
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const onProposalAction = useCallback(
    (proposal: FeaturedProposal, action: 'approve' | 'reject') => {
      void (async () => {
        setBusy(true);
        try {
          if (action === 'approve') await approveFeaturedProposal(proposal);
          else await rejectFeaturedProposal(proposal.id);
          await refreshAll();
        } catch (e) {
          Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible');
        } finally {
          setBusy(false);
        }
      })();
    },
    [refreshAll],
  );

  const onReportAction = useCallback(
    (report: AdminCommentReport, action: 'reviewed' | 'dismissed' | 'delete') => {
      const run = async () => {
        setBusy(true);
        try {
          if (action === 'delete') {
            await adminDeleteComment(report.commentId);
            await setCommentReportStatus(report.id, 'reviewed');
          } else {
            await setCommentReportStatus(report.id, action);
          }
          await refreshAll();
        } catch (e) {
          Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible');
        } finally {
          setBusy(false);
        }
      };

      if (action === 'delete') {
        Alert.alert(
          'Supprimer le commentaire ?',
          'Le message sera retiré pour tous les lecteurs.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => void run() },
          ],
        );
        return;
      }
      void run();
    },
    [refreshAll],
  );

  const runDigest = useCallback((slot: DigestSlot) => {
    const labels: Record<DigestSlot, string> = {
      morning: 'matin',
      midday: 'midi',
      evening: 'soir',
    };
    Alert.alert(
      'Déclencher le digest',
      `Envoyer le digest « ${labels[slot]} » à tous les utilisateurs éligibles ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Lancer',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const res = await triggerDigestPush(slot);
                Alert.alert(
                  res.ok ? 'Digest lancé' : 'Échec',
                  res.ok
                    ? `HTTP ${res.status}\n${res.body || 'OK'}`
                    : `HTTP ${res.status}\n${res.body}`,
                );
              } catch (e) {
                Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec digest');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }, []);

  const recentArticles = useMemo(() => {
    const featuredUrls = new Set(featured.map((f) => f.articleUrl));
    return articles.filter((a) => a.link && !featuredUrls.has(a.link)).slice(0, 40);
  }, [articles, featured]);

  if (allowed === false) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.blocked}>
          <Ionicons name="lock-closed-outline" size={28} color={palette.textMuted} />
          <Text style={styles.blockedTitle}>Accès refusé</Text>
          <Text style={styles.blockedHint}>
            Votre compte Apple n’est pas dans la liste admin_users.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Compte</Text>
        <View style={styles.card}>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {user?.email ?? 'Sans e-mail (Apple)'}
          </Text>
          <Text style={styles.cardHint} selectable>
            id · {user?.id ?? '—'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Dashboard</Text>
        {loading && !stats ? (
          <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing.md }} />
        ) : (
          <>
            <Text style={styles.subSectionLabel}>App Store</Text>
            <View style={styles.statsRow}>
              <StatChip
                label="Téléchargements"
                value={stats?.downloadsTotal ?? 0}
                hint={
                  stats?.storeSource
                    ? `7j · ${stats.downloads7d} · auj. ${stats.downloadsToday}`
                    : 'Sync auto (sous 48 h)'
                }
                styles={styles}
              />
              <StatChip
                label="Maj Store"
                value={
                  stats?.storeUpdatedAt
                    ? new Date(stats.storeUpdatedAt).toLocaleDateString('fr-FR')
                    : '—'
                }
                hint={stats?.storeSource ?? 'Mise à jour quotidienne'}
                styles={styles}
              />
            </View>

            <Text style={styles.subSectionLabel}>Utilisateurs</Text>
            <View style={styles.statsRow}>
              <StatChip label="Comptes" value={stats?.usersTotal ?? 0} styles={styles} />
              <StatChip label="Nouveaux (7j)" value={stats?.users7d ?? 0} styles={styles} />
              <StatChip label="Aujourd’hui" value={stats?.usersToday ?? 0} styles={styles} />
              <StatChip
                label="Push actifs"
                value={stats?.pushUsers ?? 0}
                hint={`${stats?.pushTokens ?? 0} tokens`}
                styles={styles}
              />
              <StatChip label="Avec abonnements" value={stats?.subscribers ?? 0} styles={styles} />
            </View>

            <Text style={styles.subSectionLabel}>Lecture</Text>
            <View style={styles.statsRow}>
              <StatChip
                label="Articles lus"
                value={stats?.articlesReadTotal ?? 0}
                hint="Comptes synchronisés"
                styles={styles}
              />
              <StatChip label="Lus (auj.)" value={stats?.articlesReadToday ?? 0} styles={styles} />
              <StatChip label="Lus (7j)" value={stats?.articlesRead7d ?? 0} styles={styles} />
              <StatChip label="Lecteurs (7j)" value={stats?.readers7d ?? 0} styles={styles} />
              <StatChip label="Favoris" value={stats?.favoritesTotal ?? 0} styles={styles} />
            </View>

            <Text style={styles.subSectionLabel}>Modération</Text>
            <View style={styles.statsRow}>
              <StatChip
                label="Commentaires"
                value={stats?.commentsTotal ?? 0}
                hint={`Auj. · ${stats?.commentsToday ?? 0}`}
                styles={styles}
              />
              <StatChip label="À la une" value={stats?.featuredActive ?? 0} styles={styles} />
              <StatChip
                label="Propositions"
                value={stats?.featuredProposalsPending ?? proposals.length}
                styles={styles}
              />
              <StatChip label="Signalements" value={stats?.reportsOpen ?? 0} styles={styles} />
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Propositions à la une</Text>
        {proposals.length === 0 ? (
          <Text style={styles.empty}>Aucune proposition en attente.</Text>
        ) : (
          proposals.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.feedTitle ? (
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.feedTitle}
                </Text>
              ) : null}
              <Text style={styles.cardHint} numberOfLines={1}>
                {item.articleUrl}
              </Text>
              <Text style={styles.cardHint} numberOfLines={1}>
                {new Date(item.createdAt).toLocaleString('fr-FR')} ·{' '}
                {item.proposedBy.slice(0, 8)}…
              </Text>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => onProposalAction(item, 'approve')}
                  disabled={busy}
                  style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.smallBtnText}>Valider</Text>
                </Pressable>
                <Pressable
                  onPress={() => onProposalAction(item, 'reject')}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.smallBtn,
                    styles.smallBtnDanger,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.smallBtnText, { color: palette.danger }]}>Refuser</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>À la une</Text>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="list-outline" size={18} color={palette.accent} />
            <Text style={styles.btnText}>Depuis les flux</Text>
          </Pressable>
          <Pressable
            onPress={() => setManualVisible(true)}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="link-outline" size={18} color={palette.accent} />
            <Text style={styles.btnText}>Coller URL</Text>
          </Pressable>
        </View>

        {featured.length === 0 ? (
          <Text style={styles.empty}>Aucun article mis en avant.</Text>
        ) : (
          featured.map((item, index) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.feedTitle ? (
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.feedTitle}
                </Text>
              ) : null}
              <Text style={styles.cardHint} numberOfLines={1}>
                {item.articleUrl}
              </Text>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => void moveFeatured(item.id, -1)}
                  disabled={index === 0 || busy}
                  style={styles.iconBtn}
                >
                  <Ionicons name="chevron-up" size={20} color={palette.text} />
                </Pressable>
                <Pressable
                  onPress={() => void moveFeatured(item.id, 1)}
                  disabled={index === featured.length - 1 || busy}
                  style={styles.iconBtn}
                >
                  <Ionicons name="chevron-down" size={20} color={palette.text} />
                </Pressable>
                <Pressable
                  onPress={() => void unpin(item.id)}
                  disabled={busy}
                  style={styles.iconBtn}
                >
                  <Ionicons name="close-circle-outline" size={20} color={palette.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>Signalements ouverts</Text>
        {reports.length === 0 ? (
          <Text style={styles.empty}>Aucun signalement en attente.</Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.card}>
              <Text style={styles.cardMeta}>
                {report.commentPseudo ?? 'Anonyme'} · {report.reason}
              </Text>
              <Text style={styles.cardTitle} numberOfLines={4}>
                {report.commentBody ?? '(commentaire introuvable)'}
              </Text>
              {report.articleTitle ? (
                <Text style={styles.cardHint} numberOfLines={1}>
                  {report.articleTitle}
                </Text>
              ) : null}
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => onReportAction(report, 'reviewed')}
                  style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.smallBtnText}>Vu</Text>
                </Pressable>
                <Pressable
                  onPress={() => onReportAction(report, 'dismissed')}
                  style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.smallBtnText}>Ignorer</Text>
                </Pressable>
                <Pressable
                  onPress={() => onReportAction(report, 'delete')}
                  style={({ pressed }) => [
                    styles.smallBtn,
                    styles.smallBtnDanger,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.smallBtnText, { color: palette.danger }]}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>Digest push (test)</Text>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => runDigest('morning')}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.btnText}>Matin</Text>
          </Pressable>
          <Pressable
            onPress={() => runDigest('evening')}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.btnText}>Soir</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => runDigest('midday')}
          style={({ pressed }) => [styles.btn, { marginBottom: spacing.lg }, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.btnText}>Midi</Text>
        </Pressable>

        {busy ? (
          <ActivityIndicator color={palette.accent} style={{ marginBottom: spacing.lg }} />
        ) : null}
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choisir un article</Text>
            <ScrollView style={styles.modalScroll}>
              {recentArticles.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => void pinFromArticle(a)}
                  style={({ pressed }) => [styles.modalRow, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.modalRowFeed} numberOfLines={1}>
                    {a.feedTitle}
                  </Text>
                  <Text style={styles.modalRowTitle} numberOfLines={2}>
                    {a.title}
                  </Text>
                </Pressable>
              ))}
              {recentArticles.length === 0 ? (
                <Text style={[styles.empty, { padding: spacing.md }]}>
                  Aucun article chargé — actualisez l’accueil d’abord.
                </Text>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={() => setPickerVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={manualVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setManualVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Coller un article</Text>
            <View style={styles.formPad}>
              <Text style={styles.fieldLabel}>URL</Text>
              <TextInput
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://…"
                placeholderTextColor={palette.textMuted}
                style={styles.field}
              />
              <Text style={styles.fieldLabel}>Titre</Text>
              <TextInput
                value={manualTitle}
                onChangeText={setManualTitle}
                placeholder="Titre affiché"
                placeholderTextColor={palette.textMuted}
                style={styles.field}
              />
              <Text style={styles.fieldLabel}>Note (optionnel)</Text>
              <TextInput
                value={manualNote}
                onChangeText={setManualNote}
                placeholder="Ex. Coup de cœur éditorial"
                placeholderTextColor={palette.textMuted}
                style={styles.field}
              />
              <Pressable
                onPress={() => void submitManual()}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.primaryBtnText}>Mettre à la une</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setManualVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatChip({
  label,
  value,
  hint,
  styles,
}: {
  label: string;
  value: number | string;
  hint?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    sectionLabel: {
      ...typography.caption,
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    subSectionLabel: {
      ...typography.caption,
      color: palette.textMuted,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
      fontWeight: '600',
    },
    card: {
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: palette.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    cardTitle: { ...typography.subtitle, color: palette.text, marginBottom: 4 },
    cardMeta: { ...typography.caption, color: palette.textMuted, marginBottom: 2 },
    cardHint: { ...typography.caption, color: palette.textMuted, opacity: 0.85 },
    empty: { ...typography.caption, color: palette.textMuted, marginBottom: spacing.sm },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    statChip: {
      width: '47%',
      flexGrow: 1,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    statValue: { ...typography.title, color: palette.text, fontSize: 22 },
    statLabel: { ...typography.caption, color: palette.textMuted, marginTop: 4 },
    statHint: {
      ...typography.caption,
      color: palette.textMuted,
      opacity: 0.8,
      marginTop: 2,
      fontSize: 11,
    },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    btnText: { ...typography.caption, color: palette.accent, fontWeight: '600' },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    iconBtn: { padding: spacing.xs },
    smallBtn: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 8,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    smallBtnDanger: { borderColor: palette.danger },
    smallBtnText: { ...typography.caption, color: palette.text, fontWeight: '600' },
    blocked: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    blockedTitle: { ...typography.subtitle, color: palette.text },
    blockedHint: {
      ...typography.caption,
      color: palette.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
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
      maxHeight: '80%',
    },
    modalTitle: {
      ...typography.subtitle,
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    modalScroll: { maxHeight: 420 },
    modalRow: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    modalRowFeed: { ...typography.caption, color: palette.textMuted, marginBottom: 2 },
    modalRowTitle: { ...typography.body, color: palette.text },
    modalCancel: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
    },
    modalCancelText: { ...typography.subtitle, color: palette.accent },
    formPad: { paddingHorizontal: spacing.md, gap: spacing.xs },
    fieldLabel: { ...typography.caption, color: palette.textMuted, marginTop: spacing.sm },
    field: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.text,
      backgroundColor: palette.bg,
      ...typography.body,
    },
    primaryBtn: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: palette.accent,
      alignItems: 'center',
    },
    primaryBtnText: { ...typography.subtitle, color: palette.onAccent },
  });
}
