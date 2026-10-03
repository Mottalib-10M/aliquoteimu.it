/** Champ de recherche d'un comune (autocomplétion sur 7 896 comuni, sans réseau). */
import { useEffect, useRef, useState } from 'react';
import { cerca, type Comune } from '../../lib/comuni';

interface Props { id: string; label: string; value: Comune; onPick: (c: Comune) => void; lang?: 'it' | 'en' }
export default function ComunePicker({ id, label, value, onPick, lang = 'it' }: Props) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);
  const results = open ? cerca(q) : [];
  const pick = (c: Comune) => { onPick(c); setQ(''); setOpen(false); };
  return (
    <div ref={box} className="relative grid grid-rows-subgrid row-span-3 content-start gap-y-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-navy-700">{label}</label>
      <input id={id} type="text" autoComplete="off" role="combobox" aria-expanded={open && results.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
        value={open ? q : `${value.name} (${value.prov})`} placeholder={lang === 'en' ? 'Type the comune name' : 'Scrivi il nome del comune'}
        onFocus={() => { setOpen(true); setQ(''); }} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]); } if (e.key === 'Escape') setOpen(false); }}
        className="h-12 w-full rounded-lg border border-navy-300 bg-white px-4 text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
      <p className="mt-1 text-xs text-navy-500">{value.reg} · {value.code}</p>
      {open && q.trim().length >= 2 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-[4.75rem] z-20 max-h-72 overflow-y-auto rounded-lg border border-navy-200 bg-white shadow-lg">
          {results.length === 0 && <li className="px-4 py-2 text-sm text-navy-500">{lang === 'en' ? 'No comune found' : 'Nessun comune trovato'}</li>}
          {results.map((x) => (
            <li key={x.code} role="option" aria-selected={x.code === value.code}>
              <button type="button" onClick={() => pick(x)} className="flex w-full justify-between px-4 py-2 text-left text-sm text-navy-800 hover:bg-accent-50"><span>{x.name} ({x.prov})</span><span className="text-navy-500">{x.reg}</span></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
