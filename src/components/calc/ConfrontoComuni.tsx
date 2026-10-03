/** Stesso immobile, due comuni : l'IMU dell'uno e dell'altro con le aliquote dei prospetti. */
import { useEffect, useState } from 'react';
import ComunePicker from './ComunePicker';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import { comune as byCode, ratesOf, isImu, type Comune } from '../../lib/comuni';
import { calcolaImu, fattispecie, type Categoria } from '../../lib/engine/imu';
import { formatAliquota, formatMoney, type Lang } from '../../lib/format';
import { readParams, str, num, updateURL } from '../../lib/url-state';

const CATS: Array<[Categoria, string, string]> = [['A2', 'Abitazione A/2 (seconda casa)', 'Home A/2 (second home)'], ['A3', 'Abitazione A/3 (seconda casa)', 'Home A/3 (second home)'], ['A7', 'Villino A/7 (seconda casa)', 'Detached house A/7 (second home)'], ['C1', 'Negozio C/1', 'Shop C/1'], ['A10', 'Ufficio A/10', 'Office A/10'], ['C6', 'Box C/6', 'Garage C/6'], ['D', 'Capannone gruppo D', 'Group D building']];
const T = {
  it: { a: 'Primo comune', b: 'Secondo comune', cat: 'Immobile', r: 'Rendita catastale', diff: 'Differenza annua', non: 'non applica l’IMU', cheaper: (n: string, v: string) => `A ${n} paghi ${v} in meno ogni anno.`, same: 'Stessa IMU nei due comuni.' },
  en: { a: 'First comune', b: 'Second comune', cat: 'Property', r: 'Cadastral income', diff: 'Yearly difference', non: 'does not levy IMU', cheaper: (n: string, v: string) => `In ${n} you pay ${v} less every year.`, same: 'Same IMU in both comuni.' },
};
export default function ConfrontoComuni({ lang = 'it', a = 'H501', b = 'F205' }: { lang?: Lang; a?: string; b?: string }) {
  const L = T[lang];
  const [ca, setA] = useState(a); const [cb, setB] = useState(b); const [cat, setCat] = useState<Categoria>('A2'); const [r, setR] = useState(800);
  useEffect(() => { const u = readParams(window.location.search); const x = str(u, 'a', a), y = str(u, 'b', b); if (byCode(x)) setA(x); if (byCode(y)) setB(y); setR(num(u, 'r', 800)); }, []);
  useEffect(() => { updateURL({ a: ca, b: cb, r }); }, [ca, cb, r]);
  const A: Comune = byCode(ca)!, B: Comune = byCode(cb)!;
  const f = fattispecie('fabbricato', cat, 'altro');
  const imu = (c: Comune) => (isImu(c) ? calcolaImu({ categoria: cat, rendita: r, aliquota: ratesOf(c)[f] }) : null);
  const xa = imu(A), xb = imu(B);
  const $ = (v: number) => formatMoney(v, 0, lang);
  const card = (c: Comune, x: ReturnType<typeof imu>) => (
    <div className="rounded-lg bg-navy-50 p-4"><p className="text-sm font-medium text-navy-600">{c.name} ({c.prov})</p>
      {x ? <><p className="tabular-nums text-3xl font-bold text-navy-900">{$(x.imposta)}</p><p className="mt-1 text-sm text-navy-600">{formatAliquota(ratesOf(c)[f], lang)} · {c.st === 'P26' ? '2026' : c.st === 'P25' ? '2025' : 'base'}</p></> : <p className="mt-1 text-sm text-navy-700">{L.non}</p>}
    </div>
  );
  const d = xa && xb ? xa.imposta - xb.imposta : 0;
  return (
    <div data-chrome className="not-prose rounded-xl border border-navy-200 bg-white p-4 sm:p-6">
      <form className="grid gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <ComunePicker id="cf-a" label={L.a} value={A} onPick={(x) => setA(x.code)} lang={lang} />
        <ComunePicker id="cf-b" label={L.b} value={B} onPick={(x) => setB(x.code)} lang={lang} />
        <SelectField id="cf-cat" label={L.cat} value={cat} onChange={(v) => setCat(v as Categoria)} options={CATS.map(([k, it, en]) => ({ value: k, label: lang === 'en' ? en : it }))} />
        <NumberField id="cf-r" label={L.r} value={r} onChange={setR} unit="€" max={1000000} decimals={2} lang={lang} />
      </form>
      <div aria-live="polite" className="mt-6 grid gap-4 sm:grid-cols-2">{card(A, xa)}{card(B, xb)}</div>
      {xa && xb && <p className="mt-4 rounded-lg bg-accent-50 p-4 text-navy-900"><span className="text-sm text-navy-600">{L.diff}</span><br /><span className="tabular-nums text-2xl font-bold">{$(Math.abs(d))}</span> <span className="text-sm">{d === 0 ? L.same : L.cheaper(d > 0 ? B.name : A.name, $(Math.abs(d)))}</span></p>}
    </div>
  );
}
