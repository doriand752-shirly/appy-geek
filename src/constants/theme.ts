import type { Theme } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

import type { AppPalette } from './visualThemes';

export type { AppPalette } from './visualThemes';

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};

/** Thème React Navigation dérivé de la palette et du mode clair/sombre. */
export function buildNavigationTheme(palette: AppPalette, dark: boolean): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.bg,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.accentMuted,
    },
  };
}
