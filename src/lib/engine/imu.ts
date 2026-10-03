/**
 * Moteur IMU 2026 — Legge 160/2019, art. 1, commi 738-783 (texte vigent relu le 2026-10-03).
 * Fonctions pures, aucune donnée transmise. Paramètres : src/data/params-2026.json.
 *
 *  - base imponibile : rendita catastale × 1,05 × moltiplicatore (comma 745) ; terreni : reddito
 *    dominicale × 1,25 × 135 (comma 746) ; aree fabbricabili : valore venale (comma 746)
 *  - riduzioni della base del 50 % (comma 747) : comodato a parenti di 1° grado, fabbricati storici,
 *    inagibili ; imposta al 75 % per il canone concordato (comma 760) ; metà per i pensionati
 *    residenti all'estero (L. 178/2020, c. 48)
 *  - abitazione principale esente salvo A/1, A/8, A/9 (comma 740), detrazione di 200 € (comma 749)
 *  - mesi : un mese conta se posseduto per più della metà dei giorni ; il giorno del trasferimento
 *    va all'acquirente, che tiene il mese a parità di giorni (comma 761)
 *  - acconto al 16 giugno con l'aliquota dell'anno precedente, saldo al 16 dicembre a conguaglio (comma 762)
 *  - gruppo D : quota dello 0,76 % allo Stato (codice 3925), il resto al comune (3930) (commi 744, 753)
 *  - F24 : ogni rigo arrotondato all'euro, per difetto fino a 49 centesimi (L. 296/2006, c. 166)
 */
import P from '../../data/params-2026.json';

export type Categoria =
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10' | 'A11'
  | 'B' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'D' | 'D5' | 'D10';
export type Tipo = 'fabbricato' | 'terreno' | 'area';
export type Uso = 'ap' | 'altro' | 'rurale';
export type RiduzioneBase = 'nessuna' | 'comodato' | 'storico' | 'inagibile';
/** Chiave della fattispecie nel prospetto del comune. */
export type Fattispecie = 'ap' | 'rur' | 'D' | 'ter' | 'aree' | 'altri';
/** Aliquote in percentuale (0,86 = 0,86 %). `ter` = -1 : terreni esenti (comune montano, comma 758 d). */
export type Rates = Record<Fattispecie, number>;

export const CATEGORIE: Categoria[] = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'B', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'D', 'D5', 'D10'];
export const RATES_BASE: Rates = { ...P.aliquote_base };
const M = P.base.moltiplicatori;

/** Categorie di lusso : le sole abitazioni principali soggette all'IMU (comma 740). */
export const lusso = (c: Categoria) => c === 'A1' || c === 'A8' || c === 'A9';

/** Moltiplicatore catastale (comma 745). */
export function moltiplicatore(c: Categoria): number {
  if (c === 'A10') return M.A10;
  if (c === 'D5') return M.D5;
  if (c === 'C1') return M.C1;
  if (c === 'C2' || c === 'C6' || c === 'C7') return M.C2;
  if (c === 'C3' || c === 'C4' || c === 'C5') return M.C3;
  if (c === 'B') return M.B;
  if (c === 'D' || c === 'D10') return M.D;
  return M.A; // gruppo A esclusa A/10
}

/** Base imponibile di un fabbricato : rendita (non rivalutata) × 1,05 × moltiplicatore. */
export const baseFabbricato = (rendita: number, c: Categoria) => Math.max(0, rendita) * (1 + P.base.rivalutazione_rendita) * moltiplicatore(c);
/** Base imponibile di un terreno agricolo : reddito dominicale × 1,25 × 135. */
export const baseTerreno = (dominicale: number) => Math.max(0, dominicale) * (1 + P.base.rivalutazione_dominicale) * P.base.moltiplicatore_terreni;

/** Fattispecie del prospetto applicabile all'immobile. */
export function fattispecie(tipo: Tipo, c: Categoria, uso: Uso): Fattispecie {
  if (tipo === 'terreno') return 'ter';
  if (tipo === 'area') return 'aree';
  if (uso === 'rurale' || c === 'D10') return 'rur';
  if (uso === 'ap') return 'ap';
  if (c === 'D' || c === 'D5') return 'D';
  return 'altri';
}

/** Codice tributo F24 della fattispecie (gruppo D : quota Stato e incremento comunale a parte). */
export const codiceTributo = (f: Fattispecie): string => ({ ap: P.f24.ap, rur: P.f24.rur, ter: P.f24.ter, aree: P.f24.aree, altri: P.f24.altri, D: P.f24.D_stato })[f];

/** Arrotondamento all'euro di un rigo F24 : per difetto fino a 49 centesimi, per eccesso oltre (L. 296/2006, c. 166). */
export function arrotonda(x: number): number {
  if (x <= 0) return 0;
  const cents = Math.round(x * 100);
  const euro = Math.floor(cents / 100), resto = cents % 100;
  return resto <= P.arrotondamento_centesimi ? euro : euro + 1;
}

