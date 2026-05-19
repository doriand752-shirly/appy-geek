/** Ouverture du lecteur : extrait / chapô d’abord, ou HTML complet tout de suite. */
export type ReaderDefaultView = 'preview' | 'full';

/** Taille du texte dans le lecteur d’articles. */
export type ReaderFontSize = 'small' | 'medium' | 'large';

export const READER_FONT_SIZE_OPTIONS: { id: ReaderFontSize; label: string; bodySize: number; lineHeight: number }[] = [
  { id: 'small', label: 'Petite', bodySize: 14, lineHeight: 22 },
  { id: 'medium', label: 'Normale', bodySize: 16, lineHeight: 26 },
  { id: 'large', label: 'Grande', bodySize: 19, lineHeight: 30 },
];

/** Nombre d’articles à conserver en local pour la lecture hors ligne. */
export const OFFLINE_CACHE_COUNT_OPTIONS = [10, 20, 30, 40, 50, 75, 100, 150, 200] as const;
export type OfflineCacheCount = (typeof OFFLINE_CACHE_COUNT_OPTIONS)[number];
export const DEFAULT_OFFLINE_CACHE_COUNT: OfflineCacheCount = 50;

export function sanitizeOfflineCacheCount(raw: unknown): OfflineCacheCount {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (OFFLINE_CACHE_COUNT_OPTIONS.includes(n as OfflineCacheCount)) {
    return n as OfflineCacheCount;
  }
  return DEFAULT_OFFLINE_CACHE_COUNT;
}

export function sanitizeReaderFontSize(raw: unknown): ReaderFontSize {
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw;
  return 'medium';
}

/** Thème créé par l’utilisateur ; les articles sont détectés si le titre contient le nom (ou ses mots). */
export type CustomNewsTheme = {
  id: string;
  label: string;
};
