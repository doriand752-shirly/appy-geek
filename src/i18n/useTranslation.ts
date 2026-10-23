import { useMemo } from 'react';

import { useAppSettings } from '../context/AppSettingsContext';

import { translate, type TranslationParams } from './translations';
import type { TranslationKey } from './translations';

export function useTranslation() {
  const { appLocale } = useAppSettings();
  return useMemo(
    () => ({
      t: (key: TranslationKey, params?: TranslationParams) => translate(appLocale, key, params),
      locale: appLocale,
    }),
    [appLocale],
  );
}
