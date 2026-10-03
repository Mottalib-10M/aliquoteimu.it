import type { Locale } from './routes';
const it = {
  updatedOn: 'Aggiornato il', editorialPolicy: 'Politica editoriale', contactLabel: 'Contatti', reviewedBy: 'Verificato da',
  skipToContent: 'Vai al contenuto', mainNav: 'Navigazione principale', breadcrumbLabel: 'Percorso', breadcrumbHome: 'Home', menuOpen: 'Apri il menu',
  faqTitle: 'Domande frequenti', relatedCalculators: 'Calcolatori e guide collegati', sourcesTitle: 'Fonti', writtenBy: 'A cura di',
  asOf: 'Aliquote', lastUpdated: 'aggiornate il', footerValidated: 'Prospetti ufficiali del Dipartimento delle Finanze', footerBrowser: 'Calcolo nel tuo browser · nessun dato trasmesso · gratuito',
  footerDisclaimer: 'Stima indicativa: non sostituisce il prospetto del comune né il parere di un professionista.', footerPopular: 'IMU nelle grandi città', notFound: 'Questa pagina non esiste.',
};
const en: typeof it = {
  updatedOn: 'Updated on', editorialPolicy: 'Editorial policy', contactLabel: 'Contact', reviewedBy: 'Checked by',
  skipToContent: 'Skip to content', mainNav: 'Main navigation', breadcrumbLabel: 'Breadcrumb', breadcrumbHome: 'Home', menuOpen: 'Open menu',
  faqTitle: 'Frequently asked questions', relatedCalculators: 'Related calculators and guides', sourcesTitle: 'Sources', writtenBy: 'Published by',
  asOf: 'Rates', lastUpdated: 'last updated', footerValidated: 'Official rate schedules from the Italian Department of Finance', footerBrowser: 'Calculated in your browser · no data sent · free',
  footerDisclaimer: 'Estimate only: it does not replace your comune’s rate schedule or professional advice.', footerPopular: 'IMU in major cities', notFound: 'This page does not exist.',
};
export function t(lang: Locale) { return lang === 'en' ? en : it; }
