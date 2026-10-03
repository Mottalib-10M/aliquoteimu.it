import { route, CITTA, type Locale } from './routes';
export interface NavLink { href: string; label: string } export interface NavCategory { label: string; links: NavLink[] }

const CITY_EN: Record<string, string> = { roma: 'Rome', milano: 'Milan', napoli: 'Naples', torino: 'Turin', palermo: 'Palermo', genova: 'Genoa', bologna: 'Bologna', firenze: 'Florence', bari: 'Bari', venezia: 'Venice' };
const CITY_IT: Record<string, string> = { roma: 'Roma', milano: 'Milano', napoli: 'Napoli', torino: 'Torino', palermo: 'Palermo', genova: 'Genova', bologna: 'Bologna', firenze: 'Firenze', bari: 'Bari', venezia: 'Venezia' };
export const cityName = (id: string, lang: Locale) => (lang === 'en' ? CITY_EN : CITY_IT)[id];

const L: Record<Locale, Record<string, string>> = {
  it: {
    home: 'Calcolo IMU 2026', aliquote: 'Aliquote IMU per comune', confronto: 'Confronto tra comuni', ravvedimento: 'Ravvedimento operoso IMU',
    secondaCasa: 'IMU seconda casa', primaCasa: 'IMU prima casa', lusso: 'Abitazione di lusso A/1, A/8, A/9', pertinenze: 'Pertinenze: box, cantina, posto auto',
    terreni: 'Terreni agricoli', aree: 'Aree fabbricabili', rurali: 'Fabbricati rurali', capannoni: 'Capannoni e gruppo D', negozi: 'Negozi C/1', uffici: 'Uffici A/10',
    comodato: 'Comodato d’uso gratuito', concordato: 'Canone concordato', locati: 'Immobili affittati', inagibili: 'Immobili inagibili', storici: 'Immobili storici',
    esteri: 'Residenti all’estero e AIRE', anziani: 'Anziani ricoverati', occupati: 'Immobili occupati', esenzioni: 'Esenzioni IMU',
    compravendita: 'Compravendita e mesi', coniugi: 'Coniugi con residenze diverse', separazione: 'Casa coniugale e separazione', usufrutto: 'Usufrutto e nuda proprietà', eredita: 'Immobile ereditato',
    acconto: 'Acconto IMU 16 giugno', saldo: 'Saldo IMU 16 dicembre', scadenze: 'Scadenze IMU 2026', f24: 'Codici tributo F24', rendita: 'Rendita catastale', coefficienti: 'Coefficienti catastali',
    aliquoteBase: 'Aliquote IMU 2026', dichiarazione: 'Dichiarazione IMU', rimborso: 'Rimborso IMU', novita: 'Novità IMU 2026', regimi: 'ILIA, IMIS e IMI',
    method: 'Metodologia', faq: 'Domande frequenti', glossary: 'Glossario', about: 'Chi siamo', widget: 'Inserisci il calcolatore', contact: 'Contatti',
    editorial: 'Politica editoriale', privacy: 'Privacy', terms: 'Note legali', cookies: 'Cookie',
  },
  en: {
    home: 'IMU calculator 2026', aliquote: 'IMU rates by comune', confronto: 'Compare comuni', ravvedimento: 'Late payment (ravvedimento)',
    secondaCasa: 'IMU on a second home', primaCasa: 'Main home exemption', lusso: 'Luxury homes A/1, A/8, A/9', pertinenze: 'Garages, cellars, parking',
    terreni: 'Agricultural land', aree: 'Building land', rurali: 'Rural farm buildings', capannoni: 'Group D and warehouses', negozi: 'Shops C/1', uffici: 'Offices A/10',
    comodato: 'Free loan to children', concordato: 'Agreed rent (canone concordato)', locati: 'Rented property', inagibili: 'Uninhabitable buildings', storici: 'Listed buildings',
    esteri: 'Non-residents and AIRE', anziani: 'Elderly in care homes', occupati: 'Squatted property', esenzioni: 'IMU exemptions',
    compravendita: 'Buying or selling', coniugi: 'Spouses with two homes', separazione: 'Separation and the family home', usufrutto: 'Usufruct and bare ownership', eredita: 'Inherited property',
    acconto: 'June payment (acconto)', saldo: 'December payment (saldo)', scadenze: 'IMU deadlines 2026', f24: 'F24 tax codes', rendita: 'Cadastral income (rendita)', coefficienti: 'Cadastral multipliers',
    aliquoteBase: 'IMU rates 2026', dichiarazione: 'IMU return', rimborso: 'IMU refund', novita: 'IMU 2026: what’s new', regimi: 'ILIA, IMIS and IMI',
    method: 'Methodology', faq: 'FAQ', glossary: 'Glossary', about: 'About', widget: 'Embed the calculator', contact: 'Contact',
    editorial: 'Editorial policy', privacy: 'Privacy', terms: 'Legal notice', cookies: 'Cookies',
  },
};
export const label = (id: string, lang: Locale) => {
  if (id.startsWith('citta-')) return `IMU ${cityName(id.slice(6), lang)}`;
  return L[lang][id] ?? id;
};
const link = (id: string, lang: Locale): NavLink => ({ href: route(id, lang), label: label(id, lang) });
export const GROUPS = {
  tools: ['home', 'aliquote', 'confronto', 'ravvedimento', 'aliquoteBase'],
  immobili: ['secondaCasa', 'primaCasa', 'lusso', 'pertinenze', 'locati', 'terreni', 'aree', 'rurali', 'capannoni', 'negozi', 'uffici'],
  riduzioni: ['comodato', 'concordato', 'inagibili', 'storici', 'esteri', 'anziani', 'occupati', 'esenzioni', 'regimi'],
  pagamento: ['acconto', 'saldo', 'scadenze', 'f24', 'rendita', 'coefficienti', 'dichiarazione', 'rimborso', 'novita'],
  situazioni: ['compravendita', 'coniugi', 'separazione', 'usufrutto', 'eredita'],
};
export function navCategories(lang: Locale): NavCategory[] {
  const it = lang === 'it';
  return [
    { label: it ? 'Calcolatori' : 'Calculators', links: GROUPS.tools.map((i) => link(i, lang)) },
    { label: it ? 'Immobili' : 'Property types', links: GROUPS.immobili.map((i) => link(i, lang)) },
    { label: it ? 'Riduzioni' : 'Reliefs', links: GROUPS.riduzioni.map((i) => link(i, lang)) },
    { label: it ? 'Pagamento' : 'Paying', links: [...GROUPS.pagamento, ...GROUPS.situazioni].map((i) => link(i, lang)) },
  ];
}
export const navDirect = (lang: Locale): NavLink[] => [link('faq', lang)];
export const footerColumns = (lang: Locale): NavCategory[] => {
  const it = lang === 'it';
  return [
    { label: it ? 'Calcolatori' : 'Calculators', links: GROUPS.tools.map((i) => link(i, lang)) },
    { label: it ? 'Immobili e riduzioni' : 'Property and reliefs', links: [...GROUPS.immobili, ...GROUPS.riduzioni].map((i) => link(i, lang)) },
    { label: it ? 'Pagamento e casi' : 'Paying and situations', links: [...GROUPS.pagamento, ...GROUPS.situazioni].map((i) => link(i, lang)) },
    { label: it ? 'Il sito' : 'Site', links: ['about', 'method', 'faq', 'glossary', 'editorial', 'contact', 'widget', 'privacy', 'terms', 'cookies'].map((i) => link(i, lang)) },
  ];
};
export const popularLinks = (lang: Locale): NavLink[] => CITTA.map((c) => link(`citta-${c.id}`, lang));
