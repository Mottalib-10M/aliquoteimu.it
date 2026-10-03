/**
 * Calibrage des extraits au build (RECETTE §11, §15 point 15) : la page choisit, parmi des fins de
 * phrase, la première qui fait tomber le titre dans 50–60 caractères et la description dans 150–160.
 * Si aucune ne convient, le build échoue.
 */
import type { Locale } from '../i18n/routes';
const DESC_TAILS: Record<Locale, string[]> = {
  it: ['', ' Gratis.', ' Gratis, senza registrazione.', ' Calcolo gratuito.', ' Aggiornato al 2026.', ' Gratis e aggiornato al 2026.', ' Calcolo gratuito nel browser.', ' Gratis, senza registrazione, nel browser.'],
  en: ['', ' Free.', ' Free, no sign-up.', ' Free and private.', ' Updated for 2026.', ' Free, updated for 2026.', ' Free, private and updated for 2026.', ' Calculated in your browser, free.'],
};
const TITLE_TAILS: Record<Locale, string[]> = { it: ['', ' | Italia', ' (Italia)', ' 2026'], en: ['', ' | Italy', ' (Italy)', ' 2026'] };
function fit(core: string, tails: string[], lo: number, hi: number, what: string): string {
  for (const t of tails) { const s = core + t; if (s.length >= lo && s.length <= hi) return s; }
  const msg = `${what} hors fenêtre ${lo}–${hi} (${core.length}) : « ${core} »`;
  // SNIPPET_REPORT=1 : liste tous les écarts d'un coup au lieu de s'arrêter au premier (outil de correction).
  if (typeof process !== 'undefined' && process.env?.SNIPPET_REPORT) { console.error('SNIPPET', msg); return core; }
  throw new Error(msg);
}
export const fitDescription = (d: string, lang: Locale) => fit(d.trim(), DESC_TAILS[lang], 150, 160, 'Description');
export const fitTitle = (t: string, lang: Locale) => fit(t.trim(), TITLE_TAILS[lang], 50, 60, 'Titre');
