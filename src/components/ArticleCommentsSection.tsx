import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import { useComments } from '../context/CommentsContext';
import type { ArticleComment } from '../types/comment';
import {
  deleteOwnArticleComment,
  fetchArticleComments,
  isCommentsServiceConfigured,
  postArticleComment,
} from '../services/articleCommentsService';
import {
  COMMENT_BODY_MAX,
  COMMENT_PSEUDO_MAX,
  COMMENT_PSEUDO_MIN,
  forgetMyCommentId,
  getOrCreateCommentAuthorToken,
  isValidCommentBody,
  isValidCommentPseudo,
  loadMyCommentIds,
  rememberMyCommentId,
  sanitizeCommentBody,
  sanitizeCommentPseudo,
} from '../utils/commentIdentity';
import { threadIdForArticleUrl } from '../utils/commentThreadId';
import { formatRelative } from '../utils/formatTime';

type Props = {
  articleUrl: string;
  articleTitle: string;
  /** Fait défiler le lecteur pour garder la zone de saisie au-dessus du clavier. */
  onComposeFocus?: () => void;
};

export function ArticleCommentsSection({ articleUrl, articleTitle, onComposeFocus }: Props) {
  const { palette, commentPseudo, setCommentPseudo } = useAppSettings();
  const { t } = useTranslation();
  const { refreshStats } = useComments();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const configured = isCommentsServiceConfigured();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pseudoDraft, setPseudoDraft] = useState(commentPseudo);
  const [posting, setPosting] = useState(false);
  const [authorToken, setAuthorToken] = useState<string | null>(null);
  const [myCommentIds, setMyCommentIds] = useState<Set<string>>(() => new Set());

  const handleComposeFocus = useCallback(() => {
    onComposeFocus?.();
  }, [onComposeFocus]);

  useEffect(() => {
    setPseudoDraft(commentPseudo);
  }, [commentPseudo]);

  useEffect(() => {
    let cancelled = false;
    void threadIdForArticleUrl(articleUrl).then((id) => {
      if (!cancelled) setThreadId(id);
    });
    void getOrCreateCommentAuthorToken().then(async (token) => {
      if (cancelled) return;
      setAuthorToken(token);
      const ids = await loadMyCommentIds(token);
      if (!cancelled) setMyCommentIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [articleUrl]);

  const reload = useCallback(async () => {
    if (!configured || !threadId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchArticleComments(threadId);
      setComments(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('comments.networkError'));
    } finally {
      setLoading(false);
    }
  }, [configured, threadId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = useCallback(async () => {
    if (!configured || !threadId || !authorToken) return;
    const pseudo = sanitizeCommentPseudo(pseudoDraft || commentPseudo);
    const body = sanitizeCommentBody(draft);
    if (!isValidCommentPseudo(pseudo)) {
      Alert.alert(
        t('comments.pseudoRequired'),
        t('comments.pseudoRequiredHint', { min: COMMENT_PSEUDO_MIN, max: COMMENT_PSEUDO_MAX }),
      );
      return;
    }
    if (!isValidCommentBody(body)) {
      Alert.alert(t('comments.emptyComment'), t('comments.emptyComment'));
      return;
    }
    setPosting(true);
    try {
      if (pseudo !== commentPseudo) {
        await setCommentPseudo(pseudo);
      }
      const created = await postArticleComment({
        threadId,
        articleUrl,
        articleTitle,
        pseudo,
        body,
        authorToken,
      });
      await rememberMyCommentId(created.id);
      setMyCommentIds((prev) => new Set(prev).add(created.id));
      setComments((prev) => [...prev, created]);
      setDraft('');
      void refreshStats();
    } catch (e) {
      Alert.alert(
        t('comments.sendFailed'),
        e instanceof Error ? e.message : t('comments.sendFailed'),
      );
    } finally {
      setPosting(false);
    }
  }, [
    articleTitle,
    articleUrl,
    authorToken,
    commentPseudo,
    configured,
    draft,
    pseudoDraft,
    setCommentPseudo,
    threadId,
    refreshStats,
  ]);

  const removeOwn = useCallback(
    (comment: ArticleComment) => {
      if (!authorToken || !myCommentIds.has(comment.id)) return;
      Alert.alert(t('comments.deleteTitle'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            void deleteOwnArticleComment(comment.id, authorToken)
              .then(async () => {
                await forgetMyCommentId(comment.id);
                setMyCommentIds((prev) => {
                  const next = new Set(prev);
                  next.delete(comment.id);
                  return next;
                });
                setComments((prev) => prev.filter((c) => c.id !== comment.id));
                void refreshStats();
              })
              .catch(() => Alert.alert(t('comments.deleteFailed')));
          },
        },
      ]);
    },
    [authorToken, myCommentIds, refreshStats, t],
  );

  const reportComment = useCallback(
    (comment: ArticleComment) => {
      Alert.alert(t('comments.reportTitle'), t('comments.reportMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('comments.report'),
          style: 'destructive',
          onPress: () => {
            void import('../services/commentReportService')
              .then(({ reportArticleComment }) =>
                reportArticleComment({
                  commentId: comment.id,
                  reporterToken: authorToken,
                  reason: 'inappropriate',
                }),
              )
              .then(() => Alert.alert(t('comments.reportThanksTitle'), t('comments.reportThanks')))
              .catch(() => Alert.alert(t('comments.reportFailed')));
          },
        },
      ]);
    },
    [authorToken],
  );

  const onCommentLongPress = useCallback(
    (comment: ArticleComment) => {
      const own = myCommentIds.has(comment.id);
      if (own) {
        removeOwn(comment);
        return;
      }
      reportComment(comment);
    },
    [myCommentIds, removeOwn, reportComment],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Ionicons name="chatbubbles-outline" size={20} color={palette.accentMuted} />
        <Text style={styles.title}>{t('comments.title')}</Text>
        {loading ? <ActivityIndicator size="small" color={palette.accent} /> : null}
        {!loading ? (
          <Pressable onPress={() => void reload()} hitSlop={10} accessibilityLabel={t('common.refresh')}>
            <Ionicons name="refresh-outline" size={20} color={palette.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {!configured ? (
        <Text style={styles.hint}>{t('comments.unavailable')}</Text>
      ) : null}

      {configured && loadError ? (
        <Text style={styles.error}>{loadError}</Text>
      ) : null}

      {configured && !loading && comments.length === 0 && !loadError ? (
        <Text style={styles.hint}>{t('comments.empty')}</Text>
      ) : null}

      {comments.map((c) => {
        const own = myCommentIds.has(c.id);
        return (
          <Pressable
            key={c.id}
            onLongPress={() => onCommentLongPress(c)}
            style={({ pressed }) => [styles.commentCard, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.commentMeta}>
              <Text style={styles.pseudo}>{c.pseudo}</Text>
              <Text style={styles.time}>{formatRelative(c.createdAt)}</Text>
            </View>
            <Text style={styles.body}>{c.body}</Text>
            <Text style={styles.ownHint}>
              {own ? t('comments.longPressDelete') : t('comments.longPressReport')}
            </Text>
          </Pressable>
        );
      })}

      {configured ? (
        <View style={styles.compose}>
          <TextInput
            value={pseudoDraft}
            onChangeText={setPseudoDraft}
            onFocus={handleComposeFocus}
            placeholder={t('comments.pseudoPlaceholder')}
            placeholderTextColor={palette.textMuted}
            maxLength={COMMENT_PSEUDO_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.pseudoInput}
          />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onFocus={handleComposeFocus}
            placeholder={t('comments.bodyPlaceholder')}
            placeholderTextColor={palette.textMuted}
            maxLength={COMMENT_BODY_MAX}
            multiline
            scrollEnabled={false}
            style={styles.input}
          />
          <Pressable
            onPress={() => void submit()}
            disabled={posting}
            style={({ pressed }) => [
              styles.sendBtn,
              posting && { opacity: 0.6 },
              pressed && !posting && { opacity: 0.88 },
            ]}
          >
            {posting ? (
              <ActivityIndicator size="small" color={palette.onAccent} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={palette.onAccent} />
                <Text style={styles.sendText}>{t('comments.publish')}</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.disclaimer}>{t('comments.disclaimer')}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.xl,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.subtitle,
      color: palette.text,
      flex: 1,
      fontWeight: '600',
    },
    hint: {
      ...typography.caption,
      color: palette.textMuted,
      marginBottom: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: palette.accent,
      marginBottom: spacing.sm,
    },
    commentCard: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: 10,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
    },
    commentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    pseudo: {
      ...typography.caption,
      color: palette.accentMuted,
      fontWeight: '700',
    },
    time: {
      ...typography.caption,
      color: palette.textMuted,
      fontSize: 11,
    },
    body: {
      ...typography.body,
      color: palette.text,
    },
    ownHint: {
      ...typography.caption,
      color: palette.textMuted,
      marginTop: spacing.xs,
      fontSize: 11,
    },
    compose: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    pseudoInput: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.text,
      backgroundColor: palette.surfaceElevated,
      ...typography.body,
    },
    input: {
      minHeight: 88,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.text,
      backgroundColor: palette.surfaceElevated,
      textAlignVertical: 'top',
      ...typography.body,
    },
    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.accent,
      borderRadius: 10,
      paddingVertical: spacing.md,
    },
    sendText: {
      ...typography.subtitle,
      color: palette.onAccent,
      fontWeight: '600',
    },
    disclaimer: {
      ...typography.caption,
      color: palette.textMuted,
      lineHeight: 18,
    },
  });
}
