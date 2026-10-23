export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'it', 'pt'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'fr';

export type LanguageOption = {
  id: AppLocale;
  /** Native name shown in the picker */
  label: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'it', label: 'Italiano' },
  { id: 'pt', label: 'Português' },
];
