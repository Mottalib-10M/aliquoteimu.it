#!/usr/bin/env python3
"""Jeu de données des aliquote IMU par comune (RECETTE §2.2, §4 : script rejouable).

Source unique : les prospetti delle aliquote publiés par le Dipartimento delle Finanze
(art. 1, commi 757 et 767, legge 160/2019), téléchargés en archives régionales depuis
https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_imu/dati/download.htm
plus la liste officielle des comuni de l'ISTAT (codice catastale, provincia, regione).

Règle appliquée par comune (art. 1, comma 767, legge 160/2019 ; DM 6 novembre 2025) :
  - prospetto 2026 publié              -> aliquote 2026            (statut P26)
  - sinon prospetto 2025               -> aliquote 2025 reconduites (statut P25)
  - aucun prospetto conforme           -> aliquote di base, commi 748-755 (statut B)
  - Friuli Venezia Giulia              -> ILIA (LR 17/2022), pas d'IMU
  - provincia di Trento / di Bolzano   -> IMIS / IMI, pas d'IMU (comma 739)

Usage : python3 scripts/it/build-data.py [--cache DIR]
Le cache (archives zip + textes extraits) n'est pas versionné. Durée : ~3 min, 10 processus.
Cadence : relancer après le 28 octobre (publication des prospetti de l'année) puis en mars.
"""
import csv, io, json, os, re, sys, zipfile, subprocess, collections
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv else os.path.join(ROOT, 'scripts', 'it', '.cache-mef')
YEARS = ['2026', '2025']
ZIPBASE = 'https://www1.finanze.gov.it/dipartimentopolitichefiscali/fiscalitalocale/tributi_locali/datizip'
REGIONI_ZIP = ['abruzzo', 'basilicata', 'calabria', 'campania', 'emilia-romagna', 'lazio', 'liguria', 'lombardia',
               'marche', 'molise', 'piemonte', 'puglia', 'sardegna', 'sicilia', 'toscana', 'umbria', 'valledaosta', 'veneto']
ISTAT = 'https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv'
RETRIEVED = '2026-10-03'


def curl(url, dest):
    if not os.path.exists(dest) or os.path.getsize(dest) == 0:
        subprocess.run(['curl', '-sL', '-m', '900', '-A', 'Mozilla/5.0', url, '-o', dest], check=True)


def pdf_text(path):
    import pypdf
    try:
        r = pypdf.PdfReader(path)
        return '\n'.join((p.extract_text() or '') for p in r.pages)
    except Exception as e:  # PDF illisible : ignoré, compté
        return 'ERR ' + str(e)


def extract(job):
    y, name, data = job
    p = os.path.join(CACHE, 'tmp', f'{y}-{name}')
    open(p, 'wb').write(data)
    t = pdf_text(p)
    os.remove(p)
    return f'{y}/{name}', t


def textes():
    out_path = os.path.join(CACHE, 'texts.json')
    if os.path.exists(out_path):
        return json.load(open(out_path))
    os.makedirs(os.path.join(CACHE, 'tmp'), exist_ok=True)
    jobs = []
    for y in YEARS:
        for r in REGIONI_ZIP:
            z = os.path.join(CACHE, f'{y}-{r}.zip')
            curl(f'{ZIPBASE}/{y}/{r}.zip', z)
            with zipfile.ZipFile(z) as zf:
                for n in zf.namelist():
                    if n.lower().endswith('.pdf'):
                        jobs.append((y, n, zf.read(n)))
    with Pool(10) as pool:
        T = dict(pool.imap_unordered(extract, jobs, chunksize=20))
    json.dump(T, open(out_path, 'w'))
    return T


R = r'(\d{1,2}(?:,\d+)?)\s?%'
HEADS = [('altri', r"Altri fabbricati \(fabbricati"), ('D', r"Fabbricati appartenenti al gruppo catastale D(?! \(esclusa)"),
         ('D', r"Fabbricati appartenenti al gruppo catastale(?= )"), ('D', r"Fabbricati appartenenti al(?= gruppo| )"),
         ('rur', r"Fabbricati rurali"), ('ter', r"Terreni agricoli"), ('aree', r"Aree [Ff]abbricabili"),
         ('ap', r"Abitazione principale"), ('altri', r"Altri fabbricati(?= )")]
