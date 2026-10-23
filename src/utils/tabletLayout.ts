/**
 * Layout multi-colonnes (iPad, iPhone Duo ouvert, Split View).
 * Décision basée sur la largeur de fenêtre — pas le modèle appareil.
 * Sur Duo ouvert, la fenêtre est « regular » (comme un iPad) ; fermé = compact.
 */

/** Largeur mini d’une colonne liste ou lecteur encore lisible. */
export const SPLIT_MIN_COLUMN = 300;
const SPLIT_GUTTER = 24;

/** Accueil / listes en deux colonnes (liste | article) à partir de cette largeur. */
export const TABLET_SPLIT_MIN_WIDTH = SPLIT_MIN_COLUMN * 2 + SPLIT_GUTTER;

export function isTabletSplitLayout(width: number): boolean {
  return width >= TABLET_SPLIT_MIN_WIDTH;
}
