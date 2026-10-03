/** Ravvedimento operoso IMU : sanzione ridotta e interessi per un versamento omesso o tardivo. */
import { useEffect, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import { ravvedimento, type Fascia } from '../../lib/engine/imu';
import { formatMoney, formatPercent, type Lang } from '../../lib/format';
import P from '../../data/params-2026.json';

const RV = P.ravvedimento;
const piena = (l: Lang) => formatPercent(RV.sanzione_base, 0, l), meta = (l: Lang) => formatPercent(RV.sanzione_base * RV.riduzione_entro_90_giorni, 1, l);
const SCAD = [P.scadenze.acconto, P.scadenze.saldo, '2025-12-16', '2025-06-16'];
const T = {
  it: { imposta: 'Imposta non versata', scad: 'Rata non pagata', data: 'Data in cui paghi', tasso: 'Tasso di interesse legale annuo', tassoHelp: 'Quello fissato dal decreto MEF per l’anno; lascia vuoto se non lo conosci',
    lab: (d: string) => (d.endsWith('06-16') ? `Acconto ${d.slice(0, 4)} (16 giugno)` : `Saldo ${d.slice(0, 4)} (16 dicembre)`), giorni: 'Giorni di ritardo', sanz: 'Sanzione ridotta', pct: 'Percentuale sull’imposta', int: 'Interessi al tasso legale', tot: 'Totale da versare', noInt: 'inserisci il tasso legale', nessuno: 'Nessun ritardo: versi solo l’imposta.',
    fasce: { nessuna: '', sprint: `Entro 14 giorni: 1/15 al giorno della sanzione del ${meta('it')}, ridotta a 1/10`, breve: `Dal 15° al 30° giorno: 1/10 del ${meta('it')}`, intermedio: `Dal 31° al 90° giorno: 1/9 del ${meta('it')}`, lungo: `Oltre 90 giorni, entro il 30 giugno dell’anno successivo: 1/8 del ${piena('it')}`, oltre: `Oltre il termine della dichiarazione: 1/7 del ${piena('it')}` } as Record<Fascia, string>,
    f24: 'Nell’F24 imposta, sanzione e interessi si sommano sullo stesso codice tributo della rata, barrando la casella «Ravv.».' },
  en: { imposta: 'Unpaid tax', scad: 'Instalment missed', data: 'Date you pay', tasso: 'Annual legal interest rate', tassoHelp: 'The rate set by the Ministry decree for the year; leave empty if you do not know it',
    lab: (d: string) => (d.endsWith('06-16') ? `June ${d.slice(0, 4)} instalment (16 June)` : `December ${d.slice(0, 4)} balance (16 December)`), giorni: 'Days late', sanz: 'Reduced penalty', pct: 'Share of the tax', int: 'Interest at the legal rate', tot: 'Total to pay', noInt: 'enter the legal rate', nessuno: 'Not late: you pay the tax only.',
    fasce: { nessuna: '', sprint: `Within 14 days: 1/15 per day of the ${meta('en')} penalty, reduced to 1/10`, breve: `Days 15 to 30: 1/10 of ${meta('en')}`, intermedio: `Days 31 to 90: 1/9 of ${meta('en')}`, lungo: `After 90 days, by 30 June of the next year: 1/8 of ${piena('en')}`, oltre: `After the return deadline: 1/7 of ${piena('en')}` } as Record<Fascia, string>,
    f24: 'On the F24, tax, penalty and interest are added together on the same tax code as the instalment, ticking the “Ravv.” box.' },
};
export default function RavvedimentoCalc({ lang = 'it' }: { lang?: Lang }) {
  const L = T[lang];
  const [imposta, setImposta] = useState(500);
  const [scad, setScad] = useState(SCAD[0]);
  const [data, setData] = useState(__BUILD_DAY__);
  const [tasso, setTasso] = useState(0);
  useEffect(() => { setData(new Date().toISOString().slice(0, 10)); }, []);
  const x = ravvedimento({ imposta, scadenza: scad, pagamento: data || scad, tassoLegale: tasso > 0 ? tasso : null });
  const $ = (v: number) => formatMoney(v, 2, lang);
  return (
    <div data-chrome className="not-prose rounded-xl border border-navy-200 bg-white p-4 sm:p-6">
      <form className="grid gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <NumberField id="rv-imposta" label={L.imposta} value={imposta} onChange={setImposta} unit="€" max={10000000} decimals={2} lang={lang} />
        <SelectField id="rv-scad" label={L.scad} value={scad} onChange={setScad} options={SCAD.map((d) => ({ value: d, label: L.lab(d) }))} />
        <div className="grid grid-rows-subgrid row-span-3 content-start gap-y-0">
          <label htmlFor="rv-data" className="mb-1 block text-sm font-medium text-navy-700">{L.data}</label>
          <input id="rv-data" type="date" value={data} min={scad} onChange={(e) => setData(e.target.value)} className="h-12 w-full rounded-lg border border-navy-300 bg-white px-4 text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
        </div>
        <NumberField id="rv-tasso" label={L.tasso} value={tasso} onChange={setTasso} unit="%" max={20} decimals={2} help={L.tassoHelp} lang={lang} />
      </form>
      <div aria-live="polite" className="mt-6 rounded-xl bg-accent-50 p-5">
        {x.fascia === 'nessuna' ? <p className="text-navy-800">{L.nessuno}</p> : <>
          <p className="text-sm font-medium text-navy-600">{L.sanz}</p>
          <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900">{$(x.sanzione)}</p>
          <p className="mt-2 text-sm text-navy-700">{L.fasce[x.fascia]}</p>
          <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-200">
            <tr><td className="py-2 pr-3 text-navy-600">{L.giorni}</td><td className="tabular-nums py-2 text-right text-navy-900">{x.giorni}</td></tr>
            <tr><td className="py-2 pr-3 text-navy-600">{L.pct}</td><td className="tabular-nums py-2 text-right text-navy-900">{formatPercent(x.sanzionePct, 3, lang)}</td></tr>
            <tr><td className="py-2 pr-3 text-navy-600">{L.int}</td><td className="tabular-nums py-2 text-right text-navy-900">{x.interessi == null ? L.noInt : $(x.interessi)}</td></tr>
            <tr><td className="py-2 pr-3 font-medium text-navy-800">{L.tot}</td><td className="tabular-nums py-2 text-right font-semibold text-navy-900">{x.totale == null ? `${$(imposta + x.sanzione)} + ${lang === 'en' ? 'interest' : 'interessi'}` : $(x.totale)}</td></tr>
          </tbody></table>
          <p className="mt-3 text-xs text-navy-600">{L.f24}</p>
        </>}
      </div>
    </div>
  );
}
