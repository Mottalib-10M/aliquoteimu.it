/** Aliquote differenziate lette al build (pages de ville, guides) : jamais dans le bundle du navigateur. */
import { comune, regioneSlug, COMUNI, type Differenziata } from './comuni';
import type { Fattispecie } from './engine/imu';
const files = import.meta.glob<{ default: Record<string, { d: Differenziata[]; e: string }> }>('../data/differenziate/*.json', { eager: true });
export function diffOf(code: string): { d: Differenziata[]; e: string } {
  const c = comune(code); if (!c) return { d: [], e: '' };
  return files[`../data/differenziate/${regioneSlug(c.reg)}.json`]?.default[code] ?? { d: [], e: '' };
}
/** Première aliquota différenciée d'un comune dont le texte correspond au motif (et à la fattispecie). */
export function diffRate(code: string, re: RegExp, f?: Fattispecie): number | undefined {
  return diffOf(code).d.find((x) => re.test(x[2]) && (!f || x[0] === f))?.[1];
}
/** Nombre de comuni dont le prospetto contient une aliquota différenciée correspondant au motif. */
export function quantiConDiff(re: RegExp, f?: Fattispecie): number {
  let n = 0;
  for (const c of COMUNI) if (diffOf(c.code).d.some((x) => re.test(x[2]) && (!f || x[0] === f))) n++;
  return n;
}
