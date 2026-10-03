/** Calculateur pour l'iframe : italien par défaut, `?lang=en` bascule après le premier rendu (§17.5). */
import { useEffect, useState } from 'react';
import ImuCalculator from './ImuCalculator';
export default function EmbedImu({ site }: { site: string }) {
  const [lang, setLang] = useState<'it' | 'en'>('it');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('lang') === 'en') setLang('en'); }, []);
  return (
    <>
      <ImuCalculator key={lang} lang={lang} />
      <p className="mt-2 text-center text-xs text-navy-500"><a href={`${site}/${lang}/`} target="_blank" rel="noopener" className="hover:underline">aliquoteimu.it</a> · {lang === 'en' ? 'IMU with each comune’s official rates, calculated in your browser' : 'IMU con le aliquote ufficiali di ogni comune, calcolata nel tuo browser'}</p>
    </>
  );
}
