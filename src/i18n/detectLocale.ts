import * as Localization from 'expo-localization';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from './types';

const LOCALE_PREFIX_MAP: Record<string, AppLocale> = {
  fr: 'fr',
  en: 'en',
  es: 'es',
  it: 'it',
  pt: 'pt',
};

function mapLanguageTag(tag: string): AppLocale | null {
  const normalized = tag.trim().toLowerCase().replace('_', '-');
  if (!normalized) return null;
  const primary = normalized.split('-')[0];
  return LOCALE_PREFIX_MAP[primary] ?? null;
}

/** Détecte la langue de l’appareil ; retombe sur le français si non supportée. */
export function detectDeviceLocale(): AppLocale {
  const candidates: string[] = [];
  try {
    const locales = Localization.getLocales?.();
    if (Array.isArray(locales)) {
      for (const l of locales) {
        if (typeof l?.languageTag === 'string' && l.languageTag.length > 0) {
          candidates.push(l.languageTag);
        }
      }
    }
  } catch {
    /* module natif indisponible ou version incompatible */
  }
  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (typeof intlLocale === 'string' && intlLocale.length > 0) {
      candidates.push(intlLocale);
    }
  } catch {
    /* ignore */
  }

  for (const tag of candidates) {
    const mapped = mapLanguageTag(tag);
    if (mapped) return mapped;
  }
  return DEFAULT_LOCALE;
}

export function sanitizeAppLocale(raw: unknown): AppLocale | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as AppLocale;
  return (SUPPORTED_LOCALES as readonly string[]).includes(id) ? id : null;
}
