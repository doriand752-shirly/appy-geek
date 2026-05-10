import type { TBlock } from '@native-html/transient-render-engine';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useIMGElementProps,
  useNormalizedUrl,
  type CustomRendererProps,
  useContentWidth,
} from 'react-native-render-html';

import { remoteArticleBodyImageSource } from '../utils/remoteImageSource';

function parseDim(v: string | undefined): number {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).replace(/px$/i, '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mapObjectFit(
  v: string | undefined,
): 'contain' | 'cover' | 'fill' | 'scale-down' {
  const x = (v || '').toLowerCase();
  if (x === 'cover') return 'cover';
  if (x === 'fill' || x === 'stretch') return 'fill';
  if (x === 'scale-down') return 'scale-down';
  return 'contain';
}

/** Rendu `<img>` : expo-image + en-têtes pour les CDN type Numerama (pas de `getSize` async). */
export function ArticleHtmlImgRenderer(
  props: CustomRendererProps<TBlock>,
): React.ReactElement {
  const rawSrc = props.tnode.attributes.src ?? '';
  const uri = useNormalizedUrl(rawSrc);
  const contentWidth = useContentWidth();
  const imgProps = useIMGElementProps(props);

  const layout = useMemo(() => {
    const wAttr = parseDim(props.tnode.attributes.width as string | undefined);
    const hAttr = parseDim(props.tnode.attributes.height as string | undefined);
    const displayW = Math.max(1, contentWidth);
    let height: number;
    if (wAttr > 0 && hAttr > 0) {
      height = Math.max(120, Math.round((hAttr / wAttr) * displayW));
    } else {
      height = Math.max(180, Math.round((displayW * 9) / 16));
    }
    return { displayW, height };
  }, [
    contentWidth,
    props.tnode.attributes.width,
    props.tnode.attributes.height,
  ]);

  const source = useMemo(() => {
    if (/^https?:\/\//i.test(uri.trim())) return remoteArticleBodyImageSource(uri);
    return { uri };
  }, [uri]);

  const contentFit = mapObjectFit(imgProps.objectFit);

  return (
    <View {...imgProps.containerProps}>
      <Image
        source={source}
        style={[
          styles.img,
          imgProps.style as object,
          { width: layout.displayW, height: layout.height },
        ]}
        contentFit={contentFit}
        transition={150}
        accessibilityLabel={typeof imgProps.alt === 'string' ? imgProps.alt : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
});
