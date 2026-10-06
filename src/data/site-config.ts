/** Configuration centrale du site (générée par new-site.py). */
export const SITE_URL = "https://aliquoteimu.it";
export const SITE_NAMES: Record<string, string> = {"it": "AliquoteIMU.it", "en": "AliquoteIMU.it"};
export const LANG_TAGS: Record<string, string> = {"it": "it-IT", "en": "en-IT"};
export const OG_LOCALES: Record<string, string> = {"it": "it_IT", "en": "en_GB"};
export const LOCALE_TAG = 'it-IT';
export const CURRENCY = 'EUR';
export const YEAR = 2026;
/** Année de création du site — signal d'ancienneté (RECETTE §8.0). */
export const SITE_FOUNDED = '2026';
export const LAST_UPDATED = '2026-10-03';
export const AUTHOR_NAME = 'Radif Partners';
export const AUTHOR_ROLE: Record<string, string> = {"it": "Editore di calcolatori e guide pratiche · IMU e fiscalità immobiliare locale", "en": "Publisher of calculators and practical guides · IMU and Italian local property tax"};
export const AUTHOR_DESC: Record<string, string> = {"it": "Radif Partners pubblica calcolatori gratuiti e guide pratiche di fiscalità. Ogni aliquota di questo sito viene dal prospetto pubblicato dal Dipartimento delle Finanze, con fonte e data di verifica in pagina.", "en": "Radif Partners publishes free calculators and practical tax guides. Every rate on this site comes from the prospetto published by Italy's Department of Finance, with the source and check date on the page."};
/** Sujets sur lesquels l'editeur est competent (schema.org knowsAbout). Ce sont les
 *  themes reellement traites par le site, pas une liste de mots-cles : un sujet
 *  declare ici sans page qui le couvre est une declaration fausse. */
export const KNOWS_ABOUT: Record<string, string[]> = {"it": ["IMU", "Aliquote IMU comunali", "Rendita catastale", "Modello F24", "Ravvedimento operoso"], "en": ["IMU Italian property tax", "Municipal IMU rates", "Cadastral income", "F24 payment form", "Late payment correction (ravvedimento)"]};
export const CONTACT_EMAIL = "contatti@aliquoteimu.it";
export const THEME_COLOR = '#00703C';
export const LOGO_SYMBOL = '€';
export const BING_VERIFY_CODE = '';
export const GOOGLE_VERIFY_CODE = '';
/** Régime de consentement : 'opt-in' = rien avant l'accord (UE, Suisse) ;
 *  'notice' = mesure d'audience active avec information préalable et retrait (CA, AU). */
export const CONSENT_MODE: 'opt-in' | 'notice' | 'none' = 'none';
export const GA4_ID = '';
/** Projet Microsoft Clarity (compte amradif). Vide = aucun traceur ni bandeau. */
export const CLARITY_ID = 'ysy0fjuspu';
export const INDEXNOW_KEY = 'b3e4554a80096f758adc2297991277d3';

/* ------------------------------------------------------------------------- *
 * IDENTITÉ LÉGALE — À COMPLÉTER AVANT LA MISE EN LIGNE
 * Ces champs alimentent la mention légale du pays, la politique de confidentialité,
 * la page contact et le schema Organization. Un champ vide s'affiche en jaune
 * sur le site. Contrôle : `npm run check:legal`.
 * ------------------------------------------------------------------------- */
export interface LegalHosting { name: string; address: string; phone: string; url: string }
export interface LegalIdentity {
  entityName: string; legalForm: string; street: string; postalCode: string; city: string;
  country: string; phone: string; registerLabel: string; registerNumber: string;
  vatLabel: string; vatNumber: string; jurisdiction: string;
  supervisoryAuthority: string; supervisoryAuthorityUrl: string; hosting: LegalHosting;
}
export const LEGAL: LegalIdentity = {
  entityName: 'Radif Partners',  // éditeur de tous les sites du portefeuille (RECETTE §8)
  legalForm: '',  // vide : publication à titre personnel, pas de société
  street: '49 rue du Ressort',
  postalCode: '63000',
  city: 'Clermont-Ferrand',
  country: "France",
  phone: '',                 // ligne de contact publiée
  registerLabel: "SIREN",
  registerNumber: '',
  vatLabel: "VAT",
  vatNumber: '',             // laisser vide si non assujetti
  jurisdiction: "France",
  supervisoryAuthority: "Commission nationale de l'informatique et des libertés (CNIL)",
  supervisoryAuthorityUrl: "https://www.cnil.fr",
  hosting: { name: 'GitHub, Inc. (GitHub Pages)', address: '88 Colin P Kelly Jr Street, San Francisco, CA 94107, United States', phone: '', url: 'https://pages.github.com' },
};

/** Champs sans lesquels le site ne doit pas être mis en ligne. */
export const LEGAL_REQUIRED: Array<keyof LegalIdentity> = ['entityName', 'street', 'postalCode', 'city'];

/** Profils publics de l'auteur (schema.org sameAs). Laisser vide si aucun. */
export const AUTHOR_SAME_AS: string[] = [];

/** Rythme de revue éditoriale annoncé sur le site, en mois. */
export const REVIEW_CYCLE_MONTHS = 12;
