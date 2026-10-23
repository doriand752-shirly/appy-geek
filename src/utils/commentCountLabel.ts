import { translate, type TranslationKey } from '../i18n/translations';
import type { AppLocale } from '../i18n/types';

export function formatCommentCountLabel(
  count: number,
  locale: AppLocale = 'fr',
): string {
  if (count <= 0) return translate(locale, 'comments.countNone');
  if (count === 1) return translate(locale, 'comments.countOne');
  return translate(locale, 'comments.countMany', { count });
}

export function readerFontSizeTranslationKey(
  id: 'small' | 'medium' | 'large',
): TranslationKey {
  if (id === 'small') return 'settings.fontSmall';
  if (id === 'large') return 'settings.fontLarge';
  return 'settings.fontMedium';
}
