import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ArticleHtmlImgRenderer } from '../components/ArticleHtmlImgRenderer';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  pickRicherArticleHtml,
  rssBodyLikelyComplete,
} from '../utils/articleHtmlMerge';
import { fetchArticleHtmlFallback } from '../utils/fetchArticleHtmlFallback';

type Props = NativeStackScreenProps<RootStackParamList, 'ArticleReader'>;

const WEBVIEW_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Balises non rendues par react-native-render-html (évite les avertissements « non géré »). */
const RENDER_HTML_IGNORED_TAGS = ['svg', 'source', 'noscript'] as const;

/** Références stables : évite les rerenders coûteux de TRenderEngineProvider (voir lib). */
const RENDER_HTML_IGNORED_TAGS_STABLE = [...RENDER_HTML_IGNORED_TAGS];
const RENDER_HTML_DEFAULT_TEXT_PROPS = { selectable: true as const };

/** Aligné sur parseFeed : articles avec surtout des images comptent aussi */
function hasUsableArticleHtml(html: string | undefined): boolean {
  if (!html || html.trim().length < 52) return false;
  const textOnly = html.replace(/<[^>]+>/g, '').trim();
  if (textOnly.length >= 18) return true;
  if (html.length > 220 && /<(?:img|video|iframe|figure|picture)\b/i.test(html)) return true;
  return html.trim().length > 300;
}

function hasUsableChapo(text: string | undefined): boolean {
  return !!text && text.trim().length >= 15;
}