# Fragments de l'intitulé de colonne que l'extraction à deux colonnes mêle aux conditions.
JUNK = [r"\(fabbricati diversi dall'abitazione principale e dai fabbricati appartenenti al gruppo catastale D\)",
        r"\(fabbricati diversi dall'abitazione principale e dai fabbricati", r"\(fabbricati diversi dall'abitazione principale e dai",
        r"\(fabbricati diversi dall'abitazione", r"\(fabbricati diversi", r"fabbricati appartenenti al gruppo catastale D\)",
        r"appartenenti al gruppo catastale D\)", r"principale e dai fabbricati", r"dall'abitazione principale e dai",
        r"diversi dall'abitazione principale", r"diversi dall'abitazione", r"\(fabbricati"]


def norm(t):
    t = re.sub(r'Pagina \d+ di \d+', '', t)
    t = re.sub(r'Documento generato il [\d/]+ alle [\d:]+', '', t)
    return re.sub(r'\s+', ' ', t).strip()


def num(s):
    return None if s is None else round(float(s.replace(',', '.')), 4)


def parse_diffs(body):
    pos = []
    for g, h in HEADS:
        for m in re.finditer(h, body):
            if not any(abs(m.start() - p[0]) < 3 for p in pos):
                pos.append((m.start(), m.end(), g))
    pos.sort()
    out = []
    for i, (a, b, g) in enumerate(pos):
        e = pos[i + 1][0] if i + 1 < len(pos) else len(body)
        seg = body[b:e]
        rates = re.findall(R + r'(?=\s|$)', seg)
        txt = re.sub(R + r'(?=\s|$)', ' ', seg)
        for j in JUNK:
            txt = re.sub(j, ' ', txt)
        # Restes de l'intitulé coupé par la mise en page à deux colonnes.
        for j in (r"^\s*diversi\b", r"appartenenti al gruppo(?! catastale D/)", r"\bcatastale D\)", r"dall'abitazione principale e dai fabbricati",
                  r"\bdall'abitazione\b(?! principale (?:del|da|di))", r"\bprincipale e dai\b", r"\bfabbricati\)"):
            txt = re.sub(j, ' ', txt)
        txt = re.sub(r'\s+', ' ', txt).strip(' -')
        if g == 'D' and txt.startswith('D '):
            txt = txt[2:]
        if len(rates) == 1 and txt:
            out.append([g, num(rates[0]), txt])
    return out


def parse(k, t):
    s = norm(t)
    m = re.match(r"Prospetto aliquote IMU - Comune di (.+?) ID Prospetto (\d+) riferito all'anno (\d{4}) "
                 r"Approvato con delibera n° ?(\S*) del (\d\d/\d\d/\d{4})", s)
    if not m:
        return None
    name, pid, anno, ndel, ddel = m.groups()
    code = re.search(r'-\d\d[a-z]{2}\d\d([a-z]\d{3})', k)
    if not code:
        return None
    r = {'code': code.group(1).upper(), 'id': int(pid), 'anno': int(anno), 'del': ndel, 'data': ddel,
         'fus': 'preesistenti comuni: SI' in s}

    def g(rx):
        mm = re.search(rx, s)
        return mm
    mm = g(r"A/1, A/8 e A/9 e relative pertinenze " + R); r['ap'] = num(mm.group(1)) if mm else None
    mm = g(r"n\. 6\), della legge n\. 160 del 2019 (SI|NO)"); r['assim'] = 1 if mm and mm.group(1) == 'SI' else 0
    mm = g(r"Fabbricati rurali ad uso strumentale \(inclusa la categoria catastale D/10\) " + R); r['rur'] = num(mm.group(1)) if mm else None
    mm = g(r"Fabbricati appartenenti al gruppo catastale D \(esclusa la categoria catastale D/10\) " + R); r['D'] = num(mm.group(1)) if mm else None
    mt = re.search(r"Terreni agricoli (.{0,1500}?)(?= Aree fabbricabili)", s)
    tt = mt.group(1) if mt else ''
    if tt.startswith('Esenti'):
        r['ter'] = -1
    else:
        m2 = re.search(R, tt)
        r['ter'] = num(m2.group(1)) if m2 else None
    r['pd'] = 1 if 'parzialmente delimitato' in s else 0  # mention en tête du prospetto
    mm = g(r"Aree fabbricabili " + R); r['aree'] = num(mm.group(1)) if mm else None
    ma = g(r"appartenenti al gruppo catastale D\) " + R); r['altri'] = num(ma.group(1)) if ma else None
    end = s.find('Elenco esenzioni e/o agevolazioni indicate dal comune:')
    r['diff'] = parse_diffs(s[ma.end():end].strip()) if ma and end > ma.end() else []
    pe = s.find('Precisazioni')
    es = s[end + 54:pe].strip() if end > 0 else ''
    r['esenz'] = '' if es.startswith('Nessuna esenzione') else es[:1200]
    return r


