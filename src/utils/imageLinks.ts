/** URL qui pointe vers un fichier image (lien à ne pas ouvrir dans le navigateur ; média affiché dans le corps). */
export function isLikelyDirectImageAssetUrl(href: string): boolean {
  const u = href.trim();
  if (!u) return false;
  try {
    if (/^https?:\/\//i.test(u)) {
      const path = new URL(u).pathname.toLowerCase();
      return /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/.test(path);
    }
  } catch {
    /* ignore */
  }
  return /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(u);
}
