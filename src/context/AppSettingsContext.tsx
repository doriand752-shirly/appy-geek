import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ALL_THEME_IDS } from '../constants/newsThemes';
import { buildNavigationTheme } from '../constants/theme';
import {
  DEFAULT_VISUAL_THEME_ID,
  type AppPalette,
  type VisualThemeId,
  VISUAL_THEME_BY_ID,
  sanitizeVisualThemeId,
} from '../constants/visualThemes';
import type { CustomNewsTheme, ReaderDefaultView } from '../types/settings';

const STORAGE_KEY = 'appigeek_app_settings_v1';
const CUSTOM_ID_PREFIX = 'custom_';
const MAX_CUSTOM_THEMES = 50;
const MAX_CUSTOM_LABEL_LENGTH = 80;

type PersistedShape = {
  readerDefaultView?: ReaderDefaultView;
  selectedThemeIds?: string[];
  customThemes?: unknown[];
  visualThemeId?: unknown;
};

function sanitizeCustomThemes(raw: unknown): CustomNewsTheme[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomNewsTheme[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    const label = (item as { label?: unknown }).label;
    if (typeof id !== 'string' || !id.startsWith(CUSTOM_ID_PREFIX)) continue;
    if (typeof label !== 'string') continue;
    const trimmed = label.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CUSTOM_LABEL_LENGTH) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: trimmed });
    if (out.length >= MAX_CUSTOM_THEMES) break;
  }
  return out;
}

function sanitizeThemeIds(raw: unknown, customThemes: CustomNewsTheme[]): string[] {
  if (!Array.isArray(raw)) return [];
  const builtin = new Set(ALL_THEME_IDS);
  const custom = new Set(customThemes.map((c) => c.id));
  return raw.filter(
    (id): id is string => typeof id === 'string' && (builtin.has(id) || custom.has(id)),
  );
}