function htmlToPlainPreview(html: string, maxChars: number): string {
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trim()}…`;
}

export function ArticleReaderScreen({ route, navigation }: Props) {
  const { articleId, url, title } = route.params;
  const { articles } = useFeeds();
  const { readerDefaultView, palette } = useAppSettings();
  const styles = useMemo(() => createArticleReaderStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, width - spacing.md * 2);

  const article = useMemo(
    () => articles.find((a) => a.id === articleId),
    [articles, articleId],
  );

  const rssBody = article?.bodyHtml;
  const chapoPlain = article?.chapoPlain;
  const feedTitle = article?.feedTitle;

  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);

  const [showFullArticle, setShowFullArticle] = useState(
    () => readerDefaultView === 'full',
  );
  const [webModalVisible, setWebModalVisible] = useState(false);
  const [showInlineWeb, setShowInlineWeb] = useState(false);
  const [inlineWebLoading, setInlineWebLoading] = useState(false);

  const displayHtml =
    pickRicherArticleHtml(rssBody, fetchedHtml ?? undefined) ??
    rssBody ??
    fetchedHtml ??
    '';
  const hasFullArticle = hasUsableArticleHtml(displayHtml);
  const fromPage = !!fetchedHtml && hasFullArticle;

  useEffect(() => {
    setFetchedHtml(null);
    setFetchDone(false);
    setFetchLoading(false);
    setWebModalVisible(false);
    setShowInlineWeb(false);
    setInlineWebLoading(false);
  }, [articleId]);

  useEffect(() => {
    setShowFullArticle(readerDefaultView === 'full');
  }, [articleId, readerDefaultView]);

  useEffect(() => {
    if (!article || !url) return;
    if (rssBodyLikelyComplete(rssBody)) {
      setFetchLoading(false);
      setFetchDone(true);
      return;
    }
    let cancelled = false;
    setFetchLoading(true);
    void fetchArticleHtmlFallback(url)
      .then((h) => {
        if (cancelled) return;
        if (h) setFetchedHtml(h);
      })
      .finally(() => {
        if (!cancelled) {
          setFetchLoading(false);
          setFetchDone(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [article, url, rssBody]);

  /** Zone affichée avant mesure réelle — limite les sauts quand width/height HTML manquent (Les Numériques, etc.). */
  const imgPlaceholderDimensions = useMemo(() => {
    const w = Math.max(1, contentWidth);
    return {
      width: w,
      height: Math.max(180, Math.round((w * 9) / 16)),
    };
  }, [contentWidth]);

  const renderersProps = useMemo(
    () => ({
      img: {
        initialDimensions: imgPlaceholderDimensions,
      },
    }),
    [imgPlaceholderDimensions],
  );

  const htmlRenderers = useMemo(
    () => ({
      img: ArticleHtmlImgRenderer,
    }),
    [],
  );

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: palette.text,
        fontSize: 16,
        lineHeight: 26,
      },
      p: { marginTop: 0, marginBottom: spacing.sm },
      h1: {
        color: palette.text,
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '700' as const,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
      },
      h2: {
        color: palette.text,
        fontSize: 22,
        lineHeight: 30,
        fontWeight: '700' as const,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      },
      h3: {
        color: palette.text,
        fontSize: 19,
        lineHeight: 28,
        fontWeight: '600' as const,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      },
      h4: {
        color: palette.text,
        fontSize: 17,
        lineHeight: 26,
        fontWeight: '600' as const,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
      },
      h5: {
        color: palette.text,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600' as const,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
      },
      h6: {
        color: palette.textMuted,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '600' as const,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
      },
      strong: {
        fontWeight: '700' as const,
        color: palette.text,
      },
      em: {
        fontStyle: 'italic' as const,
        color: palette.text,
      },
      a: { color: palette.accentMuted, textDecorationLine: 'underline' as const },
      li: { marginBottom: spacing.xs },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: palette.accent,
        paddingLeft: spacing.md,
        color: palette.textMuted,
      },
      figure: {
        marginVertical: spacing.sm,
        alignSelf: 'stretch' as const,
        width: contentWidth,
      },
      picture: {
        alignSelf: 'stretch' as const,
        marginVertical: spacing.sm,
        width: contentWidth,
      },
      img: {
        borderRadius: 8,
        alignSelf: 'center' as const,
      },
    }),
    [contentWidth, palette],
  );

  const renderHtmlSource = useMemo(() => ({ html: displayHtml }), [displayHtml]);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(url);
    } catch {
      /* ignore */
    }
  }, [url]);

  const openExternalBrowser = useCallback(() => {
    void WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }, [url]);

  const shareArticle = useCallback(() => {
    const message = `${title}\n${url}`;
    void Share.share(
      Platform.OS === 'ios'
        ? { url, title, message }
        : { title, message },
    );
  }, [title, url]);

  const openArticleMenu = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Annuler',
            'Copier le lien',
            'Ouvrir dans le navigateur externe',
            'Partager…',
          ],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) void copyLink();
          if (buttonIndex === 2) openExternalBrowser();
          if (buttonIndex === 3) void shareArticle();
        },
      );
    } else {
      Alert.alert('Article', undefined, [
        { text: 'Copier le lien', onPress: () => void copyLink() },
        { text: 'Navigateur externe', onPress: openExternalBrowser },
        { text: 'Partager', onPress: () => void shareArticle() },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  }, [copyLink, openExternalBrowser, shareArticle]);

  const headerRight = useCallback(
    () => (
      <View style={styles.headerRightRow}>
        <Pressable
          onPress={() => setWebModalVisible(true)}
          hitSlop={12}
          accessibilityLabel="Page web dans l’app"
          style={styles.headerBtn}
        >
          <Ionicons name="globe-outline" size={22} color={palette.accentMuted} />
        </Pressable>
        <Pressable
          onPress={openArticleMenu}
          hitSlop={12}
          accessibilityLabel="Plus d’options"
          style={styles.headerBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={palette.accentMuted} />
        </Pressable>
      </View>
    ),
    [openArticleMenu, palette, styles],
  );

  useEffect(() => {
    navigation.setOptions({
      title: title.length > 34 ? `${title.slice(0, 34)}…` : title,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: palette.bg },
      headerTintColor: palette.text,
      headerTitleStyle: { ...typography.body, fontWeight: '600', color: palette.text },
      headerRight,
    });
  }, [navigation, title, headerRight, palette]);

  const webModal = (
    <Modal
      visible={webModalVisible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={() => setWebModalVisible(false)}
    >
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        <View style={styles.modalBar}>
          <Pressable
            onPress={() => setWebModalVisible(false)}
            hitSlop={12}
            style={styles.modalCloseBtn}
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={28} color={palette.text} />
          </Pressable>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.modalBarSpacer} />
        </View>
        <WebView source={{ uri: url }} style={styles.modalWebview} userAgent={WEBVIEW_UA} />
      </View>
    </Modal>
  );

  if (!article) {
    return (
      <View style={styles.flex}>
        {webModal}
        <View style={styles.banner}>
          <Ionicons name="alert-circle-outline" size={18} color={palette.textMuted} />
          <Text style={styles.bannerText}>
            Article introuvable (liste actualisée). Ouverture de la page en ligne.
          </Text>
        </View>
        <WebView source={{ uri: url }} style={styles.webview} userAgent={WEBVIEW_UA} />
      </View>
    );
  }

  const chapoOk = hasUsableChapo(chapoPlain);
  const webOnlyFallback =
    fetchDone && !fetchLoading && !chapoOk && !hasFullArticle;

  const previewBody =
    chapoOk && chapoPlain
      ? chapoPlain.trim()
      : hasFullArticle
        ? htmlToPlainPreview(displayHtml, 520)
        : '';

  /** Article HTML disponible : aperçu (chapô / extrait) puis bouton pour le corps complet */
  if (hasFullArticle && displayHtml && !showFullArticle) {
    return (
      <View style={styles.flex}>
        {webModal}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator
        >
          <View style={styles.sourceBanner}>
            <Ionicons
              name={fromPage ? 'cloud-download-outline' : 'newspaper-outline'}
              size={16}
              color={fromPage ? palette.accentMuted : palette.success}
            />
            <Text style={styles.sourceBannerText}>
              {fromPage
                ? 'Texte complet récupéré depuis le site — affichez-le ci-dessous.'
                : 'Article complet fourni par le flux RSS — affichez-le ci-dessous.'}
            </Text>
          </View>
          {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
          {previewBody ? (
            <Text style={styles.chapoBody} selectable>
              {previewBody}
            </Text>
          ) : (
            <Text style={styles.fetchHint}>Aperçu indisponible — ouvrez l’article entier.</Text>
          )}
          <Pressable
            onPress={() => setShowFullArticle(true)}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="document-text-outline" size={22} color={palette.text} />
            <Text style={styles.primaryBtnText}>Afficher l’article entier</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (hasFullArticle && displayHtml && showFullArticle) {
    return (
      <View style={styles.flex}>
        {webModal}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator
        >
          <Pressable
            onPress={() => setShowFullArticle(false)}
            style={({ pressed }) => [styles.backPreviewBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chevron-back" size={22} color={palette.accentMuted} />
            <Text style={styles.backPreviewText}>Revenir à l’aperçu</Text>
          </Pressable>
          <View style={styles.sourceBanner}>
            <Ionicons
              name={fromPage ? 'cloud-download-outline' : 'newspaper-outline'}
              size={16}
              color={fromPage ? palette.accentMuted : palette.success}
            />
            <Text style={styles.sourceBannerText}>
              {fromPage
                ? 'Texte récupéré depuis la page web (article complet)'
                : 'Article complet fourni par le flux RSS'}
            </Text>
          </View>
          {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
          <RenderHtml
            contentWidth={contentWidth}
            source={renderHtmlSource}
            tagsStyles={tagsStyles}
            baseStyle={styles.htmlBase}
            ignoredDomTags={RENDER_HTML_IGNORED_TAGS_STABLE}
            renderers={htmlRenderers}
            renderersProps={renderersProps}
            defaultTextProps={RENDER_HTML_DEFAULT_TEXT_PROPS}
          />
        </ScrollView>
      </View>
    );
  }

  if (webOnlyFallback) {
    return (
      <View style={styles.flex}>
        {webModal}
        <View style={styles.banner}>
          <Ionicons name="globe-outline" size={18} color={palette.textMuted} />
          <Text style={styles.bannerText}>
            Aucun extrait dans le flux et extraction depuis la page impossible — affichage du site.
          </Text>
        </View>
        <WebView source={{ uri: url }} style={styles.webview} userAgent={WEBVIEW_UA} />
      </View>
    );
  }

  return (
    <View style={styles.flexColumn}>
      {webModal}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: spacing.lg + insets.bottom },
        ]}
        showsVerticalScrollIndicator
      >
        <View style={styles.sourceBanner}>
          <Ionicons name="hourglass-outline" size={16} color={palette.accentMuted} />
          <Text style={styles.sourceBannerText}>
            {fetchLoading
              ? 'Récupération du texte complet sur le site…'
              : 'Le flux ne contient qu’un extrait — lecture complète chargée ou en attente'}
          </Text>
        </View>
        {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
        {fetchLoading ? (
          <View style={styles.fetchRow}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.fetchHint}>Analyse de la page pour extraire l’article…</Text>
          </View>
        ) : null}
        {chapoOk && chapoPlain ? (
          <Text style={styles.chapoBody} selectable>
            {chapoPlain.trim()}
          </Text>
        ) : !fetchLoading ? (
          <Text style={styles.fetchHint}>
            Utilisez le globe en haut à droite pour ouvrir la page dans l’app, ou le menu ••• pour
            plus d’options.
          </Text>
        ) : null}
        <Pressable
          onPress={() => {
            setShowInlineWeb((prev) => {
              const next = !prev;
              if (next) setInlineWebLoading(true);
              else setInlineWebLoading(false);
              return next;
            });
          }}
          style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.88 }]}
        >
          <Ionicons
            name={showInlineWeb ? 'chevron-up' : 'layers-outline'}
            size={20}
            color={palette.text}
          />
          <Text style={styles.toggleBtnText}>
            {showInlineWeb ? 'Masquer la page sous l’extrait' : 'Afficher la page sous l’extrait'}
          </Text>
        </Pressable>
      </ScrollView>
      {showInlineWeb ? (
        <View style={styles.webSplit}>
          {inlineWebLoading ? (
            <View style={styles.wvLoadingSplit}>
              <ActivityIndicator size="large" color={palette.accent} />
              <Text style={styles.loadingText}>Chargement…</Text>
            </View>
          ) : null}
          <WebView
            source={{ uri: url }}
            style={styles.webviewSplit}
            onLoadEnd={() => setInlineWebLoading(false)}
            onError={() => setInlineWebLoading(false)}
            startInLoadingState
            userAgent={WEBVIEW_UA}
          />
        </View>
      ) : null}
    </View>
  );
}

function createArticleReaderStyles(palette: AppPalette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  flexColumn: { flex: 1, backgroundColor: palette.bg },
  scroll: { flex: 1, backgroundColor: palette.bg },
  scrollInner: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
    gap: spacing.xs,
  },
  modalRoot: { flex: 1, backgroundColor: palette.bg },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    backgroundColor: palette.bg,
  },
  modalCloseBtn: { padding: spacing.sm },
  modalTitle: {
    ...typography.subtitle,
    color: palette.text,
    flex: 1,
    textAlign: 'center',
  },
  modalBarSpacer: { width: 44 },
  modalWebview: { flex: 1, backgroundColor: palette.bg },
  sourceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sourceBannerText: { ...typography.caption, color: palette.textMuted, flex: 1 },
  feedTag: {
    ...typography.caption,
    color: palette.accentMuted,
    marginBottom: spacing.md,
  },
  htmlBase: { color: palette.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: palette.surfaceElevated,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.accent,
    marginTop: spacing.md,
  },
  primaryBtnText: {
    ...typography.subtitle,
    color: palette.text,
    fontWeight: '600',
  },
  backPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  backPreviewText: {
    ...typography.body,
    color: palette.accentMuted,
    fontWeight: '500',
  },
  fetchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fetchHint: { ...typography.caption, color: palette.textMuted, marginBottom: spacing.sm },
  chapoBody: {
    ...typography.body,
    color: palette.text,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceElevated,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: spacing.sm,
  },
  toggleBtnText: {
    ...typography.subtitle,
    color: palette.text,
    flexShrink: 1,
  },
  webSplit: {
    flex: 1,
    minHeight: 280,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bg,
  },
  webviewSplit: { flex: 1, backgroundColor: palette.bg },
  wvLoadingSplit: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
    zIndex: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surfaceElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  bannerText: { ...typography.caption, color: palette.textMuted, flex: 1 },
  webview: { flex: 1, backgroundColor: palette.bg },
  loadingText: { ...typography.body, color: palette.textMuted, marginTop: spacing.sm },
  headerBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});
}
