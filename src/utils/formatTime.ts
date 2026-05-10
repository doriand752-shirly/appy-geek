/** Utilise Intl si dispo (runtime prêt), sinon fallback sans crash Hermes / chargement initial. */
export function formatRelative(ts: number): string {
  try {
    const CTRel = Intl.RelativeTimeFormat;
    if (typeof CTRel === 'function') {
      const rtf = new CTRel('fr', { numeric: 'auto' });
      const diffSec = Math.round((ts - Date.now()) / 1000);
      const abs = Math.abs(diffSec);
      if (abs < 60) return rtf.format(Math.round(diffSec), 'second');
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
      if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day');
      if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), 'week');
      return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
    }
  } catch {
    /* ignoré */
  }
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
