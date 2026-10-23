import type { TBlock } from '@native-html/transient-render-engine';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CustomRendererProps } from 'react-native-render-html';
import { WebView } from 'react-native-webview';

import { spacing, typography } from '../constants/theme';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';

/** Expo Go : pas de WebView dans un ScrollView (crash iOS fréquent). */
function canEmbedMediaInArticle(): boolean {
  return Constants.appOwnership !== 'expo';
}

const WEBVIEW_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const EMBED_HOSTS = [
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'dai.ly',
  'twitch.tv',
  'facebook.com/plugins/video',
] as const;

function decodeAttrUrl(raw: string): string {
  return raw.replace(/&amp;/gi, '&').trim();
}

function normalizeEmbedUrl(src: string): string | null {
  const u = decodeAttrUrl(src);
  if (!/^https?:\/\//i.test(u)) return null;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes('youtube.com') && parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes('youtube.com') && parsed.pathname.startsWith('/embed/')) return u;
    if (host.includes('vimeo.com')) {
      const m = parsed.pathname.match(/\/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : u;
    }
    if (host.includes('dailymotion.com') || host === 'dai.ly') return u;
    if (host.includes('twitch.tv')) return u;
    return u;
  } catch {
    return null;
  }
}

function looksEmbeddable(src: string): boolean {
  const lower = src.toLowerCase();
  return EMBED_HOSTS.some((h) => lower.includes(h));
}

function videoHtmlDocument(src: string): string {
  const safe = src.replace(/"/g, '&quot;');
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#000"><video controls playsinline style="width:100%;height:100%" src="${safe}"></video></body></html>`;
}

/** Rendu `<iframe>` / `<video>` — YouTube, Vimeo, MP4… via WebView intégrée. */
export function ArticleHtmlIframeRenderer(
  props: CustomRendererProps<TBlock>,
): React.ReactElement {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  const tag = props.tnode.tagName;
  const rawSrc = props.tnode.attributes.src ?? '';
  const embedUrl = useMemo(() => normalizeEmbedUrl(rawSrc), [rawSrc]);
  const isDirectVideo =
    tag === 'video' && /^https?:\/\//i.test(rawSrc) && /\.(mp4|webm|m3u8)(\?|#|$)/i.test(rawSrc);

  const openExternal = () => {
    const target = embedUrl ?? rawSrc;
    if (target) void Linking.openURL(target);
  };

  const showEmbed = canEmbedMediaInArticle();
  const canPlayInline =
    showEmbed &&
    (isDirectVideo || (embedUrl != null && looksEmbeddable(embedUrl)));

  if (canPlayInline && isDirectVideo) {
    return (
      <View style={styles.wrap}>
        <WebView
          source={{ html: videoHtmlDocument(rawSrc) }}
          style={styles.webview}
          userAgent={WEBVIEW_UA}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          scrollEnabled={false}
        />
      </View>
    );
  }

  if (canPlayInline && embedUrl) {
    return (
      <View style={styles.wrap}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.webview}
          userAgent={WEBVIEW_UA}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          scrollEnabled={false}
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={openExternal}
      style={({ pressed }) => [
        styles.fallback,
        { borderColor: palette.border, backgroundColor: palette.surfaceElevated },
        pressed && { opacity: 0.88 },
      ]}
    >
      <Ionicons name="play-circle-outline" size={28} color={palette.accentMuted} />
      <Text style={[styles.fallbackText, { color: palette.text }]}>
        {showEmbed ? t('article.openEmbed') : t('article.openVideoBrowser')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginVertical: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  fallbackText: {
    ...typography.body,
    fontWeight: '500',
    flexShrink: 1,
  },
});