def main():
    os.makedirs(CACHE, exist_ok=True)
    T = textes()
    recs = [p for p in (parse(k, t) for k, t in T.items() if t.startswith('Prospetto aliquote IMU')) if p]
    best, prev = {}, {}
    for r in recs:  # prospetto 2025 le plus récent : aliquote de l'acconto de juin 2026 (comma 762)
        if r['anno'] == 2025 and (r['code'] not in prev or r['id'] > prev[r['code']]['id']):
            prev[r['code']] = r
    for r in recs:  # le prospetto le plus récent de l'année la plus récente
        cur = best.get(r['code'])
        if cur is None or (r['anno'], r['id']) > (cur['anno'], cur['id']):
            best[r['code']] = r
    ist = os.path.join(CACHE, 'istat.csv')
    curl(ISTAT, ist)
    rows = list(csv.reader(io.StringIO(open(ist, encoding='latin1').read()), delimiter=';'))[1:]
    regioni = sorted({row[10] for row in rows})
    out, diffs, cnt = [], collections.defaultdict(dict), collections.Counter()
    for row in rows:
        code, name, prov, reg, cap = row[19], row[6], row[14], row[10], int(row[13] == '1')
        if reg.startswith('Friuli'):
            st = 'ILIA'
        elif prov == 'TN':
            st = 'IMIS'
        elif prov == 'BZ':
            st = 'IMI'
        elif code in best:
            st = 'P26' if best[code]['anno'] == 2026 else 'P25'
        else:
            st = 'B'
        cnt[st] += 1
        p = best.get(code) if st in ('P26', 'P25') else None
        if p:
            out.append([code, name, prov, regioni.index(reg), cap, st, p['ap'], p['rur'], p['D'], p['ter'], p['pd'], p['aree'],
                        p['altri'], p['assim'], int(p['fus']), p['del'], p['data'], p['id'],
                        [prev[code][f] for f in ('ap', 'rur', 'D', 'ter', 'aree', 'altri')] if st == 'P26' and code in prev else None])
            if p['diff'] or p['esenz']:
                diffs[reg][code] = {'d': p['diff'], 'e': p['esenz']}
        else:
            out.append([code, name, prov, regioni.index(reg), cap, st] + [None] * 13)
    meta = {'retrieved_at': RETRIEVED, 'source': 'Dipartimento delle Finanze, prospetti delle aliquote IMU 2026 e 2025',
            'counts': dict(cnt), 'total': len(rows), 'prospetti_letti': len(recs),
            'fields': ['code', 'name', 'prov', 'reg', 'cap', 'st', 'ap', 'rur', 'D', 'ter', 'pd', 'aree', 'altri', 'assim', 'fus', 'delibera', 'data', 'id', 'prev2025']}
    data_dir = os.path.join(ROOT, 'src', 'data')
    json.dump({'meta': meta, 'regioni': regioni, 'c': out}, open(os.path.join(data_dir, 'comuni.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    dd = os.path.join(data_dir, 'differenziate')
    os.makedirs(dd, exist_ok=True)
    for reg in regioni:
        slug = re.sub(r'[^a-z]+', '-', reg.lower().split('/')[0]).strip('-')
        json.dump(diffs.get(reg, {}), open(os.path.join(dd, f'{slug}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == '__main__':
    main()
