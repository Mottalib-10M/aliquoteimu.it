/**
 * Mini-simulateurs des pages (RECETTE §9.3) : un par sujet, calculés par le moteur IMU testé.
 * Libellés en italien et en anglais ; montants au format de la langue. Aucun accès à comuni.json
 * ici (poids) : une page de ville passe ses aliquote par `opts`.
 */
import P from '../data/params-2026.json';
import { calcolaImu, mesiTrasferimento, ravvedimento, baseFabbricato, type Categoria } from './engine/imu';
import { formatMoney, formatAliquota, formatPercent, formatDecimal, type Lang } from './format';
import type { MiniSpec, MiniInput } from './mini-types';

type Opts = Record<string, number | string> | undefined;
type Builder = (lang: Lang, o: Opts) => MiniSpec;
const tr = (lang: Lang, it: string, en: string) => (lang === 'en' ? en : it);
const AB = P.aliquote_base;
const MB = P.base.moltiplicatori;
const al = (v: number, lang: Lang) => formatAliquota(v, lang);
const MAX = P.limiti.altri_max, MAXM = P.limiti.altri_max + P.limiti.maggiorazione_ex_tasi, SD = P.sanzioni_dichiarazione;

const rendita = (lang: Lang, def = 800, id = 'r'): MiniInput => ({ id, label: tr(lang, 'Rendita catastale (visura)', 'Cadastral income (rendita)'), def, unit: '€', max: 1000000, decimals: 2 });
const aliquota = (lang: Lang, def = 1.06, id = 'a'): MiniInput => ({ id, label: tr(lang, 'Aliquota del comune', 'Comune rate'), def, unit: '%', max: 1.14, decimals: 3 });
const imuAnnua = (lang: Lang, def = 1200): MiniInput => ({ id: 'i', label: tr(lang, 'IMU annua dell’immobile', 'Annual IMU on the property'), def, unit: '€', max: 1000000 });

const CAT_OPTS = (_lang: Lang, cats: Categoria[]) => cats.map((c, i) => ({ value: String(i), label: c === 'D' ? 'D/1-D/9' : c.replace(/^([A-D])(\d+)$/, '$1/$2') }));

