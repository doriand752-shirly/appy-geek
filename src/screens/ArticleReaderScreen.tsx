import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Keyboard,
  Linking,
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

import { ArticleFooterAd } from '../components/ArticleFooterAd';
import { ArticleCommentsSection } from '../components/ArticleCommentsSection';
import { ArticleSummaryCard } from '../components/ArticleSummaryCard';
import { ArticleHtmlIframeRenderer } from '../components/ArticleHtmlIframeRenderer';
import { ArticleHtmlImgRenderer } from '../components/ArticleHtmlImgRenderer';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useAuth } from '../context/AuthContext';
import { useFeeds } from '../context/FeedsContext';
import { localeDateTimeLocale, useTranslation } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { proposeFeaturedArticle } from '../services/featuredProposalsService';
import type { ParsedArticle } from '../types/article';
import {
  pickRicherArticleHtml,
  rssBodyLikelyComplete,
  strippedArticleTextLen,
} from '../utils/articleHtmlMerge';
import { fetchArticleHtmlFallback } from '../utils/fetchArticleHtmlFallback';
import { isLikelyDirectImageAssetUrl } from '../utils/imageLinks';
import { getCachedArticle } from '../utils/offlineCache';
import { hapticLight } from '../utils/haptics';
import { sanitizeArticleHtml } from '../utils/sanitizeArticleHtml';

type Props = NativeStackScreenProps<RootStackParamList, 'ArticleReader'>;

type ReaderNav = {
  setOptions: NativeStackScreenProps<RootStackParamList, 'ArticleReader'>['navigation']['setOptions'];
};

export type ArticleReaderContentProps = {
  articleId: string;
  url: string;
  title: string;
  offlineHtml?: string;
  navigation: ReaderNav;
  embedded?: boolean;
  onRequestClose?: () => void;
  layoutWidth?: number;
};