type AppSettingsContextValue = {
  readerDefaultView: ReaderDefaultView;
  setReaderDefaultView: (v: ReaderDefaultView) => Promise<void>;
  /** Thèmes affichés sur l’accueil (intégrés + perso). */
  selectedThemeIds: string[];
  setSelectedThemeIds: (ids: string[]) => Promise<void>;
  toggleThemeId: (themeId: string) => Promise<void>;
  selectAllThemes: () => Promise<void>;
  clearAllThemes: () => Promise<void>;
  customThemes: CustomNewsTheme[];
  /** Ajoute un thème perso et l’active sur l’accueil. Erreur éventuelle en français. */
  addCustomTheme: (label: string) => Promise<{ error: string | null }>;
  removeCustomTheme: (themeId: string) => Promise<void>;
  /** Apparence : couleurs de l’interface. */
  palette: AppPalette;
  visualThemeId: VisualThemeId;
  setVisualThemeId: (id: VisualThemeId) => Promise<void>;
  statusBarStyle: 'light' | 'dark';
  navigationTheme: ReturnType<typeof buildNavigationTheme>;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

async function persist(
  readerDefaultView: ReaderDefaultView,
  selectedThemeIds: string[],
  customThemes: CustomNewsTheme[],
  visualThemeId: VisualThemeId,
) {
  try {
    const payload: PersistedShape = {
      readerDefaultView,
      selectedThemeIds,
      customThemes,
      visualThemeId,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [readerDefaultView, setReaderDefaultViewState] = useState<ReaderDefaultView>('preview');
  const [selectedThemeIds, setSelectedThemeIdsState] = useState<string[]>(() => [...ALL_THEME_IDS]);
  const [customThemes, setCustomThemesState] = useState<CustomNewsTheme[]>([]);
  const [visualThemeId, setVisualThemeIdState] = useState<VisualThemeId>(DEFAULT_VISUAL_THEME_ID);

  const visualResolved = VISUAL_THEME_BY_ID[visualThemeId] ?? VISUAL_THEME_BY_ID[DEFAULT_VISUAL_THEME_ID];
  const palette = visualResolved.palette;
  const statusBarStyle = visualResolved.statusBarStyle;
  const navigationTheme = useMemo(
    () => buildNavigationTheme(palette, visualResolved.navigationDark),
    [palette, visualResolved.navigationDark],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as PersistedShape;
        const ct = sanitizeCustomThemes(parsed.customThemes);
        if (parsed.readerDefaultView === 'full' || parsed.readerDefaultView === 'preview') {
          setReaderDefaultViewState(parsed.readerDefaultView);
        }
        setCustomThemesState(ct);
        if ('visualThemeId' in parsed) {
          setVisualThemeIdState(sanitizeVisualThemeId(parsed.visualThemeId));
        }
        if ('selectedThemeIds' in parsed && parsed.selectedThemeIds !== undefined) {
          setSelectedThemeIdsState(sanitizeThemeIds(parsed.selectedThemeIds, ct));
        }
      } catch {
        /* défauts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setReaderDefaultView = useCallback(
    async (v: ReaderDefaultView) => {
      setReaderDefaultViewState(v);
      await persist(v, selectedThemeIds, customThemes, visualThemeId);
    },
    [selectedThemeIds, customThemes, visualThemeId],
  );

  const setVisualThemeId = useCallback(
    async (id: VisualThemeId) => {
      const next = sanitizeVisualThemeId(id);
      setVisualThemeIdState(next);
      await persist(readerDefaultView, selectedThemeIds, customThemes, next);
    },
    [readerDefaultView, selectedThemeIds, customThemes],
  );

  const setSelectedThemeIds = useCallback(
    async (ids: string[]) => {
      const builtin = new Set(ALL_THEME_IDS);
      const customIds = new Set(customThemes.map((c) => c.id));
      const next = ids.filter((id) => builtin.has(id) || customIds.has(id));
      setSelectedThemeIdsState(next);
      await persist(readerDefaultView, next, customThemes, visualThemeId);
    },
    [readerDefaultView, customThemes, visualThemeId],
  );

  const toggleThemeId = useCallback(
    async (themeId: string) => {
      const okBuiltin = ALL_THEME_IDS.includes(themeId);
      const okCustom = customThemes.some((c) => c.id === themeId);
      if (!okBuiltin && !okCustom) return;
      const next = selectedThemeIds.includes(themeId)
        ? selectedThemeIds.filter((id) => id !== themeId)
        : [...selectedThemeIds, themeId];
      setSelectedThemeIdsState(next);
      await persist(readerDefaultView, next, customThemes, visualThemeId);
    },
    [readerDefaultView, customThemes, selectedThemeIds, visualThemeId],
  );

  const selectAllThemes = useCallback(async () => {
    const next = [...ALL_THEME_IDS, ...customThemes.map((c) => c.id)];
    setSelectedThemeIdsState(next);
    await persist(readerDefaultView, next, customThemes, visualThemeId);
  }, [readerDefaultView, customThemes, visualThemeId]);

  const clearAllThemes = useCallback(async () => {
    setSelectedThemeIdsState([]);
    await persist(readerDefaultView, [], customThemes, visualThemeId);
  }, [readerDefaultView, customThemes, visualThemeId]);

  const addCustomTheme = useCallback(
    async (label: string): Promise<{ error: string | null }> => {
      const trimmed = label.trim();
      if (!trimmed) {
        return { error: 'Entrez un nom de thème.' };
      }
      if (trimmed.length > MAX_CUSTOM_LABEL_LENGTH) {
        return { error: `Le nom est trop long (${MAX_CUSTOM_LABEL_LENGTH} caractères max).` };
      }
      if (customThemes.length >= MAX_CUSTOM_THEMES) {
        return { error: 'Nombre maximum de thèmes personnalisés atteint.' };
      }
      const id = `${CUSTOM_ID_PREFIX}${randomUUID()}`;
      const entry: CustomNewsTheme = { id, label: trimmed };
      const nextCustom = [...customThemes, entry];
      const nextSelected = [...selectedThemeIds, id];
      setCustomThemesState(nextCustom);
      setSelectedThemeIdsState(nextSelected);
      await persist(readerDefaultView, nextSelected, nextCustom, visualThemeId);
      return { error: null };
    },
    [customThemes, readerDefaultView, selectedThemeIds, visualThemeId],
  );

  const removeCustomTheme = useCallback(
    async (themeId: string) => {
      if (!themeId.startsWith(CUSTOM_ID_PREFIX)) return;
      const nextCustom = customThemes.filter((c) => c.id !== themeId);
      const nextSelected = selectedThemeIds.filter((id) => id !== themeId);
      setCustomThemesState(nextCustom);
      setSelectedThemeIdsState(nextSelected);
      await persist(readerDefaultView, nextSelected, nextCustom, visualThemeId);
    },
    [customThemes, readerDefaultView, selectedThemeIds, visualThemeId],
  );

  const value = useMemo(
    () => ({
      readerDefaultView,
      setReaderDefaultView,
      selectedThemeIds,
      setSelectedThemeIds,
      toggleThemeId,
      selectAllThemes,
      clearAllThemes,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
      palette,
      visualThemeId,
      setVisualThemeId,
      statusBarStyle,
      navigationTheme,
    }),
    [
      readerDefaultView,
      setReaderDefaultView,
      selectedThemeIds,
      setSelectedThemeIds,
      toggleThemeId,
      selectAllThemes,
      clearAllThemes,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
      palette,
      visualThemeId,
      setVisualThemeId,
      statusBarStyle,
      navigationTheme,
    ],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings doit être utilisé dans AppSettingsProvider');
  }
  return ctx;
}
