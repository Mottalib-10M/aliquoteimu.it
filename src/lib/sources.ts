/** Sources officielles, tirées du fichier de paramètres (RECETTE §7, §8.3). */
import P from '../data/params-2026.json';
import type { Locale } from '../i18n/routes';
type Key = keyof typeof P.sources;
export const src = (lang: Locale, ...keys: Key[]) => keys.map((k) => ({ name: P.sources[k].label[lang], url: P.sources[k].url }));
