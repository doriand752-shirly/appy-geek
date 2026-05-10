import type { TBlock } from '@native-html/transient-render-engine';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useContentWidth,
  useNormalizedUrl,
  type CustomRendererProps,
} from 'react-native-render-html';
import { WebView } from 'react-native-webview';

function parseDim(v: string | undefined): number {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).replace(/px$/i, '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function escapeHtmlAttrUrl(uri: string): string {
  return uri.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isSvgUri(uri: string): boolean {
  const base = uri.split(/[?#]/)[0].toLowerCase();
  return base.endsWith('.svg') || uri.startsWith('data:image/svg+xml');
}

/**
 * Les Numériques : certaines figures sont des SVG distants ; `Image` natif ne les affiche pas.
 * Passage par une mini WebView avec `<img>` comme le navigateur.
 */
export function ArticleHtmlImgRenderer(
  props: CustomRendererProps<TBlock>,
): React.ReactElement {
  const { InternalRenderer, tnode } = props;
  const rawSrc = tnode.attributes.src ?? '';
  const uri = useNormalizedUrl(rawSrc);
  const contentWidth = useContentWidth();

  const svgDims = useMemo(() => {
    const w = parseDim(tnode.attributes.width as string | undefined);
    const h = parseDim(tnode.attributes.height as string | undefined);
    const displayW = Math.max(1, contentWidth);
    if (w > 0 && h > 0) {
      return { width: displayW, height: Math.max(120, Math.round((h / w) * displayW)) };
    }
    return {
      width: displayW,
      height: Math.max(180, Math.round((displayW * 9) / 16)),
    };
  }, [contentWidth, tnode.attributes.height, tnode.attributes.width]);

  if (!isSvgUri(uri)) {
    return <InternalRenderer {...props} />;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;background:transparent;"><img src="${escapeHtmlAttrUrl(uri)}" alt="" width="100%" style="max-width:100%;height:auto;display:block"/></body></html>`;

  return (
    <View style={[styles.wrap, { width: svgDims.width }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.web, { width: svgDims.width, height: svgDims.height }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType="hardware"
        javaScriptEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
  web: {
    backgroundColor: 'transparent',
  },
});
