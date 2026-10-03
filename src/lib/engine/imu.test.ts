import { describe, it, expect } from 'vitest';
import { calcolaImu, baseFabbricato, baseTerreno, moltiplicatore, arrotonda, semestri, mesiTrasferimento, ravvedimento, fattispecie, giorniTra } from './imu';
import { comune, ratesOf } from '../comuni';

// Cas construits à la main depuis le texte de la loi (L. 160/2019, commi 745-762), relus le 2026-10-03.
describe('base imponibile (comma 745-746)', () => {
  it('moltiplicatori per categoria', () => {
    expect(moltiplicatore('A2')).toBe(160); expect(moltiplicatore('A1')).toBe(160); expect(moltiplicatore('C6')).toBe(160);
    expect(moltiplicatore('B')).toBe(140); expect(moltiplicatore('C3')).toBe(140); expect(moltiplicatore('C5')).toBe(140);
    expect(moltiplicatore('A10')).toBe(80); expect(moltiplicatore('D5')).toBe(80);
    expect(moltiplicatore('D')).toBe(65); expect(moltiplicatore('C1')).toBe(55);
  });
  it('rendita 1 000 € in A/2 = 168 000 €', () => { expect(baseFabbricato(1000, 'A2')).toBeCloseTo(168000, 6); });
  it('reddito dominicale 500 € = 84 375 €', () => { expect(baseTerreno(500)).toBeCloseTo(84375, 6); });
});