/** Mesi posseduti in ciascun semestre. `periodo` : 'inizio' = da gennaio (immobile venduto),
 *  'fine' = fino a dicembre (immobile comprato). */
export function semestri(mesi: number, periodo: 'inizio' | 'fine' = 'fine'): [number, number] {
  const m = Math.max(0, Math.min(12, Math.round(mesi)));
  if (m === 12) return [6, 6];
  return periodo === 'inizio' ? [Math.min(m, 6), Math.max(0, m - 6)] : [Math.max(0, m - 6), Math.min(m, 6)];
}

/** Giorni del mese (mese 1-12). */
const giorniMese = (anno: number, mese: number) => new Date(Date.UTC(anno, mese, 0)).getUTCDate();

/** Mesi d'imposta di venditore e acquirente per un trasferimento alla data `iso` (comma 761). */
export function mesiTrasferimento(iso: string): { venditore: number; acquirente: number; meseAcquirente: boolean } {
  const [y, m, d] = iso.split('-').map(Number);
  const tot = giorniMese(y, m);
  const gAcq = tot - d + 1, gVen = d - 1; // il giorno del trasferimento va all'acquirente
  const meseAcquirente = gAcq >= gVen;
  return { venditore: (m - 1) + (meseAcquirente ? 0 : 1), acquirente: (12 - m) + (meseAcquirente ? 1 : 0), meseAcquirente };
}

export interface ImuInput {
  tipo?: Tipo;
  categoria?: Categoria;
  /** Rendita catastale non rivalutata (visura), oppure reddito dominicale per un terreno, oppure valore venale per un'area. */
  rendita: number;
  /** Rendita delle pertinenze C/2, C/6, C/7 dell'abitazione principale (una per categoria). */
  renditaPertinenze?: number;
  uso?: Uso;
  /** Aliquota 2026 in percentuale. */
  aliquota: number;
  /** Aliquota dell'anno precedente per l'acconto di giugno (comma 762) ; se assente, quella del 2026. */
  aliquotaAcconto?: number;
  quota?: number;
  mesi?: number;
  periodo?: 'inizio' | 'fine';
  riduzione?: RiduzioneBase;
  canoneConcordato?: boolean;
  pensionatoEstero?: boolean;
  /** Terreno posseduto e condotto da coltivatore diretto o IAP iscritto alla previdenza agricola (comma 758 a). */
  coltivatore?: boolean;
  detrazione?: number;
}

export interface RigoF24 { codice: string; rata: 'acconto' | 'saldo'; importo: number }
export interface ImuResult {
  esente: boolean;
  motivo?: 'ap' | 'coltivatore' | 'montano' | 'zero';
  fattispecie: Fattispecie;
  base: number;
  baseRidotta: number;
  impostaLorda: number;
  detrazione: number;
  imposta: number;
  acconto: number;
  saldo: number;
  /** Quota Stato e quota comune (gruppo D), sull'intero anno. */
  stato: number;
  comune: number;
  mesi: [number, number];
  f24: RigoF24[];
}

/** Imposta di un semestre (o dell'anno) per un'aliquota data, detrazione compresa. */
function imposta(baseRidotta: number, aliq: number, quota: number, mesi: number, fatt: Fattispecie, i: ImuInput) {
  let lorda = baseRidotta * (aliq / 100) * (quota / 100) * (mesi / 12);
  let stato = fatt === 'D' ? baseRidotta * (Math.min(aliq, P.limiti.D_quota_stato) / 100) * (quota / 100) * (mesi / 12) : 0;
  const fattore = (i.canoneConcordato ? P.riduzioni.canone_concordato_imposta : 1) * (i.pensionatoEstero ? P.riduzioni.pensionati_esteri_imposta : 1);
  lorda *= fattore; stato *= fattore;
  const det = fatt === 'ap' ? Math.min(lorda, (i.detrazione ?? P.detrazione_ap) * (mesi / 12) * (quota / 100)) : 0;
  return { lorda, det, netta: lorda - det, stato };
}

