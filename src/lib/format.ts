/** Formatage monétaire/numérique localisé (configuré par site via site-config). */
import { LOCALE_TAG, CURRENCY } from '../data/site-config';

const cache = new Map<string, Intl.NumberFormat>();
/** Site bilingue (RECETTE §4) : une locale par langue. L'anglais prend en-GB (« €1,234 ») :
 *  en-IT mélange les séparateurs (« €1,234 » mais « 1.234,5 »). */
export type Lang = 'it' | 'en';
const TAG: Record<Lang, string> = { it: LOCALE_TAG, en: 'en-GB' };
function nf(opts: Intl.NumberFormatOptions, lang: Lang = 'it'): Intl.NumberFormat {
  const k = lang + JSON.stringify(opts);
  if (!cache.has(k)) cache.set(k, new Intl.NumberFormat(TAG[lang], opts));
  return cache.get(k)!;
}
export function formatMoney(value: number, decimals = 0, lang: Lang = 'it'): string {
  // L'italien ne groupe pas les nombres à quatre chiffres (CLDR) : « 1234 € ». On groupe toujours,
  // pour qu'un montant se lise d'un coup d'œil (RECETTE §4.1).
  return nf({ style: 'currency', currency: CURRENCY, minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' } as Intl.NumberFormatOptions, lang).format(value);
}
export function formatNumber(value: number, decimals = 0, lang: Lang = 'it'): string {
  return nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' } as Intl.NumberFormatOptions, lang).format(value);
}
/** Nombre tiré des paramètres et inséré dans un texte : décimales utiles seulement (13,18 · 111,8 · 548),
 *  toujours au format de la locale. Jamais `{P.x}` ni `toFixed` dans une page (RECETTE §4, §17.4). */
export function formatDecimal(value: number, max = 2, lang: Lang = 'it'): string {
  return nf({ maximumFractionDigits: max, useGrouping: 'always' } as Intl.NumberFormatOptions, lang).format(value);
}
export function formatPercent(value: number, decimals = 1, lang: Lang = 'it'): string {
  // Toutes langues : espace insécable avant % (RECETTE §7) ; Intl n'en met pas en anglais (« 3.5% »).
  return nf({ style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }, lang).format(value).replace(/(\d)\s?%/, '$1\u00a0%');
}
/** Aliquota IMU écrite comme dans le prospetto : 1,06 % (décimales utiles seulement, au plus trois). */
export function formatAliquota(pct: number, lang: Lang = 'it'): string {
  return `${nf({ maximumFractionDigits: 3 }, lang).format(pct)}\u00a0%`;
}
export function parseLocaleNumber(input: string): number {
  const cleaned = input.replace(/[^\d.,-]/g, '');
  // Détecte le séparateur décimal : le dernier des deux symboles
  const lastComma = cleaned.lastIndexOf(','), lastDot = cleaned.lastIndexOf('.');
  let s = cleaned;
  if (lastComma > lastDot) s = cleaned.replace(/\./g, '').replace(',', '.');
  // « 35.000 » en danois, néerlandais ou allemand : point séparateur de milliers, pas décimal.
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) s = cleaned.replace(/\./g, '');
  else s = cleaned.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Date de mise à jour écrite dans la langue de la page (registre 2026-09-21) : « 27 September 2026 »,
 *  jamais le format machine. Fuseau UTC forcé, sinon la date recule d'un jour à l'ouest de Greenwich.
 *  Le format ISO reste dans l'attribut `datetime` de la balise <time>. */
export function displayDate(iso: string, langTag: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(langTag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
