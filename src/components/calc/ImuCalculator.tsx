/**
 * Calcolatore IMU 2026 con le aliquote del comune (prospetti MEF). Calcolo nel browser, nessun dato inviato.
 * Idratazione (RECETTE §17.5) : primo rendering con i valori di default del build ; i parametri del
 * link condiviso e le aliquote differenziate (caricate per regione) arrivano in useEffect.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import { calcolaImu, fattispecie, lusso, type Categoria, type Fattispecie, type RiduzioneBase, type Tipo, type Uso } from '../../lib/engine/imu';
import { comune as byCode, cerca, ratesOf, ratesAcconto, isImu, differenziate, type Comune, type Differenziata } from '../../lib/comuni';
import { formatMoney, formatAliquota, type Lang } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

export type ProfiloId = 'seconda' | 'ap' | 'locato' | 'concordato' | 'comodato' | 'negozio' | 'ufficio' | 'box' | 'laboratorio' | 'D' | 'rurale' | 'terreno' | 'area';
interface Profilo { id: ProfiloId; tipo: Tipo; cats: Categoria[]; uso: Uso; concordato?: boolean; riduzione?: RiduzioneBase; it: string; en: string }
const ABIT: Categoria[] = ['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A11', 'A1', 'A8', 'A9'];
export const PROFILI: Profilo[] = [
  { id: 'seconda', tipo: 'fabbricato', cats: ABIT, uso: 'altro', it: 'Seconda casa o abitazione a disposizione', en: 'Second home or empty home' },
  { id: 'ap', tipo: 'fabbricato', cats: ABIT, uso: 'ap', it: 'Abitazione principale', en: 'Main home (where you are resident)' },
  { id: 'locato', tipo: 'fabbricato', cats: ABIT, uso: 'altro', it: 'Abitazione affittata a canone libero', en: 'Home let at market rent' },
  { id: 'concordato', tipo: 'fabbricato', cats: ABIT, uso: 'altro', concordato: true, it: 'Abitazione affittata a canone concordato', en: 'Home let at agreed rent (concordato)' },
  { id: 'comodato', tipo: 'fabbricato', cats: ABIT.filter((c) => !lusso(c)), uso: 'altro', riduzione: 'comodato', it: 'Abitazione in comodato a figli o genitori', en: 'Home lent free to a child or parent' },
  { id: 'negozio', tipo: 'fabbricato', cats: ['C1'], uso: 'altro', it: 'Negozio o bottega (C/1)', en: 'Shop (C/1)' },
  { id: 'ufficio', tipo: 'fabbricato', cats: ['A10'], uso: 'altro', it: 'Ufficio o studio privato (A/10)', en: 'Office (A/10)' },
  { id: 'box', tipo: 'fabbricato', cats: ['C6', 'C2', 'C7'], uso: 'altro', it: 'Box, cantina o posto auto non pertinenziale', en: 'Garage, cellar or parking space (not a pertinenza)' },
  { id: 'laboratorio', tipo: 'fabbricato', cats: ['C3', 'C4', 'C5', 'B'], uso: 'altro', it: 'Laboratorio, palestra, gruppo B', en: 'Workshop, sports premises, group B' },
  { id: 'D', tipo: 'fabbricato', cats: ['D', 'D5'], uso: 'altro', it: 'Capannone, albergo, gruppo D', en: 'Warehouse, hotel, group D' },
  { id: 'rurale', tipo: 'fabbricato', cats: ['D10', 'C2', 'C6', 'A6'], uso: 'rurale', it: 'Fabbricato rurale strumentale', en: 'Rural farm building (strumentale)' },
  { id: 'terreno', tipo: 'terreno', cats: [], uso: 'altro', it: 'Terreno agricolo', en: 'Agricultural land' },
  { id: 'area', tipo: 'area', cats: [], uso: 'altro', it: 'Area fabbricabile', en: 'Building land' },
];
const CAT_LABEL: Record<Categoria, string> = {
  A1: 'A/1 signorile', A2: 'A/2 civile', A3: 'A/3 economica', A4: 'A/4 popolare', A5: 'A/5 ultrapopolare', A6: 'A/6 rurale', A7: 'A/7 villino', A8: 'A/8 villa', A9: 'A/9 castello, palazzo', A10: 'A/10 ufficio', A11: 'A/11 alloggio tipico',
  B: 'B (collegi, uffici pubblici…)', C1: 'C/1 negozio', C2: 'C/2 magazzino, cantina', C3: 'C/3 laboratorio', C4: 'C/4 locale sportivo', C5: 'C/5 stabilimento balneare', C6: 'C/6 box, posto auto', C7: 'C/7 tettoia',
  D: 'D/1-D/9 (escluso D/5)', D5: 'D/5 banca, assicurazione', D10: 'D/10 rurale strumentale',
};

const T = {
  it: {
    comune: 'Comune', cerca: 'Scrivi il nome del comune', tipo: 'Tipo di immobile', cat: 'Categoria catastale', rendita: 'Rendita catastale', dominicale: 'Reddito dominicale', valore: 'Valore venale dell’area',
    renditaHelp: 'Dalla visura catastale, senza rivalutazione', dominicaleHelp: 'Dalla visura dei terreni, non rivalutato', valoreHelp: 'Valore di mercato al 1° gennaio; molti comuni pubblicano valori di riferimento',
    aliquota: 'Aliquota IMU 2026', aliquotaHelp: 'Dal prospetto del comune; puoi modificarla', avanzate: 'Opzioni avanzate', quota: 'Quota di possesso', mesi: 'Mesi di possesso nel 2026', periodo: 'Periodo',
    daGennaio: 'Da gennaio', finoDicembre: 'Fino a dicembre', riduzione: 'Riduzione della base', nessuna: 'Nessuna', storico: 'Immobile storico (50 %)', inagibile: 'Inagibile o inabitabile (50 %)',
    estero: 'Pensionato residente all’estero (metà imposta)', coltivatore: 'Coltivatore diretto o IAP (terreno esente)', no: 'No', si: 'Sì', pertinenze: 'Rendita delle pertinenze', pertinenzeHelp: 'Una per categoria C/2, C/6, C/7',
    acconto: 'Aliquota per l’acconto (anno precedente)',
    annua: 'IMU dovuta per il 2026', esente: 'Nessuna IMU dovuta', base: 'Base imponibile', aliq: 'Aliquota applicata', detr: 'Detrazione abitazione principale', rataG: 'Acconto entro il 16 giugno 2026', rataD: 'Saldo entro il 16 dicembre 2026',
    stato: 'di cui allo Stato (0,76 %)', comuneQ: 'di cui al comune', f24: 'Righe del modello F24 (sezione IMU e altri tributi locali)', codice: 'Codice tributo', ente: 'Codice ente', rata: 'Rata', importo: 'Importo',
    accontoL: 'Acconto', saldoL: 'Saldo', copia: 'Copia il risultato', link: 'Copia il link', stampa: 'Stampa', copiato: 'Copiato', metodo: 'Come calcoliamo',
    diff: 'Altre aliquote previste dal prospetto di', applica: 'Usa', esenzioni: 'Esenzioni indicate dal comune',
    motivoAp: 'L’abitazione principale non di lusso (A/2-A/7, A/11) e le sue pertinenze sono esenti (art. 1, comma 740, L. 160/2019).',
    motivoCol: 'I terreni posseduti e condotti da coltivatori diretti e IAP iscritti alla previdenza agricola sono esenti (comma 758, lett. a).',
    motivoMont: 'Il prospetto del comune indica i terreni agricoli come esenti (aree montane o di collina, comma 758, lett. d).',
    motivoZero: 'Con l’aliquota indicata l’imposta è nulla.', pd: 'Comune parzialmente delimitato: i terreni sono esenti solo nei fogli di mappa indicati dalla Circolare MEF n. 9/1993.',
    p26: (d: string, n: string, prev: boolean) => `Prospetto 2026 pubblicato dal comune (delibera n. ${n} del ${d}). ${prev ? 'Acconto calcolato con le aliquote 2025, saldo con quelle 2026, come prevede il comma 762.' : 'Acconto e saldo calcolati con le aliquote 2026.'}`,
    p25: (d: string, n: string) => `Il comune non ha ancora pubblicato il prospetto 2026: valgono le aliquote 2025 (delibera n. ${n} del ${d}). Se non lo pubblica entro il 28 ottobre 2026, restano valide anche per il saldo (comma 767).`,
    b: 'Nessun prospetto conforme pubblicato: si applicano le aliquote di base della legge (commi 748-755).',
    ILIA: 'In Friuli Venezia Giulia l’IMU non si applica: dal 2023 c’è l’ILIA (legge regionale 17/2022), con aliquote proprie. Questo calcolatore non la calcola.',
    IMIS: 'In provincia di Trento l’IMU non si applica: c’è l’IMIS (legge provinciale 14/2014). Questo calcolatore non la calcola.',
    IMI: 'In provincia di Bolzano l’IMU non si applica: c’è l’IMI (legge provinciale 3/2014). Questo calcolatore non la calcola.',
    noRes: 'Nessun comune trovato', copiaTxt: (c: string, v: string, a: string, s: string) => `IMU 2026 ${c}: ${v} (acconto ${a}, saldo ${s})`,
    groups: { ap: 'Abitazione principale', rur: 'Rurali', D: 'Gruppo D', ter: 'Terreni', aree: 'Aree fabbricabili', altri: 'Altri fabbricati' },
  },
  en: {
    comune: 'Comune (municipality)', cerca: 'Type the comune name', tipo: 'Property type', cat: 'Cadastral category', rendita: 'Cadastral income (rendita)', dominicale: 'Land income (reddito dominicale)', valore: 'Market value of the plot',
    renditaHelp: 'From the cadastral record (visura), not revalued', dominicaleHelp: 'From the land registry record, not revalued', valoreHelp: 'Market value on 1 January; many comuni publish reference values',
    aliquota: 'IMU rate 2026', aliquotaHelp: 'From the comune’s schedule; you can change it', avanzate: 'Advanced options', quota: 'Ownership share', mesi: 'Months owned in 2026', periodo: 'Period',
    daGennaio: 'From January', finoDicembre: 'To December', riduzione: 'Reduction of the taxable value', nessuna: 'None', storico: 'Listed building (50 %)', inagibile: 'Unfit for use (50 %)',
    estero: 'Pensioner living abroad (half the tax)', coltivatore: 'Registered farmer (land exempt)', no: 'No', si: 'Yes', pertinenze: 'Cadastral income of pertinenze', pertinenzeHelp: 'One per category C/2, C/6, C/7',
    acconto: 'Rate for the June payment (previous year)',
    annua: 'IMU due for 2026', esente: 'No IMU due', base: 'Taxable value', aliq: 'Rate applied', detr: 'Main home deduction', rataG: 'First instalment by 16 June 2026', rataD: 'Balance by 16 December 2026',
    stato: 'of which to the State (0.76 %)', comuneQ: 'of which to the comune', f24: 'F24 form lines (IMU and other local taxes section)', codice: 'Tax code', ente: 'Comune code', rata: 'Instalment', importo: 'Amount',
    accontoL: 'June', saldoL: 'December', copia: 'Copy the result', link: 'Copy the link', stampa: 'Print', copiato: 'Copied', metodo: 'How we calculate',
    diff: 'Other rates in the schedule of', applica: 'Use', esenzioni: 'Exemptions set by the comune',
    motivoAp: 'A main home outside the luxury categories (A/2-A/7, A/11) and its pertinenze are exempt (art. 1, paragraph 740, Law 160/2019).',
    motivoCol: 'Land owned and farmed by registered farmers (coltivatori diretti, IAP) is exempt (paragraph 758 a).',
    motivoMont: 'The comune’s schedule lists agricultural land as exempt (mountain or hill areas, paragraph 758 d).',
    motivoZero: 'At the rate entered the tax is zero.', pd: 'Partly delimited comune: land is exempt only in the map sheets listed in MEF Circular 9/1993.',
    p26: (d: string, n: string, prev: boolean) => `2026 schedule published by the comune (resolution no. ${n} of ${d}). ${prev ? 'The June payment uses the 2025 rates and the December balance the 2026 rates, as paragraph 762 requires.' : 'Both instalments use the 2026 rates.'}`,
    p25: (d: string, n: string) => `The comune has not yet published its 2026 schedule, so the 2025 rates apply (resolution no. ${n} of ${d}). If nothing is published by 28 October 2026, they also apply to the December balance (paragraph 767).`,
    b: 'No valid schedule published: the statutory base rates apply (paragraphs 748-755).',
    ILIA: 'IMU does not apply in Friuli Venezia Giulia: since 2023 the region has its own tax, ILIA (regional law 17/2022). This calculator does not compute it.',
    IMIS: 'IMU does not apply in the province of Trento: it has IMIS (provincial law 14/2014). This calculator does not compute it.',
    IMI: 'IMU does not apply in the province of Bolzano: it has IMI (provincial law 3/2014). This calculator does not compute it.',
    noRes: 'No comune found', copiaTxt: (c: string, v: string, a: string, s: string) => `IMU 2026 ${c}: ${v} (June ${a}, December ${s})`,
    groups: { ap: 'Main home', rur: 'Rural', D: 'Group D', ter: 'Land', aree: 'Building land', altri: 'Other buildings' },
  },
};

interface Props { lang?: Lang; initialCode?: string; initialProfilo?: ProfiloId; initialRendita?: number; methodHref?: string; compact?: boolean }

export default function ImuCalculator({ lang = 'it', initialCode = 'H501', initialProfilo = 'seconda', initialRendita = 800, methodHref, compact = false }: Props) {
  const L = T[lang];
  const $ = (v: number) => formatMoney(v, 0, lang);
  const [code, setCode] = useState(initialCode);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [profilo, setProfilo] = useState<ProfiloId>(initialProfilo);
  const P = PROFILI.find((p) => p.id === profilo)!;
  const [cat, setCat] = useState<Categoria>(P.cats[0] ?? 'A2');
  const [rendita, setRendita] = useState(initialRendita);
  const [aliqOv, setAliqOv] = useState<number | null>(null);
  const [accOv, setAccOv] = useState<number | null>(null);
  const [quota, setQuota] = useState(100);
  const [mesi, setMesi] = useState(12);
  const [periodo, setPeriodo] = useState<'inizio' | 'fine'>('fine');
  const [rid, setRid] = useState<RiduzioneBase>('nessuna');
  const [estero, setEstero] = useState(false);
  const [colt, setColt] = useState(false);
  const [pert, setPert] = useState(0);
  const [diff, setDiff] = useState<{ d: Differenziata[]; e: string }>({ d: [], e: '' });
  const [copied, setCopied] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const c: Comune = byCode(code) ?? byCode('H501')!;
  const fatt: Fattispecie = fattispecie(P.tipo, cat, P.uso);
  const rates = ratesOf(c); const prev = ratesAcconto(c);
  const aliquota = aliqOv ?? rates[fatt];
  const aliqAcc = accOv ?? (aliqOv != null ? aliqOv : prev[fatt]);

  // Parametri del link condiviso : solo dopo il primo rendering.
  useEffect(() => {
    const u = readParams(window.location.search);
    const cc = str(u, 'c', initialCode); if (byCode(cc)) setCode(cc);
    const pp = str(u, 't', initialProfilo) as ProfiloId; const pr = PROFILI.find((x) => x.id === pp);
    if (pr) { setProfilo(pp); const ca = str(u, 'k', pr.cats[0] ?? 'A2') as Categoria; setCat(pr.cats.includes(ca) ? ca : (pr.cats[0] ?? 'A2')); }
    setRendita(num(u, 'r', initialRendita)); setQuota(num(u, 'q', 100)); setMesi(num(u, 'm', 12));
    if (u.get('a')) setAliqOv(num(u, 'a', 0));
  }, []);
  useEffect(() => { let alive = true; differenziate(c).then((x) => { if (alive) setDiff(x); }); return () => { alive = false; }; }, [code]);
  useEffect(() => { updateURL({ c: code, t: profilo, k: P.cats.length ? cat : undefined, r: rendita, q: quota !== 100 ? quota : undefined, m: mesi !== 12 ? mesi : undefined, a: aliqOv ?? undefined }); }, [code, profilo, cat, rendita, quota, mesi, aliqOv]);
  useEffect(() => { const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  const res = useMemo(() => calcolaImu({
    tipo: P.tipo, categoria: P.tipo === 'fabbricato' ? cat : undefined, rendita, renditaPertinenze: P.uso === 'ap' ? pert : 0, uso: P.uso,
    aliquota, aliquotaAcconto: aliqAcc, quota, mesi, periodo, riduzione: P.riduzione ?? rid, canoneConcordato: !!P.concordato, pensionatoEstero: estero, coltivatore: colt,
  }), [P, cat, rendita, pert, aliquota, aliqAcc, quota, mesi, periodo, rid, estero, colt]);

  const results = open ? cerca(q) : [];
  const pick = (x: Comune) => { setCode(x.code); setQ(''); setOpen(false); setAliqOv(null); setAccOv(null); };
  const changeProfilo = (v: string) => { const pr = PROFILI.find((x) => x.id === v)!; setProfilo(pr.id); setCat(pr.cats[0] ?? 'A2'); setAliqOv(null); setAccOv(null); };
  const statusText = c.st === 'P26' ? L.p26(c.data ?? '', c.delibera ?? '', !!c.prev) : c.st === 'P25' ? L.p25(c.data ?? '', c.delibera ?? '') : c.st === 'B' ? L.b : L[c.st];
  const imu = isImu(c);
  const motivo = res.motivo === 'ap' ? L.motivoAp : res.motivo === 'coltivatore' ? L.motivoCol : res.motivo === 'montano' ? L.motivoMont : res.motivo === 'zero' ? L.motivoZero : '';
  const diffRows = diff.d.filter((d) => d[0] === fatt || (fatt === 'altri' && d[0] === 'ap' && P.uso !== 'ap'));
  const renditaLabel = P.tipo === 'terreno' ? L.dominicale : P.tipo === 'area' ? L.valore : L.rendita;
  const renditaHelp = P.tipo === 'terreno' ? L.dominicaleHelp : P.tipo === 'area' ? L.valoreHelp : L.renditaHelp;
  const copy = async (what: 'r' | 'l') => {
    try { await navigator.clipboard.writeText(what === 'l' ? window.location.href : L.copiaTxt(c.name, $(res.imposta), $(res.acconto), $(res.saldo))); setCopied(what); setTimeout(() => setCopied(''), 1500); } catch { /* presse-papiers indisponible */ }
  };

  return (
    <div data-chrome className="not-prose rounded-xl border border-navy-200 bg-white p-4 sm:p-6">
      <form className="grid gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <div ref={box} className="relative grid grid-rows-subgrid row-span-3 content-start gap-y-0">
          <label htmlFor="imu-comune" className="mb-1 block text-sm font-medium text-navy-700">{L.comune}</label>
          <input id="imu-comune" type="text" autoComplete="off" role="combobox" aria-expanded={open && results.length > 0} aria-controls="imu-comune-list" aria-autocomplete="list"
            value={open ? q : `${c.name} (${c.prov})`} placeholder={L.cerca}
            onFocus={() => { setOpen(true); setQ(''); }} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]); } if (e.key === 'Escape') setOpen(false); }}
            className="h-12 w-full rounded-lg border border-navy-300 bg-white px-4 text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
          <p className="mt-1 text-xs text-navy-500">{c.reg}{c.cap ? (lang === 'it' ? ' · capoluogo' : ' · provincial capital') : ''} · {c.code}</p>
          {open && q.trim().length >= 2 && (
            <ul id="imu-comune-list" role="listbox" className="absolute left-0 right-0 top-[4.75rem] z-20 max-h-72 overflow-y-auto rounded-lg border border-navy-200 bg-white shadow-lg">
              {results.length === 0 && <li className="px-4 py-2 text-sm text-navy-500">{L.noRes}</li>}
              {results.map((x) => (
                <li key={x.code} role="option" aria-selected={x.code === code}>
                  <button type="button" onClick={() => pick(x)} className="flex w-full justify-between px-4 py-2 text-left text-sm text-navy-800 hover:bg-accent-50"><span>{x.name} ({x.prov})</span><span className="text-navy-500">{x.reg}</span></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <SelectField id="imu-tipo" label={L.tipo} value={profilo} onChange={changeProfilo} options={PROFILI.map((p) => ({ value: p.id, label: p[lang] }))} />
        {imu && P.cats.length > 1 && <SelectField id="imu-cat" label={L.cat} value={cat} onChange={(v) => { setCat(v as Categoria); setAliqOv(null); setAccOv(null); }} options={P.cats.map((k) => ({ value: k, label: CAT_LABEL[k] }))} />}
        {imu && <NumberField id="imu-rendita" label={renditaLabel} value={rendita} onChange={setRendita} unit="€" max={P.tipo === 'area' ? 100_000_000 : 1_000_000} decimals={2} help={renditaHelp} lang={lang} />}
        {imu && <NumberField id="imu-aliquota" label={L.aliquota} value={Math.max(0, aliquota)} onChange={(v) => setAliqOv(v)} unit="%" max={1.14} decimals={3} help={L.aliquotaHelp} lang={lang} />}
      </form>

      <p className={`mt-4 border-l-4 px-3 py-2 text-sm ${c.st === 'P26' ? 'border-accent-600 bg-accent-50 text-navy-800' : 'border-amber-500 bg-amber-50 text-navy-800'}`} role="status">{statusText}</p>

      {imu && !compact && (
        <details className="mt-4 rounded-lg border border-navy-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-navy-800">{L.avanzate}</summary>
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <NumberField id="imu-quota" label={L.quota} value={quota} onChange={setQuota} unit="%" max={100} lang={lang} />
            <NumberField id="imu-mesi" label={L.mesi} value={mesi} onChange={setMesi} unit={lang === 'it' ? 'mesi' : 'months'} max={12} lang={lang} />
            {mesi < 12 && <Toggle id="imu-periodo" label={L.periodo} value={periodo} onChange={(v) => setPeriodo(v as 'inizio' | 'fine')} options={[{ value: 'inizio', label: L.daGennaio }, { value: 'fine', label: L.finoDicembre }]} />}
            {P.tipo === 'fabbricato' && !P.riduzione && <SelectField id="imu-rid" label={L.riduzione} value={rid} onChange={(v) => setRid(v as RiduzioneBase)} options={[{ value: 'nessuna', label: L.nessuna }, { value: 'storico', label: L.storico }, { value: 'inagibile', label: L.inagibile }]} />}
            {P.uso === 'ap' && lusso(cat) && <NumberField id="imu-pert" label={L.pertinenze} value={pert} onChange={setPert} unit="€" max={100000} decimals={2} help={L.pertinenzeHelp} lang={lang} />}
            {P.tipo === 'fabbricato' && P.uso !== 'ap' && <Toggle id="imu-estero" label={L.estero} value={estero ? 'si' : 'no'} onChange={(v) => setEstero(v === 'si')} options={[{ value: 'no', label: L.no }, { value: 'si', label: L.si }]} />}
            {P.tipo === 'terreno' && <Toggle id="imu-colt" label={L.coltivatore} value={colt ? 'si' : 'no'} onChange={(v) => setColt(v === 'si')} options={[{ value: 'no', label: L.no }, { value: 'si', label: L.si }]} />}
            <NumberField id="imu-acconto" label={L.acconto} value={Math.max(0, aliqAcc)} onChange={(v) => setAccOv(v)} unit="%" max={1.14} decimals={3} lang={lang} />
          </div>
        </details>
      )}

      {imu && (
        <div aria-live="polite" className="mt-6 rounded-xl bg-accent-50 p-5">
          <p className="text-sm font-medium text-navy-600">{res.esente || res.imposta <= 0 ? L.esente : L.annua} · {c.name}</p>
          <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900">{$(res.imposta)}</p>
          {motivo && <p className="mt-2 text-sm text-navy-700">{motivo}</p>}
          {c.pd && fatt === 'ter' && <p className="mt-2 text-sm text-navy-700">{L.pd}</p>}
          {!res.esente && res.imposta > 0 && (
            <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-200">
              <tr><td className="py-2 pr-3 text-navy-600">{L.base}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(res.baseRidotta)}</td></tr>
              <tr><td className="py-2 pr-3 text-navy-600">{L.aliq}</td><td className="tabular-nums py-2 text-right text-navy-900">{formatAliquota(aliquota, lang)}</td></tr>
              {res.detrazione > 0 && <tr><td className="py-2 pr-3 text-navy-600">{L.detr}</td><td className="tabular-nums py-2 text-right text-navy-900">−{$(res.detrazione)}</td></tr>}
              {fatt === 'D' && <tr><td className="py-2 pr-3 text-navy-600">{L.stato}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(res.stato)}</td></tr>}
              {fatt === 'D' && <tr><td className="py-2 pr-3 text-navy-600">{L.comuneQ}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(res.comune)}</td></tr>}
              <tr><td className="py-2 pr-3 font-medium text-navy-800">{L.rataG}</td><td className="tabular-nums py-2 text-right font-semibold text-navy-900">{$(res.acconto)}</td></tr>
              <tr><td className="py-2 pr-3 font-medium text-navy-800">{L.rataD}</td><td className="tabular-nums py-2 text-right font-semibold text-navy-900">{$(res.saldo)}</td></tr>
            </tbody></table>
          )}
          {res.f24.length > 0 && !compact && (
            <div className="mt-5 overflow-x-auto">
              <p className="mb-2 text-sm font-semibold text-navy-800">{L.f24}</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-navy-300 text-left text-navy-600"><th scope="col" className="py-1.5 pr-2 font-medium">{L.codice}</th><th scope="col" className="py-1.5 pr-2 font-medium">{L.ente}</th><th scope="col" className="py-1.5 pr-2 font-medium">{L.rata}</th><th scope="col" className="py-1.5 text-right font-medium">{L.importo}</th></tr></thead>
                <tbody>{res.f24.map((r, i) => <tr key={i} className="border-b border-navy-100"><td className="tabular-nums py-1.5 pr-2 text-navy-900">{r.codice}</td><td className="py-1.5 pr-2 text-navy-900">{c.code}</td><td className="py-1.5 pr-2 text-navy-700">{r.rata === 'acconto' ? L.accontoL : L.saldoL}</td><td className="tabular-nums py-1.5 text-right text-navy-900">{$(r.importo)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => copy('r')} className="rounded-lg border border-navy-300 bg-white px-3 py-2 font-medium text-navy-800 hover:bg-navy-50">{copied === 'r' ? L.copiato : L.copia}</button>
            <button type="button" onClick={() => copy('l')} className="rounded-lg border border-navy-300 bg-white px-3 py-2 font-medium text-navy-800 hover:bg-navy-50">{copied === 'l' ? L.copiato : L.link}</button>
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-navy-300 bg-white px-3 py-2 font-medium text-navy-800 hover:bg-navy-50">{L.stampa}</button>
            {methodHref && <a href={methodHref} className="px-1 py-2 font-medium text-accent-700 hover:underline">{L.metodo}</a>}
          </div>
        </div>
      )}

      {imu && !compact && diffRows.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-navy-800">{L.diff} {c.name}</p>
          <ul className="mt-2 divide-y divide-navy-100 rounded-lg border border-navy-200">
            {diffRows.map((d, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-navy-700">{d[2]}</span>
                <span className="flex shrink-0 items-center gap-2"><span className="tabular-nums font-semibold text-navy-900">{formatAliquota(d[1], lang)}</span>
                  <button type="button" onClick={() => { setAliqOv(d[1]); setAccOv(null); }} className="rounded border border-accent-600 px-2 py-0.5 text-xs font-medium text-accent-700 hover:bg-accent-50">{L.applica}</button></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {imu && !compact && diff.e && <p className="mt-3 text-xs text-navy-600"><strong>{L.esenzioni}:</strong> {diff.e}</p>}
    </div>
  );
}