describe('imposta', () => {
  it('seconda casa A/2, rendita 1 000 €, 1,06 % : 1 780,80 € in due rate da 890,40 €', () => {
    const r = calcolaImu({ categoria: 'A2', rendita: 1000, aliquota: 1.06 });
    expect(r.imposta).toBeCloseTo(1780.8, 6); expect(r.acconto).toBeCloseTo(890.4, 6); expect(r.saldo).toBeCloseTo(890.4, 6);
    expect(r.f24).toEqual([{ codice: '3918', rata: 'acconto', importo: 890 }, { codice: '3918', rata: 'saldo', importo: 890 }]);
  });
  it('abitazione principale non di lusso : esente (comma 740)', () => {
    const r = calcolaImu({ categoria: 'A3', rendita: 900, aliquota: 0.6, uso: 'ap' });
    expect(r.esente).toBe(true); expect(r.motivo).toBe('ap'); expect(r.imposta).toBe(0); expect(r.f24).toEqual([]);
  });
  it('abitazione principale A/1, rendita 2 000 €, 0,6 % : 2 016 € − 200 € = 1 816 €', () => {
    const r = calcolaImu({ categoria: 'A1', rendita: 2000, aliquota: 0.6, uso: 'ap' });
    expect(r.impostaLorda).toBeCloseTo(2016, 6); expect(r.detrazione).toBe(200); expect(r.imposta).toBeCloseTo(1816, 6);
    expect(r.acconto).toBeCloseTo(908, 6); expect(r.f24[0].codice).toBe('3912');
  });
  it('pertinenza C/6 dell’abitazione di lusso sommata alla base', () => {
    const r = calcolaImu({ categoria: 'A8', rendita: 2000, renditaPertinenze: 200, aliquota: 0.6, uso: 'ap' });
    expect(r.base).toBeCloseTo((2000 + 200) * 1.05 * 160, 6);
  });
  it('detrazione ridotta alla quota e ai mesi', () => {
    const r = calcolaImu({ categoria: 'A9', rendita: 3000, aliquota: 0.5, uso: 'ap', quota: 50, mesi: 6, periodo: 'fine' });
    expect(r.detrazione).toBeCloseTo(200 * 0.5 * 0.5, 6);
  });
  it('comodato a parente di 1° grado : base dimezzata (comma 747 c)', () => {
    const r = calcolaImu({ categoria: 'A3', rendita: 800, aliquota: 1.06, riduzione: 'comodato' });
    expect(r.baseRidotta).toBeCloseTo(67200, 6); expect(r.imposta).toBeCloseTo(712.32, 6);
  });
  it('comodato escluso per A/1, A/8, A/9', () => {
    const r = calcolaImu({ categoria: 'A1', rendita: 800, aliquota: 1.06, riduzione: 'comodato' });
    expect(r.baseRidotta).toBeCloseTo(r.base, 6);
  });
  it('canone concordato : imposta al 75 % (comma 760)', () => {
    expect(calcolaImu({ categoria: 'A2', rendita: 1000, aliquota: 1.06, canoneConcordato: true }).imposta).toBeCloseTo(1335.6, 6);
  });
  it('pensionato residente all’estero : imposta a metà (L. 178/2020 c. 48)', () => {
    expect(calcolaImu({ categoria: 'A2', rendita: 1000, aliquota: 1.06, pensionatoEstero: true }).imposta).toBeCloseTo(890.4, 6);
  });
  it('inagibile e storico : base dimezzata', () => {
    expect(calcolaImu({ categoria: 'A4', rendita: 500, aliquota: 1, riduzione: 'inagibile' }).baseRidotta).toBeCloseTo(42000, 6);
    expect(calcolaImu({ categoria: 'A4', rendita: 500, aliquota: 1, riduzione: 'storico' }).baseRidotta).toBeCloseTo(42000, 6);
  });
  it('negozio C/1, rendita 3 000 €, 1,06 %', () => {
    expect(calcolaImu({ categoria: 'C1', rendita: 3000, aliquota: 1.06 }).imposta).toBeCloseTo(1836.45, 6);
  });
  it('capannone D/1 : quota Stato 0,76 % (3925) e quota comune (3930)', () => {
    const r = calcolaImu({ categoria: 'D', rendita: 10000, aliquota: 1.06 });
    expect(r.imposta).toBeCloseTo(7234.5, 6); expect(r.stato).toBeCloseTo(5187, 6); expect(r.comune).toBeCloseTo(2047.5, 6);
    expect(r.f24).toEqual([
      { codice: '3925', rata: 'acconto', importo: 2594 }, { codice: '3930', rata: 'acconto', importo: 1024 },
      { codice: '3925', rata: 'saldo', importo: 2594 }, { codice: '3930', rata: 'saldo', importo: 1024 },
    ]);
  });
  it('fabbricato rurale strumentale D/10 : codice 3913', () => {
    const r = calcolaImu({ categoria: 'D10', rendita: 2000, aliquota: 0.1 });
    expect(r.fattispecie).toBe('rur'); expect(r.imposta).toBeCloseTo(2000 * 1.05 * 65 * 0.001, 6); expect(r.f24[0].codice).toBe('3913');
  });
  it('terreno agricolo : 0,76 %, esente per il coltivatore diretto e nei comuni montani', () => {
    expect(calcolaImu({ tipo: 'terreno', rendita: 500, aliquota: 0.76 }).imposta).toBeCloseTo(641.25, 6);
    expect(calcolaImu({ tipo: 'terreno', rendita: 500, aliquota: 0.76, coltivatore: true }).motivo).toBe('coltivatore');
    expect(calcolaImu({ tipo: 'terreno', rendita: 500, aliquota: -1 }).motivo).toBe('montano');
  });
  it('area fabbricabile sul valore venale', () => {
    const r = calcolaImu({ tipo: 'area', rendita: 100000, aliquota: 1.06 });
    expect(r.imposta).toBeCloseTo(1060, 6); expect(r.f24[0].codice).toBe('3916');
  });
  it('acconto con l’aliquota dell’anno precedente, saldo a conguaglio (comma 762)', () => {
    const r = calcolaImu({ categoria: 'A2', rendita: 1000, aliquota: 1.06, aliquotaAcconto: 0.96 });
    expect(r.acconto).toBeCloseTo(806.4, 6); expect(r.saldo).toBeCloseTo(974.4, 6);
  });
  it('quota e mesi di possesso', () => {
    const r = calcolaImu({ categoria: 'A2', rendita: 1000, aliquota: 1.06, quota: 50, mesi: 4, periodo: 'fine' });
    expect(r.imposta).toBeCloseTo(1780.8 * 0.5 / 3, 6); expect(r.acconto).toBe(0); expect(r.mesi).toEqual([0, 4]);
  });
  it('fattispecie', () => {
    expect(fattispecie('fabbricato', 'D5', 'altro')).toBe('D'); expect(fattispecie('fabbricato', 'A10', 'altro')).toBe('altri');
    expect(fattispecie('fabbricato', 'A2', 'rurale')).toBe('rur');
  });
});

