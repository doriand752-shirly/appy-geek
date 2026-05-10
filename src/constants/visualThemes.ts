/** Couleurs d’interface (indépendantes des « thèmes » RSS / accueil). */
export type AppPalette = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  /** Ex. ligne d’option sélectionnée */
  surfaceSelected: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  success: string;
  danger: string;
  /** Texte / icônes sur boutons pleins `accent` */
  onAccent: string;
  thumbSwitch: string;
  /** Texte sur tuiles « Par thème » (fond sombre / dégradé) */
  themeCardTitle: string;
};

export type VisualThemeId =
  | 'dark_default'
  | 'light'
  | 'ocean'
  | 'sunset'
  | 'forest';

export const DEFAULT_VISUAL_THEME_ID: VisualThemeId = 'dark_default';

export type VisualThemeOption = {
  id: VisualThemeId;
  label: string;
  hint: string;
  palette: AppPalette;
  /** Barre d’état Expo : contenu clair sur fond sombre, ou l’inverse */
  statusBarStyle: 'light' | 'dark';
  /** Thème React Navigation (dark = barres type iOS sombres) */
  navigationDark: boolean;
};

const darkDefault: AppPalette = {
  bg: '#0c0e14',
  surface: '#141824',
  surfaceElevated: '#1c2230',
  surfaceSelected: '#1a1f2e',
  border: '#2a3142',
  text: '#eef0f7',
  textMuted: '#8b93a8',
  accent: '#7c5cff',
  accentMuted: '#5b8cff',
  success: '#3dd598',
  danger: '#ff5c7a',
  onAccent: '#ffffff',
  thumbSwitch: '#f0f2fa',
  themeCardTitle: '#f5f7ff',
};

const light: AppPalette = {
  bg: '#f2f4fa',
  surface: '#ffffff',
  surfaceElevated: '#f7f8fc',
  surfaceSelected: '#ebe8ff',
  border: '#d6dce8',
  text: '#12151c',
  textMuted: '#5a6278',
  accent: '#5b47e0',
  accentMuted: '#3d5fc9',
  success: '#0d9f6e',
  danger: '#e11d48',
  onAccent: '#ffffff',
  thumbSwitch: '#ffffff',
  themeCardTitle: '#f8f9ff',
};

const ocean: AppPalette = {
  bg: '#061018',
  surface: '#0c1824',
  surfaceElevated: '#102030',
  surfaceSelected: '#0d2840',
  border: '#1e3a52',
  text: '#e8f4fc',
  textMuted: '#8eb4cc',
  accent: '#22d3ee',
  accentMuted: '#38bdf8',
  success: '#34d399',
  danger: '#fb7185',
  onAccent: '#041018',
  thumbSwitch: '#e0f7ff',
  themeCardTitle: '#ecfeff',
};

const sunset: AppPalette = {
  bg: '#140c12',
  surface: '#1c1218',
  surfaceElevated: '#261820',
  surfaceSelected: '#2d1828',
  border: '#3d2840',
  text: '#fdf2f8',
  textMuted: '#c4a8b8',
  accent: '#fb7185',
  accentMuted: '#f472b6',
  success: '#4ade80',
  danger: '#fbbf24',
  onAccent: '#1a0a10',
  thumbSwitch: '#ffe4ec',
  themeCardTitle: '#fff1f2',
};

const forest: AppPalette = {
  bg: '#0a100c',
  surface: '#121a14',
  surfaceElevated: '#182218',
  surfaceSelected: '#142818',
  border: '#2a3d30',
  text: '#ecfdf5',
  textMuted: '#92b4a0',
  accent: '#34d399',
  accentMuted: '#6ee7b7',
  success: '#4ade80',
  danger: '#f87171',
  onAccent: '#052018',
  thumbSwitch: '#d1fae5',
  themeCardTitle: '#ecfdf5',
};

export const VISUAL_THEME_OPTIONS: VisualThemeOption[] = [
  {
    id: 'dark_default',
    label: 'Minuit (par défaut)',
    hint: 'Violet sur fond sombre — thème actuel de l’app.',
    palette: darkDefault,
    statusBarStyle: 'light',
    navigationDark: true,
  },
  {
    id: 'light',
    label: 'Jour',
    hint: 'Interface claire, bon contraste.',
    palette: light,
    statusBarStyle: 'dark',
    navigationDark: false,
  },
  {
    id: 'ocean',
    label: 'Océan',
    hint: 'Bleus profonds et cyan.',
    palette: ocean,
    statusBarStyle: 'light',
    navigationDark: true,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    hint: 'Rosé et pourpre.',
    palette: sunset,
    statusBarStyle: 'light',
    navigationDark: true,
  },
  {
    id: 'forest',
    label: 'Forêt',
    hint: 'Verts et tons nature.',
    palette: forest,
    statusBarStyle: 'light',
    navigationDark: true,
  },
];

export const VISUAL_THEME_BY_ID: Record<VisualThemeId, VisualThemeOption> =
  VISUAL_THEME_OPTIONS.reduce(
    (acc, opt) => {
      acc[opt.id] = opt;
      return acc;
    },
    {} as Record<VisualThemeId, VisualThemeOption>,
  );

const VALID_IDS = new Set<string>(VISUAL_THEME_OPTIONS.map((o) => o.id));

export function sanitizeVisualThemeId(raw: unknown): VisualThemeId {
  if (typeof raw === 'string' && VALID_IDS.has(raw)) {
    return raw as VisualThemeId;
  }
  return DEFAULT_VISUAL_THEME_ID;
}
