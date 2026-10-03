/** Statistiche sulle aliquote dei comuni, calcolate al build (mai nel bundle del browser). */
import { COMUNI, META, ratesOf, type Comune } from './comuni';
import type { Fattispecie } from './engine/imu';

export const imuComuni = COMUNI.filter((c) => c.st === 'P26' || c.st === 'P25' || c.st === 'B');
export const conProspetto = COMUNI.filter((c) => c.st === 'P26' || c.st === 'P25');
export const COUNTS = META.counts;
export const N_IMU = imuComuni.length;

/** Ripartizione dei comuni per aliquota di una fattispecie, dalla più frequente. */
export function distribuzione(f: Fattispecie, pool: Comune[] = conProspetto): Array<{ aliquota: number; n: number }> {
  const m = new Map<number, number>();
  for (const c of pool) { const v = ratesOf(c)[f]; m.set(v, (m.get(v) ?? 0) + 1); }
  return [...m.entries()].map(([aliquota, n]) => ({ aliquota, n })).sort((a, b) => b.n - a.n);
}
export function quanti(f: Fattispecie, pred: (v: number) => boolean, pool: Comune[] = conProspetto) {
  return pool.filter((c) => pred(ratesOf(c)[f])).length;
}
export function media(f: Fattispecie, pool: Comune[] = conProspetto) {
  const v = pool.map((c) => ratesOf(c)[f]).filter((x) => x >= 0);
  return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
}
/** Comuni capoluogo con prospetto, ordinati per aliquota « altri fabbricati » decrescente. */
export const capoluoghi = conProspetto.filter((c) => c.cap).sort((a, b) => ratesOf(b).altri - ratesOf(a).altri || a.name.localeCompare(b.name));
/** Comuni che hanno cambiato aliquota tra il prospetto 2025 e il 2026. */
export function cambiati(f: Fattispecie) {
  return COMUNI.filter((c) => c.st === 'P26' && c.prev && c.rates && c.prev[f] !== c.rates[f]);
}
export const percent = (n: number, tot: number) => (tot ? n / tot : 0);