describe('arrotondamento e mesi (L. 296/2006 c. 166 ; comma 761)', () => {
  it('per difetto fino a 49 centesimi', () => { expect(arrotonda(10.49)).toBe(10); expect(arrotonda(10.5)).toBe(11); expect(arrotonda(10.48)).toBe(10); expect(arrotonda(-3)).toBe(0); });
  it('semestri', () => { expect(semestri(12)).toEqual([6, 6]); expect(semestri(8, 'inizio')).toEqual([6, 2]); expect(semestri(8, 'fine')).toEqual([2, 6]); });
  it('rogito il 16 marzo : il mese va all’acquirente', () => { expect(mesiTrasferimento('2026-03-16')).toEqual({ venditore: 2, acquirente: 10, meseAcquirente: true }); });
  it('rogito il 17 marzo : il mese resta al venditore', () => { expect(mesiTrasferimento('2026-03-17')).toEqual({ venditore: 3, acquirente: 9, meseAcquirente: false }); });
  it('febbraio, 14 giorni a testa : il mese va all’acquirente', () => { expect(mesiTrasferimento('2026-02-15')).toEqual({ venditore: 1, acquirente: 11, meseAcquirente: true }); });
});

describe('ravvedimento operoso (D.Lgs. 471/1997 e 472/1997, art. 13)', () => {
  const base = { imposta: 1000, scadenza: '2026-06-16' };
  it('10 giorni : 1/15 al giorno di 12,5 %, ridotto a 1/10', () => {
    const r = ravvedimento({ ...base, pagamento: '2026-06-26', tassoLegale: 2 });
    expect(r.giorni).toBe(10); expect(r.sanzione).toBeCloseTo(1000 * 0.125 * 10 / 15 * 0.1, 6); expect(r.interessi).toBeCloseTo(1000 * 0.02 * 10 / 365, 6);
  });
  it('24 giorni : 1,25 %', () => { expect(ravvedimento({ ...base, pagamento: '2026-07-10' }).sanzionePct).toBeCloseTo(0.0125, 9); });
  it('76 giorni : 12,5 % / 9', () => { expect(ravvedimento({ ...base, pagamento: '2026-08-31' }).sanzionePct).toBeCloseTo(0.125 / 9, 9); });
  it('entro il 30 giugno 2027 : 25 % / 8', () => { expect(ravvedimento({ ...base, pagamento: '2026-12-31' }).sanzionePct).toBeCloseTo(0.03125, 9); });
  it('oltre : 25 % / 7', () => { expect(ravvedimento({ ...base, pagamento: '2027-07-15' }).sanzionePct).toBeCloseTo(0.25 / 7, 9); });
  it('senza tasso legale, interessi non calcolati', () => { expect(ravvedimento({ ...base, pagamento: '2026-07-10' }).interessi).toBeNull(); });
  it('nessun ritardo', () => { expect(ravvedimento({ ...base, pagamento: '2026-06-16' }).fascia).toBe('nessuna'); expect(giorniTra('2026-06-16', '2026-12-16')).toBe(183); });
});

describe('dati dei comuni (prospetti MEF)', () => {
  it('Milano 2026 : 1,14 % altri fabbricati, 0,68 % abitazione di lusso', () => {
    const c = comune('F205')!; expect(c.st).toBe('P26'); expect(ratesOf(c).altri).toBe(1.14); expect(ratesOf(c).ap).toBe(0.68);
  });
  it('Roma : prospetto 2025 ancora in vigore', () => { const c = comune('H501')!; expect(c.st).toBe('P25'); expect(ratesOf(c).altri).toBe(1.14); });
  it('Trieste : ILIA, nessuna aliquota IMU', () => { const c = comune('L424')!; expect(c.st).toBe('ILIA'); });
  it('copertura : oltre 7 300 comuni con prospetto', async () => {
    const { META } = await import('../comuni'); expect(META.counts.P26 + META.counts.P25).toBeGreaterThan(7300);
  });
});
