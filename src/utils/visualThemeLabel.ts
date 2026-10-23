import type { VisualThemeId } from '../constants/visualThemes';
import type { AppLocale } from '../i18n/types';
import { translate, type TranslationKey } from '../i18n/translations';

const KEY_BY_ID: Record<VisualThemeId, TranslationKey> = {
  dark_default: 'visualTheme.dark_default',
  light: 'visualTheme.light',
  ocean: 'visualTheme.ocean',
  sunset: 'visualTheme.sunset',
  forest: 'visualTheme.forest',
};

export function visualThemeTranslationKey(id: VisualThemeId): TranslationKey {
  return KEY_BY_ID[id];
}

export function getVisualThemeLabel(locale: AppLocale, id: VisualThemeId): string {
  return translate(locale, KEY_BY_ID[id]);
}