function htmlToSpeechText(html: string, maxChars = 4000): string {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trim()}…`;
}

const WEBVIEW_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Balises ignorées (les `<picture>` sont converties en `<img>` avant rendu). */
const RENDER_HTML_IGNORED_TAGS = ['svg', 'noscript'] as const;

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
  return (
    <ArticleReaderContent
      articleId={route.params.articleId}
      url={route.params.url}
      title={route.params.title}
      offlineHtml={route.params.offlineHtml}
      navigation={navigation}
    />
  );
}

export function ArticleReaderContent({
  articleId,
  url,
  title,
  offlineHtml: offlineHtmlParam,
  navigation,
  embedded = false,
  onRequestClose,
  layoutWidth,
}: ArticleReaderContentProps) {
  const { articles, favoriteIds, toggleFavorite } = useFeeds();
  const { user, signInWithApple, appleAvailable } = useAuth();
  const { readerDefaultView, readerFontMetrics, palette, appLocale, navigationTheme } =
    useAppSettings();
  const actionSheetUiStyle = navigationTheme.dark ? ('dark' as const) : ('light' as const);
  const { t } = useTranslation();
  const styles = useMemo(
    () => createArticleReaderStyles(palette, readerFontMetrics),
    [palette, readerFontMetrics],
  );
  const windowSize = useWindowDimensions();
  const width = layoutWidth && layoutWidth > 0 ? layoutWidth : windowSize.width;
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, width - spacing.md * 2);
  const scrollRef = useRef<ScrollView>(null);
  /** Hauteur clavier manuelle — évite l’espace vide sous les commentaires laissé par automaticallyAdjustKeyboardInsets. */
  const [keyboardBottom, setKeyboardBottom] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardBottom(e.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardBottom(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const commentsSectionY = useRef(0);

  const scrollBottomPad =
    keyboardBottom > 0
      ? keyboardBottom + spacing.sm
      : spacing.sm + Math.max(insets.bottom, 0);

  const scrollToComments = useCallback(() => {
    const scroll = () => {
      const y = Math.max(0, commentsSectionY.current - spacing.md);
      scrollRef.current?.scrollTo({ y, animated: true });
    };
    requestAnimationFrame(scroll);
    setTimeout(scroll, Platform.OS === 'ios' ? 280 : 120);
  }, []);

  const readerScrollProps = {
    ref: scrollRef,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'interactive' as const,
    /** Empêche iOS d’ajouter un inset fantôme sous le contenu après fermeture du clavier. */
    contentInsetAdjustmentBehavior: 'never' as const,
  };

  const articleFromFeed = useMemo(
    () => articles.find((a) => a.id === articleId),
    [articles, articleId],
  );
  /** HTML + meta lus depuis le cache disque (toujours, même si l’article est encore dans le flux). */
  const [diskCache, setDiskCache] = useState<{
    article: ParsedArticle;
    html: string;
  } | null>(null);
  const [diskCacheReady, setDiskCacheReady] = useState(false);

  /**
   * Article ouvert depuis « Discussions » alors qu’il n’est plus dans le flux :
   * on reconstruit un article minimal pour charger le contenu depuis la page
   * et toujours afficher les commentaires associés.
   */
  const syntheticArticle = useMemo<ParsedArticle | null>(() => {
    if (!url) return null;
    return {
      id: articleId,
      title: title?.trim() || t('discussions.articleFallback'),
      link: url,
      publishedAt: Date.now(),
      summary: '',
      feedId: 'external',
      feedTitle: '',
    };
  }, [articleId, t, title, url]);

  const article = articleFromFeed ?? diskCache?.article ?? syntheticArticle;
  const isFavorite = favoriteIds.has(articleId);

  useEffect(() => {
    let cancelled = false;
    setDiskCache(null);
    setDiskCacheReady(false);
    void getCachedArticle(articleId)
      .then((rec) => {
        if (cancelled || !rec?.html?.trim()) return;
        setDiskCache({ article: rec.article, html: rec.html });
      })
      .finally(() => {
        if (!cancelled) setDiskCacheReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

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
  const [speaking, setSpeaking] = useState(false);

  const cachedOfflineHtml =
    offlineHtmlParam?.trim() || diskCache?.html?.trim() || '';
  const usingOfflineCache = cachedOfflineHtml.length > 0;

  const liveHtml =
    pickRicherArticleHtml(rssBody, fetchedHtml ?? undefined, url) ||
    rssBody ||
    fetchedHtml ||
    '';

  /** Cache hors ligne prioritaire s’il est au moins aussi riche que le RSS / le fetch. */
  const displayHtml =
    pickRicherArticleHtml(liveHtml || undefined, cachedOfflineHtml || undefined, url) ||
    cachedOfflineHtml ||
    liveHtml ||
    '';

  /** Nettoyage HTML différé — évite de bloquer l’ouverture du lecteur (gros articles / Expo Go). */
  const [articleHtmlForReader, setArticleHtmlForReader] = useState('');
  const [sanitizeDone, setSanitizeDone] = useState(true);

  useEffect(() => {
    const raw = displayHtml.trim();
    if (!raw) {
      setArticleHtmlForReader('');
      setSanitizeDone(true);
      return;
    }
    let cancelled = false;
    setSanitizeDone(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (cancelled) return;
        setArticleHtmlForReader(sanitizeArticleHtml(raw, url));
        setSanitizeDone(true);
      }, 0);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [displayHtml, url]);

  const hasFullArticle = sanitizeDone && hasUsableArticleHtml(articleHtmlForReader);
  const fromOffline =
    usingOfflineCache &&
    strippedArticleTextLen(cachedOfflineHtml) >= strippedArticleTextLen(liveHtml || '') - 40;
  const fromPage = !fromOffline && !!fetchedHtml && hasFullArticle;

  useEffect(() => {
    setFetchedHtml(null);
    setFetchDone(false);
    setFetchLoading(false);
    setWebModalVisible(false);
    setShowInlineWeb(false);
    setInlineWebLoading(false);
    setSpeaking(false);
    Speech.stop();
  }, [articleId]);

  useEffect(() => {
    setShowFullArticle(readerDefaultView === 'full');
  }, [articleId, readerDefaultView]);

  /** Hors ligne : ouvrir directement le corps complet dès que le cache est utilisable. */
  useEffect(() => {
    if (!diskCacheReady) return;
    if (usingOfflineCache && hasUsableArticleHtml(cachedOfflineHtml)) {
      setShowFullArticle(true);
    }
  }, [articleId, diskCacheReady, usingOfflineCache, cachedOfflineHtml]);

  useEffect(() => {
    if (!article || !url) return;
    if (!diskCacheReady) return;

    const offlineReady =
      usingOfflineCache &&
      (rssBodyLikelyComplete(cachedOfflineHtml, url) ||
        strippedArticleTextLen(cachedOfflineHtml) >= 320 ||
        hasUsableArticleHtml(cachedOfflineHtml));

    if (offlineReady) {
      setFetchLoading(false);
      setFetchDone(true);
      return;
    }
    if (rssBodyLikelyComplete(rssBody, url)) {
      setFetchLoading(false);
      setFetchDone(true);
      return;
    }

    let cancelled = false;
    const hasQuickContent =
      offlineReady || rssBodyLikelyComplete(rssBody, url) || hasUsableArticleHtml(rssBody);
    if (!hasQuickContent) setFetchLoading(true);

    const task = InteractionManager.runAfterInteractions(() => {
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
    });

    if (hasQuickContent) {
      setFetchLoading(false);
      setFetchDone(true);
    }

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [article, url, rssBody, diskCacheReady, usingOfflineCache, cachedOfflineHtml]);

  const imgPlaceholderDimensions = useMemo(() => {
    const w = Math.max(1, contentWidth);
    return {
      width: w,
      height: Math.max(180, Math.round((w * 9) / 16)),
    };
  }, [contentWidth]);

  const openHtmlExternalLink = useCallback(async (_event: unknown, href: string) => {
    const raw = href.trim();
    if (!raw) return;
    if (isLikelyDirectImageAssetUrl(raw)) return;
    try {
      if (/^https?:\/\//i.test(raw)) {
        await WebBrowser.openBrowserAsync(raw, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          enableBarCollapsing: true,
        });
        return;
      }
      const can = await Linking.canOpenURL(raw);
      if (can) await Linking.openURL(raw);
      else Alert.alert(t('reader.linkUnsupported'));
    } catch {
      try {
        await Linking.openURL(raw);
      } catch {
        Alert.alert(
          t('reader.linkOpenFailed'),
          raw.length > 140 ? `${raw.slice(0, 140)}…` : raw,
        );
      }
    }
  }, [t]);

  const renderersProps = useMemo(
    () => ({
      img: {
        initialDimensions: imgPlaceholderDimensions,
      },
      a: {
        onPress: openHtmlExternalLink,
      },
    }),
    [imgPlaceholderDimensions, openHtmlExternalLink],
  );

  const htmlRenderers = useMemo(
    () => ({
      img: ArticleHtmlImgRenderer,
      iframe: ArticleHtmlIframeRenderer,
      video: ArticleHtmlIframeRenderer,
    }),
    [],
  );

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: palette.text,
        fontSize: readerFontMetrics.bodySize,
        lineHeight: readerFontMetrics.lineHeight,
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
    [contentWidth, palette, readerFontMetrics],
  );

  const renderHtmlSource = useMemo(
    () => ({ html: articleHtmlForReader }),
    [articleHtmlForReader],
  );

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

  const openInSafari = useCallback(() => {
    if (!url) return;
    void Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), url);
    });
  }, [t, url]);

  const toggleSpeech = useCallback(() => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const fromHtml = articleHtmlForReader ? htmlToSpeechText(articleHtmlForReader) : '';
    const text = [title, chapoPlain, fromHtml].filter(Boolean).join('. ').trim();
    if (!text) return;
    setSpeaking(true);
    Speech.speak(text, {
      language: localeDateTimeLocale(appLocale),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [articleHtmlForReader, appLocale, chapoPlain, speaking, title]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const proposeToFeatured = useCallback(() => {
    if (!url?.trim()) {
      Alert.alert(t('common.error'), t('reader.noArticleUrl'));
      return;
    }

    const runPropose = async () => {
      try {
        await proposeFeaturedArticle({
          articleUrl: url,
          title: title?.trim() || t('discussions.articleFallback'),
          feedTitle: article?.feedTitle || null,
          imageUrl: article?.imageUrl ?? null,
        });
        Alert.alert(t('reader.featuredProposedTitle'), t('reader.featuredProposedMessage'));
      } catch (e) {
        Alert.alert(
          t('common.error'),
          e instanceof Error ? e.message : t('reader.featuredProposeFailed'),
        );
      }
    };

    if (!user) {
      Alert.alert(t('settings.loginRequired'), t('reader.featuredProposeNeedSignIn'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('reader.featuredProposeSignIn'),
          onPress: () => {
            if (!appleAvailable) {
              Alert.alert(t('settings.appleSignIn'), t('reader.appleSignInUnavailable'));
              return;
            }
            void (async () => {
              try {
                await signInWithApple();
                await runPropose();
              } catch (e) {
                Alert.alert(
                  t('settings.appleSignIn'),
                  e instanceof Error ? e.message : t('reader.signInFailed'),
                );
              }
            })();
          },
        },
      ]);
      return;
    }

    void runPropose();
  }, [appleAvailable, article?.feedTitle, article?.imageUrl, signInWithApple, t, title, url, user]);

  const openArticleMenu = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            t('reader.jumpToDiscussion'),
            t('reader.listen'),
            t('reader.copyLink'),
            t('reader.openSafari'),
            t('reader.openBrowser'),
            t('reader.share'),
            t('reader.proposeFeatured'),
          ],
          cancelButtonIndex: 0,
          userInterfaceStyle: actionSheetUiStyle,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) scrollToComments();
          if (buttonIndex === 2) toggleSpeech();
          if (buttonIndex === 3) void copyLink();
          if (buttonIndex === 4) openInSafari();
          if (buttonIndex === 5) openExternalBrowser();
          if (buttonIndex === 6) void shareArticle();
          if (buttonIndex === 7) proposeToFeatured();
        },
      );
    } else {
      Alert.alert(title, undefined, [
        { text: t('reader.jumpToDiscussion'), onPress: scrollToComments },
        { text: t('reader.listen'), onPress: toggleSpeech },
        { text: t('reader.copyLink'), onPress: () => void copyLink() },
        { text: t('reader.openSafari'), onPress: openInSafari },
        { text: t('reader.openBrowser'), onPress: openExternalBrowser },
        { text: t('reader.share'), onPress: () => void shareArticle() },
        { text: t('reader.proposeFeatured'), onPress: proposeToFeatured },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  }, [
    actionSheetUiStyle,
    copyLink,
    openExternalBrowser,
    openInSafari,
    proposeToFeatured,
    scrollToComments,
    shareArticle,
    t,
    title,
    toggleSpeech,
  ]);

  const headerRight = useCallback(
    () => (
      <View style={styles.headerRightRow}>
        <Pressable
          onPress={() => {
            hapticLight();
            void toggleFavorite(articleId);
          }}
          hitSlop={12}
          accessibilityLabel={
            isFavorite ? t('reader.removeFavorite') : t('reader.addFavorite')
          }
          style={styles.headerBtn}
        >
          <Ionicons
            name={isFavorite ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isFavorite ? palette.accent : palette.accentMuted}
          />
        </Pressable>
        <Pressable
          onPress={openArticleMenu}
          hitSlop={12}
          accessibilityLabel={t('reader.more')}
          style={styles.headerBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={palette.accentMuted} />
        </Pressable>
      </View>
    ),
    [articleId, isFavorite, openArticleMenu, palette, styles, t, toggleFavorite],
  );

  useEffect(() => {
    if (embedded) return;
    navigation.setOptions({
      title: title.length > 34 ? `${title.slice(0, 34)}…` : title,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: palette.bg },
      headerTintColor: palette.text,
      headerTitleStyle: { ...typography.body, fontWeight: '600', color: palette.text },
      headerRight,
    });
  }, [embedded, navigation, title, headerRight, palette]);

  const embeddedHeader = embedded ? (
    <View style={styles.embeddedHeader}>
      <Pressable
        onPress={onRequestClose}
        hitSlop={12}
        accessibilityLabel={t('common.cancel')}
        style={styles.headerBtn}
      >
        <Ionicons name="close" size={22} color={palette.text} />
      </Pressable>
      <Text style={styles.embeddedTitle} numberOfLines={1}>
        {title}
      </Text>
      {headerRight()}
    </View>
  ) : null;

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
            accessibilityLabel={t('common.close')}
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
        {embeddedHeader}
        {webModal}
        <View style={styles.banner}>
          <Ionicons name="alert-circle-outline" size={18} color={palette.textMuted} />
          <Text style={styles.bannerText}>{t('reader.missingArticle')}</Text>
        </View>
        <View style={[styles.scrollInner, { paddingTop: spacing.lg }]}>
          <Pressable
            onPress={openExternalBrowser}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="globe-outline" size={22} color={palette.text} />
            <Text style={styles.primaryBtnText}>{t('reader.openExternalBrowser')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const chapoOk = hasUsableChapo(chapoPlain);
  const preparingArticle = !!displayHtml.trim() && !sanitizeDone;
  const webOnlyFallback =
    fetchDone &&
    !fetchLoading &&
    sanitizeDone &&
    !chapoOk &&
    !hasFullArticle &&
    !displayHtml.trim();

  const previewBody =
    chapoOk && chapoPlain
      ? chapoPlain.trim()
      : hasFullArticle
        ? htmlToPlainPreview(articleHtmlForReader, 520)
        : '';

  /** Article HTML disponible : aperçu (chapô / extrait) puis bouton pour le corps complet */
  if (hasFullArticle && articleHtmlForReader && !showFullArticle) {
    return (
      <View style={styles.flex}>
        {embeddedHeader}
        {webModal}
        <ScrollView
          {...readerScrollProps}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: scrollBottomPad },
          ]}
          showsVerticalScrollIndicator
        >
          <View style={styles.sourceBanner}>
            <Ionicons
              name={
                fromOffline
                  ? 'cloud-offline-outline'
                  : fromPage
                    ? 'cloud-download-outline'
                    : 'newspaper-outline'
              }
              size={16}
              color={fromOffline || fromPage ? palette.accentMuted : palette.success}
            />
            <Text style={styles.sourceBannerText}>
              {fromOffline
                ? t('reader.sourceOfflineSaved')
                : fromPage
                  ? t('reader.sourceFromPagePreview')
                  : t('reader.sourceFromRssPreview')}
            </Text>
          </View>
          {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
          <ArticleSummaryCard
            title={title}
            articleUrl={url}
            sourceText={previewBody || chapoPlain || ''}
          />
          {previewBody ? (
            <Text style={styles.chapoBody} selectable>
              {previewBody}
            </Text>
          ) : (
            <Text style={styles.fetchHint}>{t('reader.previewUnavailable')}</Text>
          )}
          <Pressable
            onPress={() => setShowFullArticle(true)}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="document-text-outline" size={22} color={palette.text} />
            <Text style={styles.primaryBtnText}>{t('reader.showFullArticle')}</Text>
          </Pressable>
          <View
            onLayout={(e) => {
              commentsSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <ArticleCommentsSection
              articleUrl={url}
              articleTitle={title}
              onComposeFocus={scrollToComments}
            />
          </View>
          <ArticleFooterAd key={articleId} reloadKey={articleId} />
        </ScrollView>
      </View>
    );
  }

  if (hasFullArticle && articleHtmlForReader && showFullArticle) {
    return (
      <View style={styles.flex}>
        {embeddedHeader}
        {webModal}
        <ScrollView
          {...readerScrollProps}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: scrollBottomPad },
          ]}
          showsVerticalScrollIndicator
        >
          <Pressable
            onPress={() => setShowFullArticle(false)}
            style={({ pressed }) => [styles.backPreviewBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chevron-back" size={22} color={palette.accentMuted} />
            <Text style={styles.backPreviewText}>{t('reader.backToPreview')}</Text>
          </Pressable>
          <View style={styles.sourceBanner}>
            <Ionicons
              name={
                fromOffline
                  ? 'cloud-offline-outline'
                  : fromPage
                    ? 'cloud-download-outline'
                    : 'newspaper-outline'
              }
              size={16}
              color={fromOffline || fromPage ? palette.accentMuted : palette.success}
            />
            <Text style={styles.sourceBannerText}>
              {fromOffline
                ? t('reader.sourceOfflineReading')
                : fromPage
                  ? t('reader.sourceFromPageFull')
                  : t('reader.sourceFromRssFull')}
            </Text>
          </View>
          {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
          <ArticleSummaryCard
            title={title}
            articleUrl={url}
            sourceText={articleHtmlForReader || chapoPlain || ''}
          />
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
          <View
            onLayout={(e) => {
              commentsSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <ArticleCommentsSection
              articleUrl={url}
              articleTitle={title}
              onComposeFocus={scrollToComments}
            />
          </View>
          <ArticleFooterAd key={articleId} reloadKey={articleId} />
        </ScrollView>
      </View>
    );
  }

  if (webOnlyFallback) {
    return (
      <View style={styles.flex}>
        {embeddedHeader}
        {webModal}
        <ScrollView
          {...readerScrollProps}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: scrollBottomPad },
          ]}
          showsVerticalScrollIndicator
        >
          <View style={styles.sourceBanner}>
            <Ionicons name="globe-outline" size={16} color={palette.textMuted} />
            <Text style={styles.sourceBannerText}>{t('reader.extractFailed')}</Text>
          </View>
          {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
          <ArticleSummaryCard
            title={title}
            articleUrl={url}
            sourceText={chapoPlain || ''}
          />
          <Pressable
            onPress={openExternalBrowser}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="open-outline" size={22} color={palette.text} />
            <Text style={styles.primaryBtnText}>{t('reader.openArticlePage')}</Text>
          </Pressable>
          {Constants.appOwnership !== 'expo' ? (
            <Pressable
              onPress={() => setWebModalVisible(true)}
              style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.88 }]}
            >
              <Ionicons name="layers-outline" size={20} color={palette.text} />
              <Text style={styles.toggleBtnText}>{t('reader.showPageInApp')}</Text>
            </Pressable>
          ) : null}
          <View
            onLayout={(e) => {
              commentsSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <ArticleCommentsSection
              articleUrl={url}
              articleTitle={title}
              onComposeFocus={scrollToComments}
            />
          </View>
          <ArticleFooterAd key={articleId} reloadKey={articleId} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flexColumn}>
      {embeddedHeader}
        {webModal}
      <ScrollView
        {...readerScrollProps}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: scrollBottomPad },
        ]}
        showsVerticalScrollIndicator
      >
        <View style={styles.sourceBanner}>
          <Ionicons name="hourglass-outline" size={16} color={palette.accentMuted} />
          <Text style={styles.sourceBannerText}>
            {fetchLoading
              ? t('reader.fetchingFull')
              : preparingArticle
                ? t('reader.preparing')
                : t('reader.excerptOnly')}
          </Text>
        </View>
        {feedTitle ? <Text style={styles.feedTag}>{feedTitle}</Text> : null}
        <ArticleSummaryCard
          title={title}
          articleUrl={url}
          sourceText={chapoPlain || articleHtmlForReader || ''}
        />
        {fetchLoading || preparingArticle ? (
          <View style={styles.fetchRow}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.fetchHint}>
              {fetchLoading ? t('reader.analyzingPage') : t('reader.formatting')}
            </Text>
          </View>
        ) : null}
        {chapoOk && chapoPlain ? (
          <Text style={styles.chapoBody} selectable>
            {chapoPlain.trim()}
          </Text>
        ) : !fetchLoading && !preparingArticle ? (
          <Text style={styles.fetchHint}>{t('reader.hintUseMenu')}</Text>
        ) : null}
        {Constants.appOwnership !== 'expo' ? (
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
              {showInlineWeb
                ? t('reader.toggleWebUnderExcerptHide')
                : t('reader.toggleWebUnderExcerptShow')}
            </Text>
          </Pressable>
        ) : null}
        <View
          onLayout={(e) => {
            commentsSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <ArticleCommentsSection
            articleUrl={url}
            articleTitle={title}
            onComposeFocus={scrollToComments}
          />
        </View>
        <ArticleFooterAd key={articleId} reloadKey={articleId} />
      </ScrollView>
      {Constants.appOwnership !== 'expo' && showInlineWeb ? (
        <View style={styles.webSplit}>
          {inlineWebLoading ? (
            <View style={styles.wvLoadingSplit}>
              <ActivityIndicator size="large" color={palette.accent} />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
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

function createArticleReaderStyles(
  palette: AppPalette,
  font: { bodySize: number; lineHeight: number },
) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  flexColumn: { flex: 1, backgroundColor: palette.bg },
  scroll: { flex: 1, backgroundColor: palette.bg },
  scrollInner: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
    gap: 2,
  },
  embeddedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: palette.bg,
  },
  embeddedTitle: {
    ...typography.subtitle,
    color: palette.text,
    flex: 1,
    marginHorizontal: spacing.xs,
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
    fontSize: font.bodySize,
    lineHeight: font.lineHeight,
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
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
}
