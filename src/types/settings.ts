/** Ouverture du lecteur : extrait / chapô d’abord, ou HTML complet tout de suite. */
export type ReaderDefaultView = 'preview' | 'full';

/** Thème créé par l’utilisateur ; les articles sont détectés si le titre contient le nom (ou ses mots). */
export type CustomNewsTheme = {
  id: string;
  label: string;
};
