/** Aliquote IMU dei comuni (prospetti del Dipartimento delle Finanze, scripts/it/build-data.py). */
import D from '../data/comuni.json';
import { RATES_BASE, type Fattispecie, type Rates } from './engine/imu';

export type Stato = 'P26' | 'P25' | 'B' | 'ILIA' | 'IMIS' | 'IMI';
export interface Comune {
  code: string; name: string; prov: string; reg: string; cap: boolean; st: Stato;
  rates: Rates | null; pd: boolean; assim: boolean; fus: boolean; delibera: string | null; data: string | null; id: number | null;
  prev: Rates | null;
}
type Row = (string | number | null | number[])[];
const KEYS: Fattispecie[] = ['ap', 'rur', 'D', 'ter', 'aree', 'altri'];
const toRates = (a: (number | null)[]): Rates => Object.fromEntries(KEYS.map((k, i) => [k, a[i] ?? RATES_BASE[k]])) as Rates;

export const META = D.meta as { retrieved_at: string; counts: Record<Stato, number>; total: number; prospetti_letti: number };
export const REGIONI = D.regioni as string[];

function decode(r: Row): Comune {
  const [code, name, prov, reg, cap, st, ap, rur, Dd, ter, pd, aree, altri, assim, fus, delibera, data, id, prev] = r as [string, string, string, number, number, Stato, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, string | null, string | null, number | null, number[] | null];
  const has = st === 'P26' || st === 'P25';
  return {
    code, name, prov, reg: REGIONI[reg], cap: cap === 1, st,
    rates: has ? toRates([ap, rur, Dd, ter, aree, altri]) : st === 'B' ? { ...RATES_BASE } : null,
    pd: pd === 1, assim: assim === 1, fus: fus === 1, delibera, data, id,
    prev: prev ? toRates(prev) : null,
  };
}

export const COMUNI: Comune[] = (D.c as Row[]).map(decode);
const BY_CODE = new Map(COMUNI.map((c) => [c.code, c]));
export const comune = (code: string) => BY_CODE.get(code);
/** Aliquote 2026 applicabili (prospetto 2026, oppure 2025 reconduit, oppure aliquote di base). */
export const ratesOf = (c: Comune): Rates => c.rates ?? { ...RATES_BASE };
/** Aliquote dell'acconto di giugno : quelle dell'anno precedente (comma 762). */
export const ratesAcconto = (c: Comune): Rates => c.prev ?? ratesOf(c);
export const isImu = (c: Comune) => c.st === 'P26' || c.st === 'P25' || c.st === 'B';
export const regioneSlug = (reg: string) => reg.toLowerCase().split('/')[0].replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

/** Ricerca per nome (inizio parola, senza accenti). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function cerca(q: string, max = 12): Comune[] {
  const f = fold(q.trim());
  if (f.length < 2) return [];
  const starts: Comune[] = [], inside: Comune[] = [];
  for (const c of COMUNI) {
    const n = fold(c.name);
    if (n.startsWith(f)) starts.push(c); else if (n.includes(f)) inside.push(c);
  }
  starts.sort((a, b) => Number(b.cap) - Number(a.cap) || a.name.length - b.name.length);
  return [...starts, ...inside].slice(0, max);
}

/** Aliquote differenziate e esenzioni del prospetto, caricate per regione su richiesta. */
export type Differenziata = [Fattispecie, number, string];
const LOADERS = import.meta.glob<{ default: Record<string, { d: Differenziata[]; e: string }> }>('../data/differenziate/*.json');
export async function differenziate(c: Comune): Promise<{ d: Differenziata[]; e: string }> {
  const l = LOADERS[`../data/differenziate/${regioneSlug(c.reg)}.json`];
  if (!l) return { d: [], e: '' };
  const m = await l();
  return m.default[c.code] ?? { d: [], e: '' };
}