const SPECS: Record<string, Builder> = {
  seconda: (lang) => ({
    title: tr(lang, 'Quanto costa l’IMU sulla tua seconda casa', 'What IMU costs on your second home'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026 sull’intero anno', 'IMU 2026 for the full year'), $(x.imposta)], rows: [[tr(lang, 'Base imponibile', 'Taxable value'), $(x.base)], [tr(lang, 'Acconto 16 giugno', 'June instalment'), $(x.acconto)], [tr(lang, 'Saldo 16 dicembre', 'December balance'), $(x.saldo)]] }; },
  }),
  primaCasa: (lang) => {
    const cats: Categoria[] = ['A2', 'A3', 'A4', 'A7', 'A1', 'A8', 'A9'];
    return {
      title: tr(lang, 'La tua abitazione principale paga l’IMU?', 'Does your main home pay IMU?'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
      inputs: [{ id: 'c', label: tr(lang, 'Categoria catastale', 'Cadastral category'), def: 0, options: CAT_OPTS(lang, cats) }, rendita(lang, 900)],
      run: ({ c, r }) => { const cat = cats[c] ?? 'A2'; const x = calcolaImu({ categoria: cat, rendita: r, aliquota: AB.ap, uso: 'ap' }); const $ = (v: number) => formatMoney(v, 0, lang);
        return x.motivo === 'ap'
          ? { head: [tr(lang, 'IMU dovuta', 'IMU due'), $(0)], rows: [[tr(lang, 'Motivo', 'Why'), tr(lang, 'esente (comma 740)', 'exempt (paragraph 740)')], [tr(lang, `Imposta evitata a ${al(AB.altri, lang)}`, `Tax avoided at ${al(AB.altri, lang)}`), $(calcolaImu({ categoria: cat, rendita: r, aliquota: AB.altri }).imposta)]] }
          : { head: [tr(lang, `IMU dovuta (aliquota base ${al(AB.ap, lang)})`, `IMU due (base rate ${al(AB.ap, lang)})`), $(x.imposta)], rows: [[tr(lang, 'Imposta lorda', 'Gross tax'), $(x.impostaLorda)], [tr(lang, 'Detrazione', 'Deduction'), `−${$(x.detrazione)}`]] }; },
    };
  },
  lusso: (lang) => ({
    title: tr(lang, 'IMU su un’abitazione principale A/1, A/8 o A/9', 'IMU on an A/1, A/8 or A/9 main home'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 2500), aliquota(lang, 0.6)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'A8', rendita: r, aliquota: a, uso: 'ap' }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026 dopo la detrazione', 'IMU 2026 after the deduction'), $(x.imposta)], rows: [[tr(lang, 'Imposta lorda', 'Gross tax'), $(x.impostaLorda)], [tr(lang, 'Detrazione', 'Deduction'), `−${$(x.detrazione)}`], [tr(lang, 'Ogni rata', 'Each instalment'), $(x.acconto)]] }; },
  }),
  pertinenze: (lang) => ({
    title: tr(lang, 'Box o cantina in più: quanto paga', 'An extra garage or cellar: what it pays'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 120), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'C6', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU sul secondo box (non pertinenza)', 'IMU on a second garage (not a pertinenza)'), $(x.imposta)], rows: [[tr(lang, 'Come pertinenza dell’abitazione principale', 'As a pertinenza of the main home'), $(0)], [tr(lang, `Base imponibile (×${MB.C6})`, `Taxable value (×${MB.C6})`), $(x.base)]] }; },
  }),
  terreni: (lang) => ({
    title: tr(lang, 'IMU sul tuo terreno agricolo', 'IMU on your farmland'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [{ id: 'r', label: tr(lang, 'Reddito dominicale', 'Land income (reddito dominicale)'), def: 300, unit: '€', max: 1000000, decimals: 2 }, aliquota(lang, AB.ter)],
    run: ({ r, a }) => { const x = calcolaImu({ tipo: 'terreno', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU per chi non è coltivatore diretto', 'IMU if you are not a registered farmer'), $(x.imposta)], rows: [[tr(lang, `Base (×${formatDecimal(1 + P.base.rivalutazione_dominicale, 2, lang)} ×${P.base.moltiplicatore_terreni})`, `Base (×${formatDecimal(1 + P.base.rivalutazione_dominicale, 2, lang)} ×${P.base.moltiplicatore_terreni})`), $(x.base)], [tr(lang, 'Coltivatore diretto o IAP', 'Registered farmer'), $(0)]] }; },
  }),
  aree: (lang) => ({
    title: tr(lang, 'IMU su un’area fabbricabile', 'IMU on building land'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [{ id: 'v', label: tr(lang, 'Valore venale al 1° gennaio', 'Market value on 1 January'), def: 80000, unit: '€', max: 100000000 }, aliquota(lang)],
    run: ({ v, a }) => { const x = calcolaImu({ tipo: 'area', rendita: v, aliquota: a }); const $ = (n: number) => formatMoney(n, 0, lang);
      return { head: [tr(lang, 'IMU 2026', 'IMU 2026'), $(x.imposta)], rows: [[tr(lang, 'Per ogni 10 000 € di valore', 'Per €10,000 of value'), $(10000 * a / 100)], [tr(lang, 'Ogni rata', 'Each instalment'), $(x.acconto)]] }; },
  }),
  rurali: (lang) => ({
    title: tr(lang, 'IMU su un fabbricato rurale strumentale', 'IMU on a rural farm building'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 1500), aliquota(lang, AB.rur)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'D10', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, `IMU 2026 (codice ${P.f24.rur})`, `IMU 2026 (code ${P.f24.rur})`), $(x.imposta)], rows: [[tr(lang, `Base imponibile (×${MB.D})`, `Taxable value (×${MB.D})`), $(x.base)], [tr(lang, 'Aliquota massima', 'Maximum rate'), formatAliquota(AB.rur, lang)]] }; },
  }),
  capannoni: (lang) => ({
    title: tr(lang, 'IMU su un capannone: Stato e comune', 'IMU on a group D building: State and comune'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 8000), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'D', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026', 'IMU 2026'), $(x.imposta)], rows: [[tr(lang, `Quota Stato ${al(P.limiti.D_quota_stato, lang)} (${P.f24.D_stato})`, `State share ${al(P.limiti.D_quota_stato, lang)} (${P.f24.D_stato})`), $(x.stato)], [tr(lang, `Quota comune (${P.f24.D_comune})`, `Comune share (${P.f24.D_comune})`), $(x.comune)], [`Base (×${MB.D})`, $(x.base)]] }; },
  }),
  negozi: (lang) => ({
    title: tr(lang, 'IMU sul tuo negozio C/1', 'IMU on your C/1 shop'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 2000), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'C1', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026', 'IMU 2026'), $(x.imposta)], rows: [[`Base (×${MB.C1})`, $(x.base)], [tr(lang, 'Al mese', 'Per month'), $(x.imposta / 12)]] }; },
  }),
  uffici: (lang) => ({
    title: tr(lang, 'IMU sul tuo ufficio A/10', 'IMU on your A/10 office'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 1500), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'A10', rendita: r, aliquota: a }); const y = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026', 'IMU 2026'), $(x.imposta)], rows: [[`Base (×${MB.A10})`, $(x.base)], [tr(lang, `Stessa rendita come abitazione (×${MB.A})`, `Same rendita as a home (×${MB.A})`), $(y.imposta)]] }; },
  }),
  comodato: (lang) => ({
    title: tr(lang, 'Quanto fai risparmiare il comodato al figlio', 'What a free loan to your child saves'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), aliquota(lang)],
    run: ({ r, a }) => { const n = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a }); const c = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a, riduzione: 'comodato' }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU con comodato registrato', 'IMU with a registered free loan'), $(c.imposta)], rows: [[tr(lang, 'Senza comodato', 'Without the loan'), $(n.imposta)], [tr(lang, 'Risparmio annuo', 'Annual saving'), $(n.imposta - c.imposta)]] }; },
  }),
  concordato: (lang) => ({
    title: tr(lang, 'Canone concordato contro canone libero', 'Agreed rent versus market rent'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), aliquota(lang)],
    run: ({ r, a }) => { const l = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const c = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a, canoneConcordato: true }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, `IMU a canone concordato (${formatPercent(P.riduzioni.canone_concordato_imposta, 0, lang)})`, `IMU at agreed rent (${formatPercent(P.riduzioni.canone_concordato_imposta, 0, lang)})`), $(c.imposta)], rows: [[tr(lang, 'A canone libero', 'At market rent'), $(l.imposta)], [tr(lang, 'Differenza annua', 'Yearly difference'), $(l.imposta - c.imposta)]] }; },
  }),
  locati: (lang) => ({
    title: tr(lang, 'Quanto pesa l’IMU sull’affitto incassato', 'How much of the rent IMU takes'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), { id: 'k', label: tr(lang, 'Canone annuo', 'Annual rent'), def: 9000, unit: '€', max: 10000000 }],
    run: ({ r, k }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: P.limiti.altri_max }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, `IMU a ${al(MAX, lang)}`, `IMU at ${al(MAX, lang)}`), $(x.imposta)], rows: [[tr(lang, 'Quota del canone', 'Share of the rent'), formatPercent(k > 0 ? x.imposta / k : 0, 1, lang)], [tr(lang, 'Mensilità di affitto assorbite', 'Months of rent it absorbs'), formatDecimal(k > 0 ? x.imposta / (k / 12) : 0, 1, lang)]] }; },
  }),
  inagibili: (lang) => ({
    title: tr(lang, 'IMU su un immobile inagibile per alcuni mesi', 'IMU on a building unfit for part of the year'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), { id: 'm', label: tr(lang, 'Mesi di inagibilità nel 2026', 'Months unfit in 2026'), def: 12, unit: tr(lang, 'mesi', 'months'), max: 12 }],
    run: ({ r, m }) => { const a = P.limiti.altri_max; const mm = Math.max(0, Math.min(12, Math.round(m)));
      const ina = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a, riduzione: 'inagibile', mesi: mm }).imposta + calcolaImu({ categoria: 'A3', rendita: r, aliquota: a, mesi: 12 - mm }).imposta;
      const pieno = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a }).imposta; const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026 con la riduzione', 'IMU 2026 with the reduction'), $(ina)], rows: [[tr(lang, 'Senza riduzione', 'Without the reduction'), $(pieno)], [tr(lang, 'Risparmio', 'Saving'), $(pieno - ina)]], note: tr(lang, `Aliquota ${al(MAX, lang)}, categoria A/3.`, `Rate ${al(MAX, lang)}, category A/3.`) }; },
  }),
  storici: (lang) => ({
    title: tr(lang, 'IMU su un immobile vincolato', 'IMU on a listed building'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 1800), aliquota(lang)],
    run: ({ r, a }) => { const n = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const s = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a, riduzione: 'storico' }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU con base dimezzata', 'IMU with the value halved'), $(s.imposta)], rows: [[tr(lang, 'Senza vincolo', 'If not listed'), $(n.imposta)], [tr(lang, 'Risparmio annuo', 'Annual saving'), $(n.imposta - s.imposta)]] }; },
  }),
  esteri: (lang) => ({
    title: tr(lang, 'IMU per il pensionato residente all’estero', 'IMU for a pensioner living abroad'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 700), aliquota(lang)],
    run: ({ r, a }) => { const n = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a }); const p = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a, pensionatoEstero: true }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU con la riduzione a metà', 'IMU at half rate'), $(p.imposta)], rows: [[tr(lang, 'Senza riduzione', 'Without the reduction'), $(n.imposta)], [tr(lang, 'Ogni rata', 'Each instalment'), $(p.acconto)]] }; },
  }),
  anziani: (lang) => ({
    title: tr(lang, 'Casa dell’anziano ricoverato: con o senza assimilazione', 'Home of a person in care: with or without the relief'), cta: tr(lang, 'Aliquote per comune', 'Rates by comune'),
    inputs: [rendita(lang, 650), aliquota(lang)],
    run: ({ r, a }) => { const n = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Se il comune assimila', 'If the comune grants the relief'), $(0)], rows: [[tr(lang, 'Se il comune non assimila', 'If it does not'), $(n.imposta)], [tr(lang, 'Ogni rata in quel caso', 'Each instalment then'), $(n.acconto)]] }; },
  }),
  occupati: (lang) => ({
    title: tr(lang, 'Immobile occupato: l’IMU che non paghi', 'Squatted property: the IMU you no longer pay'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), { id: 'm', label: tr(lang, 'Mesi dall’occupazione denunciata', 'Months since the reported occupation'), def: 8, unit: tr(lang, 'mesi', 'months'), max: 12 }],
    run: ({ r, m }) => { const a = P.limiti.altri_max; const mm = Math.max(0, Math.min(12, Math.round(m))); const dov = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a, mesi: 12 - mm, periodo: 'inizio' }); const piena = calcolaImu({ categoria: 'A3', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU 2026 ancora dovuta', 'IMU 2026 still due'), $(dov.imposta)], rows: [[tr(lang, 'Esenzione per i mesi di occupazione', 'Exemption for the occupied months'), $(piena.imposta - dov.imposta)], [tr(lang, 'Senza esenzione', 'Without the exemption'), $(piena.imposta)]], note: tr(lang, `Aliquota ${al(MAX, lang)}, occupazione fino a dicembre.`, `Rate ${al(MAX, lang)}, occupation lasting to December.`) }; },
  }),
  esenzioni: (lang) => ({
    title: tr(lang, 'Quanto vale un’esenzione IMU', 'What an IMU exemption is worth'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 900), aliquota(lang)],
    run: ({ r, a }) => { const n = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Imposta evitata ogni anno', 'Tax avoided each year'), $(n.imposta)], rows: [[tr(lang, 'In 10 anni', 'Over 10 years'), $(n.imposta * 10)], [tr(lang, 'Base imponibile', 'Taxable value'), $(n.base)]] }; },
  }),
  compravendita: (lang) => ({
    title: tr(lang, 'Rogito in corso d’anno: chi paga quanti mesi', 'Sale during the year: who pays which months'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [{ id: 'g', label: tr(lang, 'Giorno del rogito', 'Day of the deed'), def: 16, max: 31 }, { id: 'm', label: tr(lang, 'Mese del rogito (1-12)', 'Month of the deed (1-12)'), def: 3, max: 12 }, imuAnnua(lang)],
    run: ({ g, m, i }) => { const mm = Math.max(1, Math.min(12, Math.round(m))); const dd = Math.max(1, Math.min(new Date(Date.UTC(2026, mm, 0)).getUTCDate(), Math.round(g)));
      const t = mesiTrasferimento(`2026-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Mesi a carico dell’acquirente', 'Months for the buyer'), String(t.acquirente)], rows: [[tr(lang, 'Mesi a carico del venditore', 'Months for the seller'), String(t.venditore)], [tr(lang, 'IMU dell’acquirente', 'Buyer’s IMU'), $(i * t.acquirente / 12)], [tr(lang, 'IMU del venditore', 'Seller’s IMU'), $(i * t.venditore / 12)]] }; },
  }),
  coniugi: (lang) => ({
    title: tr(lang, 'Due case, due residenze: l’IMU di ciascun coniuge', 'Two homes, two residences: each spouse’s IMU'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 700, 'r1'), rendita(lang, 600, 'r2')],
    run: ({ r1, r2 }) => { const a = P.limiti.altri_max; const x1 = calcolaImu({ categoria: 'A3', rendita: r1, aliquota: a }).imposta; const x2 = calcolaImu({ categoria: 'A3', rendita: r2, aliquota: a }).imposta; const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU con dimora e residenza effettive in ciascuna', 'IMU with genuine residence in each'), $(0)], rows: [[tr(lang, 'Se la seconda non è abitazione principale', 'If the second is not a main home'), $(Math.min(x1, x2))], [tr(lang, 'Se nessuna delle due lo è', 'If neither is'), $(x1 + x2)]], note: tr(lang, `Aliquota ${al(MAX, lang)} per le case non esenti.`, `Rate ${al(MAX, lang)} on homes that are not exempt.`) }; },
  }),
  separazione: (lang) => ({
    title: tr(lang, 'Casa familiare assegnata: chi paga', 'Family home assigned by a court: who pays'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 900), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU del genitore assegnatario', 'IMU of the parent living there'), $(0)], rows: [[tr(lang, 'IMU del coniuge proprietario uscito', 'IMU of the owner who moved out'), $(0)], [tr(lang, 'Se la casa non fosse assegnata', 'If the home were not assigned'), $(x.imposta)]] }; },
  }),
  usufrutto: (lang) => ({
    title: tr(lang, 'Usufruttuario o nudo proprietario: chi paga', 'Usufructuary or bare owner: who pays'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU a carico dell’usufruttuario', 'IMU paid by the usufructuary'), $(x.imposta)], rows: [[tr(lang, 'Nudo proprietario', 'Bare owner'), $(0)], [tr(lang, 'Ogni rata', 'Each instalment'), $(x.acconto)]] }; },
  }),
  eredita: (lang) => ({
    title: tr(lang, 'Immobile ereditato a metà anno', 'Property inherited mid-year'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), { id: 'q', label: tr(lang, 'Tua quota ereditaria', 'Your share of the estate'), def: 50, unit: '%', max: 100 }, { id: 'm', label: tr(lang, 'Mesi da erede nel 2026', 'Months as heir in 2026'), def: 7, unit: tr(lang, 'mesi', 'months'), max: 12 }],
    run: ({ r, q, m }) => { const x = calcolaImu({ categoria: 'A3', rendita: r, aliquota: P.limiti.altri_max, quota: q, mesi: m, periodo: 'fine' }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'La tua IMU 2026', 'Your IMU 2026'), $(x.imposta)], rows: [[tr(lang, 'Acconto di giugno', 'June instalment'), $(x.acconto)], [tr(lang, 'Saldo di dicembre', 'December balance'), $(x.saldo)]], note: tr(lang, `Aliquota ${al(MAX, lang)}, categoria A/3.`, `Rate ${al(MAX, lang)}, category A/3.`) }; },
  }),
  acconto: (lang) => ({
    title: tr(lang, 'Il tuo acconto IMU di giugno', 'Your June IMU instalment'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), aliquota(lang, 1.06, 'p')],
    run: ({ r, p }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: p }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Acconto entro il 16 giugno', 'Due by 16 June'), $(x.acconto)], rows: [[tr(lang, 'In F24 (arrotondato)', 'On the F24 (rounded)'), $(x.f24[0]?.importo ?? 0)], [tr(lang, 'Rata unica a giugno', 'Single payment in June'), $(x.imposta)]], note: tr(lang, 'Con l’aliquota dell’anno precedente.', 'Using the previous year’s rate.') }; },
  }),
  saldo: (lang) => ({
    title: tr(lang, 'Il saldo di dicembre se l’aliquota cambia', 'The December balance when the rate changes'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), { id: 'p', label: tr(lang, 'Aliquota 2025 (acconto)', '2025 rate (June)'), def: 0.96, unit: '%', max: 1.14, decimals: 3 }, { id: 'a', label: tr(lang, 'Aliquota 2026 (saldo)', '2026 rate (December)'), def: 1.06, unit: '%', max: 1.14, decimals: 3 }],
    run: ({ r, p, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a, aliquotaAcconto: p }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Saldo entro il 16 dicembre', 'Balance by 16 December'), $(x.saldo)], rows: [[tr(lang, 'Acconto già pagato', 'Already paid in June'), $(x.acconto)], [tr(lang, 'IMU 2026 totale', 'Total IMU 2026'), $(x.imposta)]] }; },
  }),
  scadenze: (lang) => ({
    title: tr(lang, 'Rate o rata unica: cosa versare e quando', 'Two instalments or one: what to pay and when'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [imuAnnua(lang, 1500)],
    run: ({ i }) => { const $ = (v: number) => formatMoney(v, 0, lang); const half = i / 2;
      return { head: [tr(lang, 'Entro il 16 giugno 2026', 'By 16 June 2026'), $(half)], rows: [[tr(lang, 'Entro il 16 dicembre 2026', 'By 16 December 2026'), $(i - half)], [tr(lang, 'Oppure tutto entro il 16 giugno', 'Or everything by 16 June'), $(i)]], note: tr(lang, 'Se l’aliquota non cambia tra un anno e l’altro.', 'If the rate does not change from one year to the next.') }; },
  }),
  f24: (lang) => ({
    title: tr(lang, 'Gli importi da scrivere nell’F24', 'The amounts to write on the F24'), cta: tr(lang, 'Calcolo IMU con righe F24', 'IMU calculator with F24 lines'),
    inputs: [rendita(lang, 8000), aliquota(lang)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'D', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      const g = (c: string, rt: string) => x.f24.find((f) => f.codice === c && f.rata === rt)?.importo ?? 0;
      return { head: [tr(lang, 'Totale F24 di giugno (capannone)', 'Total June F24 (group D)'), $(g(P.f24.D_stato, 'acconto') + g(P.f24.D_comune, 'acconto'))], rows: [[`${P.f24.D_stato} ` + tr(lang, 'Stato', 'State'), $(g(P.f24.D_stato, 'acconto'))], [`${P.f24.D_comune} comune`, $(g(P.f24.D_comune, 'acconto'))]] }; },
  }),
  rendita: (lang) => ({
    title: tr(lang, 'Dalla rendita catastale alla base IMU', 'From cadastral income to IMU base'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang, 650)],
    run: ({ r }) => { const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Base imponibile abitazione', 'Taxable value of a home'), $(baseFabbricato(r, 'A2'))], rows: [[tr(lang, `Rendita rivalutata del ${formatPercent(P.base.rivalutazione_rendita, 0, lang)}`, `Income revalued by ${formatPercent(P.base.rivalutazione_rendita, 0, lang)}`), formatMoney(r * (1 + P.base.rivalutazione_rendita), 2, lang)], [tr(lang, `IMU a ${al(MAX, lang)}`, `IMU at ${al(MAX, lang)}`), $(baseFabbricato(r, 'A2') * MAX / 100)]] }; },
  }),
  coefficienti: (lang) => {
    const cats: Categoria[] = ['A2', 'A10', 'B', 'C1', 'C2', 'C3', 'D', 'D5'];
    return {
      title: tr(lang, 'Stessa rendita, categoria diversa', 'Same income, different category'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
      inputs: [{ id: 'c', label: tr(lang, 'Categoria catastale', 'Cadastral category'), def: 3, options: CAT_OPTS(lang, cats) }, rendita(lang, 1000)],
      run: ({ c, r }) => { const cat = cats[c] ?? 'A2'; const b = baseFabbricato(r, cat); const $ = (v: number) => formatMoney(v, 0, lang);
        return { head: [tr(lang, 'Base imponibile', 'Taxable value'), $(b)], rows: [[tr(lang, 'Moltiplicatore', 'Multiplier'), String(Math.round(b / (r * (1 + P.base.rivalutazione_rendita) || 1)))], [tr(lang, `IMU a ${al(MAX, lang)}`, `IMU at ${al(MAX, lang)}`), $(b * MAX / 100)]] }; },
    };
  },
  aliquoteBase: (lang) => ({
    title: tr(lang, 'La stessa casa all’aliquota minima, base e massima', 'The same home at the lowest, base and highest rate'), cta: tr(lang, 'Aliquote per comune', 'Rates by comune'),
    inputs: [rendita(lang)],
    run: ({ r }) => { const $ = (v: number) => formatMoney(v, 0, lang); const b = baseFabbricato(r, 'A2');
      return { head: [tr(lang, `Aliquota base ${al(AB.altri, lang)}`, `Base rate ${al(AB.altri, lang)}`), $(b * AB.altri / 100)], rows: [[tr(lang, `Massima ${al(MAX, lang)}`, `Maximum ${al(MAX, lang)}`), $(b * P.limiti.altri_max / 100)], [tr(lang, `Con maggiorazione ${al(MAXM, lang)}`, `With surcharge ${al(MAXM, lang)}`), $(b * MAXM / 100)]] }; },
  }),
  dichiarazione: (lang) => ({
    title: tr(lang, 'Dichiarazione omessa: la sanzione minima', 'Return not filed: the minimum penalty'), cta: tr(lang, 'Ravvedimento operoso', 'Late payment calculator'),
    inputs: [imuAnnua(lang, 900)],
    run: ({ i }) => { const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, `Sanzione per omessa dichiarazione (${formatPercent(SD.omessa, 0, lang)})`, `Penalty for no return (${formatPercent(SD.omessa, 0, lang)})`), $(Math.max(SD.minimo, i * SD.omessa))], rows: [[tr(lang, `Infedele dichiarazione (${formatPercent(SD.infedele, 0, lang)})`, `Inaccurate return (${formatPercent(SD.infedele, 0, lang)})`), $(Math.max(SD.minimo, i * SD.infedele))], [tr(lang, 'Con acquiescenza (un terzo)', 'If accepted (one third)'), $(Math.max(SD.minimo, i * SD.omessa) * SD.acquiescenza)]], note: tr(lang, `Minimo ${formatMoney(SD.minimo, 0, lang)} (comma 775).`, `Minimum ${formatMoney(SD.minimo, 0, lang)} (paragraph 775).`) }; },
  }),
  rimborso: (lang) => ({
    title: tr(lang, 'Quanto hai versato in più', 'How much you overpaid'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [{ id: 'v', label: tr(lang, 'Totale versato nel 2026', 'Total paid in 2026'), def: 1900, unit: '€', max: 1000000 }, rendita(lang), aliquota(lang)],
    run: ({ v, r, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (n: number) => formatMoney(n, 0, lang);
      return { head: [tr(lang, 'Importo da chiedere a rimborso', 'Amount to claim back'), $(Math.max(0, v - x.imposta))], rows: [[tr(lang, 'IMU effettivamente dovuta', 'IMU actually due'), $(x.imposta)], [tr(lang, 'Ancora da versare', 'Still to pay'), $(Math.max(0, x.imposta - v))]] }; },
  }),
  novita: (lang) => ({
    title: tr(lang, 'Acconto 2025, saldo 2026: il conguaglio', 'June at 2025 rate, December at 2026 rate'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), { id: 'p', label: tr(lang, 'Aliquota 2025', '2025 rate'), def: 1.06, unit: '%', max: 1.14, decimals: 3 }, { id: 'a', label: tr(lang, 'Aliquota 2026', '2026 rate'), def: 1.14, unit: '%', max: 1.14, decimals: 3 }],
    run: ({ r, p, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a, aliquotaAcconto: p }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'Conguaglio a dicembre', 'December catch-up'), $(x.saldo - x.acconto)], rows: [[tr(lang, 'Acconto', 'June'), $(x.acconto)], [tr(lang, 'Saldo', 'December'), $(x.saldo)]] }; },
  }),
  regimi: (lang) => ({
    title: tr(lang, 'Se la casa fosse soggetta a IMU', 'If the home were under IMU'), cta: tr(lang, 'Calcolo IMU completo', 'Full IMU calculator'),
    inputs: [rendita(lang), aliquota(lang, AB.altri)],
    run: ({ r, a }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a }); const $ = (v: number) => formatMoney(v, 0, lang);
      return { head: [tr(lang, 'IMU teorica (fuori FVG e Trentino)', 'Theoretical IMU (outside FVG and Trentino)'), $(x.imposta)], rows: [[tr(lang, 'Base imponibile IMU', 'IMU taxable value'), $(x.base)]], note: tr(lang, 'ILIA, IMIS e IMI hanno basi e aliquote proprie: confronto indicativo.', 'ILIA, IMIS and IMI have their own bases and rates: indicative comparison.') }; },
  }),
  ravv: (lang) => ({
    title: tr(lang, 'Quanto costa pagare l’acconto in ritardo', 'What paying the June instalment late costs'), cta: tr(lang, 'Ravvedimento operoso completo', 'Full late payment calculator'),
    inputs: [{ id: 'i', label: tr(lang, 'Imposta non versata', 'Unpaid tax'), def: 500, unit: '€', max: 1000000 }, { id: 'g', label: tr(lang, 'Giorni di ritardo', 'Days late'), def: 20, unit: tr(lang, 'giorni', 'days'), max: 3650 }],
    run: ({ i, g }) => { const d = new Date(Date.UTC(2026, 5, 16 + Math.max(0, Math.round(g)))).toISOString().slice(0, 10); const x = ravvedimento({ imposta: i, scadenza: '2026-06-16', pagamento: d }); const $ = (v: number) => formatMoney(v, 2, lang);
      return { head: [tr(lang, 'Sanzione ridotta', 'Reduced penalty'), $(x.sanzione)], rows: [[tr(lang, 'Percentuale applicata', 'Rate applied'), formatPercent(x.sanzionePct, 2, lang)], [tr(lang, 'Più gli interessi al tasso legale', 'Plus interest at the legal rate'), tr(lang, 'giorno per giorno', 'day by day')]] }; },
  }),
  citta: (lang, o) => {
    const a = Number(o?.a ?? AB.altri), p = Number(o?.p ?? a), nome = String(o?.n ?? '');
    return {
      title: tr(lang, `IMU di una seconda casa a ${nome}`, `IMU on a second home in ${nome}`), cta: tr(lang, `Calcolo completo per ${nome}`, `Full calculator for ${nome}`),
      inputs: [rendita(lang, Number(o?.r ?? 900))],
      run: ({ r }) => { const x = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a, aliquotaAcconto: p }); const $ = (v: number) => formatMoney(v, 0, lang);
        return { head: [tr(lang, `IMU 2026 a ${formatAliquota(a, lang)}`, `IMU 2026 at ${formatAliquota(a, lang)}`), $(x.imposta)], rows: [[tr(lang, 'Acconto 16 giugno', 'June instalment'), $(x.acconto)], [tr(lang, 'Saldo 16 dicembre', 'December balance'), $(x.saldo)], [tr(lang, `Alla base nazionale ${al(AB.altri, lang)}`, `At the national base ${al(AB.altri, lang)}`), $(x.base * AB.altri / 100)]] }; },
    };
  },
  confronto: (lang, o) => {
    const a1 = Number(o?.a1 ?? 1.06), a2 = Number(o?.a2 ?? 0.86), n1 = String(o?.n1 ?? 'A'), n2 = String(o?.n2 ?? 'B');
    return {
      title: tr(lang, `${n1} o ${n2}: la stessa casa`, `${n1} or ${n2}: the same home`), cta: tr(lang, 'Confronta altri comuni', 'Compare other comuni'),
      inputs: [rendita(lang)],
      run: ({ r }) => { const x1 = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a1 }).imposta; const x2 = calcolaImu({ categoria: 'A2', rendita: r, aliquota: a2 }).imposta; const $ = (v: number) => formatMoney(v, 0, lang);
        return { head: [tr(lang, 'Differenza annua', 'Yearly difference'), $(Math.abs(x1 - x2))], rows: [[`${n1} (${formatAliquota(a1, lang)})`, $(x1)], [`${n2} (${formatAliquota(a2, lang)})`, $(x2)]] }; },
    };
  },
};

export function getSpec(kind: string, lang: string = 'it', opts?: Opts): MiniSpec {
  const b = SPECS[kind];
  if (!b) throw new Error(`mini-spec inconnu : ${kind}`);
  return b(lang === 'en' ? 'en' : 'it', opts);
}
export const MINI_KINDS = Object.keys(SPECS);
