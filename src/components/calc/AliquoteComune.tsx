/** Toutes les aliquote IMU d'un comune : prospetto en vigueur, année précédente, différenciées, exemptions. */
import { useEffect, useState } from 'react';
import ComunePicker from './ComunePicker';
import NumberField from '../ui/NumberField';
import { comune as byCode, ratesOf, ratesAcconto, isImu, differenziate, type Comune, type Differenziata } from '../../lib/comuni';
import { calcolaImu, type Fattispecie } from '../../lib/engine/imu';
import { formatAliquota, formatMoney, type Lang } from '../../lib/format';
import { readParams, str, updateURL } from '../../lib/url-state';

const ROWS: Array<[Fattispecie, string, string]> = [
  ['altri', 'Altri fabbricati (seconde case, immobili affittati, negozi, uffici)', 'Other buildings (second homes, rentals, shops, offices)'],
  ['ap', 'Abitazione principale A/1, A/8, A/9 e pertinenze', 'Luxury main home A/1, A/8, A/9 and pertinenze'],
  ['D', 'Fabbricati del gruppo D (escluso D/10)', 'Group D buildings (except D/10)'],
  ['aree', 'Aree fabbricabili', 'Building land'],
  ['ter', 'Terreni agricoli', 'Agricultural land'],
  ['rur', 'Fabbricati rurali strumentali (incluso D/10)', 'Rural farm buildings (incl. D/10)'],
];
const T = {
  it: { comune: 'Comune', fatt: 'Fattispecie', a26: 'Aliquota 2026', acc: 'Acconto (anno prec.)', esente: 'Esenti', assim: 'Casa dell’anziano o disabile ricoverato assimilata all’abitazione principale', si: 'sì', no: 'no', diff: 'Aliquote differenziate del prospetto', es: 'Esenzioni indicate dal comune', none: 'Il prospetto non prevede aliquote differenziate.', rendita: 'Rendita di una seconda casa A/2', imu: 'IMU annua a questa aliquota', p26: 'Prospetto 2026', p25: 'Prospetto 2025 (2026 non ancora pubblicato)', b: 'Nessun prospetto conforme: aliquote di base', del: 'delibera n.', of: 'del', mef: 'Verifica sul sito del Dipartimento delle Finanze', non: 'Questo comune non applica l’IMU.' },
  en: { comune: 'Comune', fatt: 'Category', a26: '2026 rate', acc: 'June (prior year)', esente: 'Exempt', assim: 'Home of an elderly or disabled person in care treated as a main home', si: 'yes', no: 'no', diff: 'Targeted rates in the schedule', es: 'Exemptions set by the comune', none: 'The schedule has no targeted rates.', rendita: 'Rendita of an A/2 second home', imu: 'Yearly IMU at this rate', p26: '2026 schedule', p25: '2025 schedule (2026 not yet published)', b: 'No valid schedule: base rates', del: 'resolution no.', of: 'of', mef: 'Check on the Department of Finance website', non: 'This comune does not levy IMU.' },
};
export default function AliquoteComune({ lang = 'it', initialCode = 'H501' }: { lang?: Lang; initialCode?: string }) {
  const L = T[lang];
  const [code, setCode] = useState(initialCode);
  const [r, setR] = useState(800);
  const [diff, setDiff] = useState<{ d: Differenziata[]; e: string }>({ d: [], e: '' });
  const c: Comune = byCode(code) ?? byCode('H501')!;
  useEffect(() => { const u = readParams(window.location.search); const cc = str(u, 'c', initialCode); if (byCode(cc)) setCode(cc); }, []);
  useEffect(() => { let ok = true; differenziate(c).then((x) => ok && setDiff(x)); updateURL({ c: code }); return () => { ok = false; }; }, [code]);
  const rates = ratesOf(c), prev = ratesAcconto(c);
  const al = (v: number) => (v < 0 ? L.esente : formatAliquota(v, lang));
  const st = c.st === 'P26' ? L.p26 : c.st === 'P25' ? L.p25 : c.st === 'B' ? L.b : L.non;
  return (
    <div data-chrome className="not-prose rounded-xl border border-navy-200 bg-white p-4 sm:p-6">
      <form className="grid gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <ComunePicker id="al-comune" label={L.comune} value={c} onPick={(x) => setCode(x.code)} lang={lang} />
        <NumberField id="al-rendita" label={L.rendita} value={r} onChange={setR} unit="€" max={1000000} decimals={2} lang={lang} />
      </form>
      <p className="mt-4 text-sm text-navy-700" role="status"><strong>{st}</strong>{c.delibera ? ` · ${L.del} ${c.delibera} ${L.of} ${c.data}` : ''}</p>
      {isImu(c) && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-navy-300 text-left text-navy-600"><th scope="col" className="py-2 pr-3 font-medium">{L.fatt}</th><th scope="col" className="py-2 pr-3 text-right font-medium">{L.a26}</th><th scope="col" className="py-2 text-right font-medium">{L.acc}</th></tr></thead>
            <tbody>{ROWS.map(([k, it, en]) => <tr key={k} className="border-b border-navy-100"><td className="py-2 pr-3 text-navy-800">{lang === 'en' ? en : it}</td><td className="tabular-nums py-2 pr-3 text-right font-semibold text-navy-900">{al(rates[k])}</td><td className="tabular-nums py-2 text-right text-navy-700">{al(prev[k])}</td></tr>)}</tbody>
          </table>
          <p className="mt-3 text-sm text-navy-700">{L.assim}: <strong>{c.assim ? L.si : L.no}</strong></p>
          <div aria-live="polite" className="mt-4 rounded-lg bg-accent-50 p-4"><p className="text-sm text-navy-600">{L.imu} ({formatAliquota(rates.altri, lang)})</p><p className="tabular-nums text-3xl font-bold text-navy-900">{formatMoney(calcolaImu({ categoria: 'A2', rendita: r, aliquota: rates.altri }).imposta, 0, lang)}</p></div>
          <p className="mt-5 text-sm font-semibold text-navy-800">{L.diff}</p>
          {diff.d.length === 0 ? <p className="mt-1 text-sm text-navy-600">{L.none}</p> : (
            <ul className="mt-2 divide-y divide-navy-100 rounded-lg border border-navy-200">{diff.d.map((d, i) => <li key={i} className="flex justify-between gap-3 px-3 py-2 text-sm"><span className="text-navy-700">{d[2]}</span><span className="tabular-nums shrink-0 font-semibold text-navy-900">{formatAliquota(d[1], lang)}</span></li>)}</ul>
          )}
          {diff.e && <p className="mt-3 text-xs text-navy-600"><strong>{L.es}:</strong> {diff.e}</p>}
        </div>
      )}
      <p className="mt-4 text-xs text-navy-500"><a className="text-accent-700 hover:underline" href="https://www.finanze.gov.it/it/fiscalita/fiscalita-regionale-e-locale/Imposta-municipale-propria-IMU/Regolamenti-e-aliquote-ricerca/" target="_blank" rel="nofollow noopener">{L.mef}</a></p>
    </div>
  );
}