export function calcolaImu(i: ImuInput): ImuResult {
  const tipo = i.tipo ?? 'fabbricato';
  const cat = i.categoria ?? 'A2';
  const uso = i.uso ?? 'altro';
  const quota = Math.max(0, Math.min(100, i.quota ?? 100));
  const mesi = Math.max(0, Math.min(12, i.mesi ?? 12));
  const [m1, m2] = semestri(mesi, i.periodo);
  const fatt = fattispecie(tipo, cat, uso);
  const base = tipo === 'terreno' ? baseTerreno(i.rendita)
    : tipo === 'area' ? Math.max(0, i.rendita)
    : baseFabbricato(i.rendita, cat) + (uso === 'ap' ? baseFabbricato(i.renditaPertinenze ?? 0, 'C2') : 0);
  const RID: Record<RiduzioneBase, number> = { nessuna: 1, comodato: P.riduzioni.comodato_base, storico: P.riduzioni.storico_base, inagibile: P.riduzioni.inagibile_base };
  // Il comodato a parenti non vale per A/1, A/8, A/9 (comma 747 c).
  const rid = tipo === 'fabbricato' && i.riduzione && !(i.riduzione === 'comodato' && lusso(cat)) ? RID[i.riduzione] : 1;
  const baseRidotta = base * rid;
  const vuoto = (motivo: ImuResult['motivo']): ImuResult => ({ esente: true, motivo, fattispecie: fatt, base, baseRidotta, impostaLorda: 0, detrazione: 0, imposta: 0, acconto: 0, saldo: 0, stato: 0, comune: 0, mesi: [m1, m2], f24: [] });
  if (fatt === 'ap' && !lusso(cat)) return vuoto('ap');
  if (fatt === 'ter' && i.coltivatore) return vuoto('coltivatore');
  if (fatt === 'ter' && i.aliquota < 0) return vuoto('montano');
  const aliq = Math.max(0, i.aliquota);
  const aliqAcc = Math.max(0, i.aliquotaAcconto ?? aliq);
  const anno = imposta(baseRidotta, aliq, quota, m1 + m2, fatt, i);
  const acc = imposta(baseRidotta, aliqAcc, quota, m1, fatt, i);
  const acconto = Math.max(0, acc.netta);
  const saldo = Math.max(0, anno.netta - acconto);
  const f24: RigoF24[] = [];
  const push = (codice: string, rata: RigoF24['rata'], v: number) => { const x = arrotonda(v); if (x > 0) f24.push({ codice, rata, importo: x }); };
  if (fatt === 'D') {
    const accStato = acc.stato, salStato = Math.max(0, anno.stato - acc.stato);
    push(P.f24.D_stato, 'acconto', accStato); push(P.f24.D_comune, 'acconto', acconto - accStato);
    push(P.f24.D_stato, 'saldo', salStato); push(P.f24.D_comune, 'saldo', saldo - salStato);
  } else {
    push(codiceTributo(fatt), 'acconto', acconto); push(codiceTributo(fatt), 'saldo', saldo);
  }
  return {
    esente: anno.netta <= 0, motivo: anno.netta <= 0 ? 'zero' : undefined, fattispecie: fatt, base, baseRidotta,
    impostaLorda: anno.lorda, detrazione: anno.det, imposta: anno.netta, acconto, saldo,
    stato: anno.stato, comune: anno.netta - anno.stato, mesi: [m1, m2], f24,
  };
}

/** Giorni tra due date ISO (b − a). */
export function giorniTra(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export type Fascia = 'nessuna' | 'sprint' | 'breve' | 'intermedio' | 'lungo' | 'oltre';
export interface RavvedimentoResult { giorni: number; fascia: Fascia; sanzionePct: number; sanzione: number; interessi: number | null; totale: number | null }

/**
 * Ravvedimento operoso su un versamento IMU omesso (D.Lgs. 471/1997 art. 13 ; D.Lgs. 472/1997 art. 13,
 * vigenti nel 2026). Sanzione piena 25 %, dimezzata entro 90 giorni e ridotta a 1/15 per giorno entro
 * 15 giorni ; poi ridotta a 1/10 (entro 30 giorni), 1/9 (entro 90), 1/8 (entro il termine della
 * dichiarazione relativa all'anno, 30 giugno dell'anno successivo), 1/7 (oltre).
 * Interessi al tasso legale giorno per giorno : `tassoLegale` in percentuale, null se non indicato.
 */
export function ravvedimento(o: { imposta: number; scadenza: string; pagamento: string; tassoLegale?: number | null; termineDichiarazione?: string }): RavvedimentoResult {
  const R = P.ravvedimento;
  const g = giorniTra(o.scadenza, o.pagamento);
  if (g <= 0 || o.imposta <= 0) return { giorni: Math.max(0, g), fascia: 'nessuna', sanzionePct: 0, sanzione: 0, interessi: 0, totale: Math.max(0, o.imposta) };
  const anno = Number(o.scadenza.slice(0, 4));
  const termine = o.termineDichiarazione ?? `${anno + 1}-06-30`;
  let piena = R.sanzione_base;
  if (g <= 90) piena *= R.riduzione_entro_90_giorni;
  if (g <= R.giorni_quindicesimi) piena *= g / R.giorni_quindicesimi;
  let fascia: Fascia, fr: number;
  if (g <= 14) { fascia = 'sprint'; fr = R.frazioni.entro_30; }
  else if (g <= 30) { fascia = 'breve'; fr = R.frazioni.entro_30; }
  else if (g <= 90) { fascia = 'intermedio'; fr = 1 / 9; }
  else if (o.pagamento <= termine) { fascia = 'lungo'; fr = R.frazioni.entro_dichiarazione; }
  else { fascia = 'oltre'; fr = 1 / 7; }
  const pct = piena * fr;
  const sanzione = o.imposta * pct;
  const interessi = o.tassoLegale == null || isNaN(o.tassoLegale) ? null : o.imposta * (o.tassoLegale / 100) * (g / 365);
  return { giorni: g, fascia, sanzionePct: pct, sanzione, interessi, totale: interessi == null ? null : o.imposta + sanzione + interessi };
}
