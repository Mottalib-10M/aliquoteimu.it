import { makeRouter, type RouteDef } from './routes-core';
export const LOCALES = ['it', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'it';

/** Grandi città con pagina propria : codice catastale, slug italiano, slug inglese. */
export const CITTA = [
  { id: 'roma', code: 'H501', it: 'roma', en: 'rome' },
  { id: 'milano', code: 'F205', it: 'milano', en: 'milan' },
  { id: 'napoli', code: 'F839', it: 'napoli', en: 'naples' },
  { id: 'torino', code: 'L219', it: 'torino', en: 'turin' },
  { id: 'palermo', code: 'G273', it: 'palermo', en: 'palermo' },
  { id: 'genova', code: 'D969', it: 'genova', en: 'genoa' },
  { id: 'bologna', code: 'A944', it: 'bologna', en: 'bologna' },
  { id: 'firenze', code: 'D612', it: 'firenze', en: 'florence' },
  { id: 'bari', code: 'A662', it: 'bari', en: 'bari' },
  { id: 'venezia', code: 'L736', it: 'venezia', en: 'venice' },
] as const;

const r = (id: string, it: string, en: string, noindex = false): RouteDef<Locale> => ({ id, paths: { it: `/it/${it}${it ? '/' : ''}`, en: `/en/${en}${en ? '/' : ''}` }, ...(noindex ? { noindex } : {}) });

export const ROUTES: RouteDef<Locale>[] = [
  r('home', '', ''),
  // Outils
  r('aliquote', 'aliquote-imu-comuni', 'imu-rates-by-comune'),
  r('confronto', 'confronto-imu-comuni', 'compare-imu-between-comuni'),
  r('ravvedimento', 'ravvedimento-operoso-imu', 'late-imu-payment-penalty'),
  // Guides par type de bien
  r('secondaCasa', 'imu-seconda-casa', 'imu-second-home'),
  r('primaCasa', 'imu-prima-casa', 'imu-main-home-exemption'),
  r('lusso', 'imu-abitazione-di-lusso', 'imu-luxury-home-a1-a8-a9'),
  r('pertinenze', 'imu-pertinenze', 'imu-garage-cellar-pertinenze'),
  r('terreni', 'imu-terreni-agricoli', 'imu-agricultural-land'),
  r('aree', 'imu-aree-fabbricabili', 'imu-building-land'),
  r('rurali', 'imu-fabbricati-rurali', 'imu-rural-farm-buildings'),
  r('capannoni', 'imu-capannoni-categoria-d', 'imu-commercial-property-group-d'),
  r('negozi', 'imu-negozi-c1', 'imu-shops-c1'),
  r('uffici', 'imu-uffici-a10', 'imu-offices-a10'),
  // Riduzioni ed esenzioni
  r('comodato', 'imu-comodato-uso-gratuito', 'imu-free-loan-to-children'),
  r('concordato', 'imu-canone-concordato', 'imu-agreed-rent-reduction'),
  r('locati', 'imu-immobili-affittati', 'imu-rented-property'),
  r('inagibili', 'imu-immobili-inagibili', 'imu-uninhabitable-buildings'),
  r('storici', 'imu-immobili-storici', 'imu-listed-buildings'),
  r('esteri', 'imu-residenti-estero', 'imu-for-non-residents'),
  r('anziani', 'imu-anziani-ricoverati', 'imu-elderly-in-care-homes'),
  r('occupati', 'imu-immobili-occupati-abusivamente', 'imu-squatted-property'),
  r('esenzioni', 'esenzioni-imu', 'imu-exemptions'),
  // Situazioni
  r('compravendita', 'imu-compravendita', 'imu-when-buying-or-selling'),
  r('coniugi', 'imu-coniugi-residenze-diverse', 'imu-spouses-different-homes'),
  r('separazione', 'imu-casa-coniugale-separazione', 'imu-separation-family-home'),
  r('usufrutto', 'imu-usufrutto-nuda-proprieta', 'imu-usufruct-bare-ownership'),
  r('eredita', 'imu-immobile-ereditato', 'imu-inherited-property'),
  // Pagamento e calcolo
  r('acconto', 'acconto-imu', 'imu-june-payment'),
  r('saldo', 'saldo-imu', 'imu-december-payment'),
  r('scadenze', 'scadenze-imu-2026', 'imu-deadlines-2026'),
  r('f24', 'codici-tributo-imu-f24', 'imu-f24-tax-codes'),
  r('rendita', 'rendita-catastale-imu', 'cadastral-income-rendita'),
  r('coefficienti', 'coefficienti-catastali-imu', 'imu-cadastral-multipliers'),
  r('aliquoteBase', 'aliquote-imu-2026', 'imu-rates-2026'),
  r('dichiarazione', 'dichiarazione-imu', 'imu-return-dichiarazione'),
  r('rimborso', 'rimborso-imu', 'imu-refund'),
  r('novita', 'imu-2026-novita', 'imu-2026-whats-new'),
  r('regimi', 'ilia-imis-imi', 'ilia-imis-imi-friuli-trentino'),
  // Città
  ...CITTA.map((c) => r(`citta-${c.id}`, `imu-${c.it}`, `imu-${c.en}`)),
  // Service
  r('method', 'metodologia', 'methodology'),
  r('faq', 'faq', 'faq'),
  r('glossary', 'glossario', 'glossary'),
  r('about', 'chi-siamo', 'about'),
  r('widget', 'widget', 'widget', true),
  r('contact', 'contatti', 'contact', true),
  r('editorial', 'politica-editoriale', 'editorial-policy', true),
  r('privacy', 'privacy', 'privacy', true),
  r('terms', 'note-legali', 'terms', true),
  r('cookies', 'cookie-policy', 'cookies', true),
];
export const { NOINDEX_PATHS, route, altPaths } = makeRouter(LOCALES, ROUTES);
