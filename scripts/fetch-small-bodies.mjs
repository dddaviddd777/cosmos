/**
 * Descarrega les dades orbitals dels cossos petits des de la NASA/JPL:
 *  - JPL Horizons: elements orbitals osculadors en una època recent (heliocèntrics, eclíptica J2000)
 *    i vectors de posició de referència per validar el nostre propagador.
 *  - JPL SBDB: diàmetre i classe d'òrbita.
 *
 * Ús:  node scripts/fetch-small-bodies.mjs
 * Genera: src/data/small-bodies.json i src/data/horizons-check.json
 */
import { writeFile, mkdir } from 'node:fs/promises';

const EPOCH = '2026-11-01'; // època dels elements (TDB, 00:00)
// Dates on comprovarem la posició propagada contra Horizons
const CHECK_DATES = ['2024-11-01', '2025-11-01', '2026-11-01', '2027-11-01', '2028-11-01', '2031-11-01'];

/** id del catàleg → ordre per a Horizons i designació per al SBDB */
const BODIES = [
  { id: 'ceres', horizons: '1;', sbdb: '1' },
  { id: 'pallas', horizons: '2;', sbdb: '2' },
  { id: 'vesta', horizons: '4;', sbdb: '4' },
  { id: 'hygiea', horizons: '10;', sbdb: '10' },
  { id: 'psyche', horizons: '16;', sbdb: '16' },
  { id: 'eros', horizons: '433;', sbdb: '433' },
  { id: 'didymos', horizons: '65803;', sbdb: '65803' },
  { id: 'bennu', horizons: '101955;', sbdb: '101955' },
  // El pas proper del 13/04/2029 canviarà l'òrbita d'Apophis: guardem també els elements posteriors
  // i, com que el model de dos cossos no pot reproduir el pas proper, en desem l'efemèride geocèntrica oficial.
  {
    id: 'apophis', horizons: '99942;', sbdb: '99942',
    extra: [{ epoch: '2029-06-01', validFrom: '2029-04-14T00:00:00Z' }],
    closeApproach: { start: '2029-04-12', stop: '2029-04-15', step: '10m' },
  },
  { id: 'eris', horizons: '136199;', sbdb: '136199' },
  { id: 'haumea', horizons: '136108;', sbdb: '136108' },
  { id: 'makemake', horizons: '136472;', sbdb: '136472' },
  { id: 'halley', horizons: 'DES=1P;CAP;NOFRAG;', sbdb: '1P' },
  { id: 'encke', horizons: 'DES=2P;CAP;NOFRAG;', sbdb: '2P' },
  { id: '67p', horizons: 'DES=67P;CAP;NOFRAG;', sbdb: '67P' },
  { id: 'swift-tuttle', horizons: 'DES=109P;CAP;NOFRAG;', sbdb: '109P' },
  { id: 'tempel-tuttle', horizons: 'DES=55P;CAP;NOFRAG;', sbdb: '55P' },
  { id: 'hale-bopp', horizons: 'DES=C/1995 O1;CAP;NOFRAG;', sbdb: 'C/1995 O1' },
];

const UA = { 'User-Agent': 'CosmosSistemaSolar/0.1 (educational app)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function horizons(params) {
  const u = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
  const base = {
    format: 'json', OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', CENTER: "'500@10'",
    REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'J2000', OUT_UNITS: 'AU-D', CSV_FORMAT: 'YES',
  };
  for (const [k, v] of Object.entries({ ...base, ...params })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: UA });
  const j = await res.json();
  const m = /\$\$SOE([\s\S]*?)\$\$EOE/.exec(j.result ?? '');
  if (!m) throw new Error(`Horizons sense dades per ${params.COMMAND}:\n${(j.result ?? j.error ?? '').slice(0, 800)}`);
  return m[1].trim().split('\n').map((l) => l.split(',').map((s) => s.trim()));
}

async function elements(cmd, epoch = EPOCH) {
  // Columnes: JDTDB, Data, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR
  const [r] = await horizons({
    COMMAND: `'${cmd}'`, EPHEM_TYPE: 'ELEMENTS', START_TIME: `'${epoch}'`, STOP_TIME: `'${epoch} 00:01'`, STEP_SIZE: "'1'",
  });
  const n = (i) => Number(r[i]);
  return { epochJd: n(0), e: n(2), q: n(3), i: n(4), om: n(5), w: n(6), tp: n(7), n: n(8), ma: n(9), a: n(11), ad: n(12), per: n(13) };
}

async function vectors(cmd) {
  const out = [];
  for (const d of CHECK_DATES) {
    // Columnes: JDTDB, Data, X, Y, Z, ...
    const [r] = await horizons({
      COMMAND: `'${cmd}'`, EPHEM_TYPE: 'VECTORS', VEC_TABLE: '1', START_TIME: `'${d}'`, STOP_TIME: `'${d} 00:01'`, STEP_SIZE: "'1'",
    });
    out.push({ date: `${d}T00:00:00Z`, x: Number(r[2]), y: Number(r[3]), z: Number(r[4]) });
    await sleep(250);
  }
  return out;
}

async function sbdb(des) {
  const u = new URL('https://ssd-api.jpl.nasa.gov/sbdb.api');
  u.searchParams.set('sstr', des);
  u.searchParams.set('phys-par', '1');
  const j = await (await fetch(u, { headers: UA })).json();
  const phys = Object.fromEntries((j.phys_par ?? []).map((p) => [p.name, p.value]));
  return {
    fullname: j.object?.fullname,
    orbitClass: j.object?.orbit_class?.name,
    diameterKm: phys.diameter ? Number(phys.diameter) : undefined,
    extent: phys.extent,
  };
}

const small = {};
const check = {};
for (const b of BODIES) {
  process.stdout.write(`${b.id}… `);
  const [el, info] = [await elements(b.horizons), await sbdb(b.sbdb)];
  // Trams d'òrbita: cadascun és vàlid a partir de `validFrom` (el primer, sempre)
  const orbits = [el];
  for (const x of b.extra ?? []) orbits.push({ ...(await elements(b.horizons, x.epoch)), validFrom: x.validFrom });
  small[b.id] = { ...info, orbits };
  if (b.closeApproach) {
    // Vectors Terra → cos (geocèntrics, eclíptica J2000, UA) amb pas fi al voltant del pas proper
    const c = b.closeApproach;
    const rows = await horizons({
      COMMAND: `'${b.horizons}'`, EPHEM_TYPE: 'VECTORS', VEC_TABLE: '1', CENTER: "'500@399'",
      START_TIME: `'${c.start}'`, STOP_TIME: `'${c.stop}'`, STEP_SIZE: `'${c.step}'`,
    });
    small[b.id].closeApproach = rows.map((r) => [Number(r[0]), Number(r[2]), Number(r[3]), Number(r[4])]);
  }
  check[b.id] = await vectors(b.horizons);
  console.log(`a=${el.a.toFixed(3)} UA, e=${el.e.toFixed(4)}, ${info.fullname}`);
  await sleep(250);
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
const meta = { source: 'NASA/JPL Horizons + SBDB', fetched: new Date().toISOString().slice(0, 10), epoch: `${EPOCH} TDB`, frame: 'heliocèntric, eclíptica J2000, UA, graus, dies' };
await writeFile(new URL('../src/data/small-bodies.json', import.meta.url), JSON.stringify({ meta, bodies: small }, null, 2) + '\n');
await writeFile(new URL('../src/data/horizons-check.json', import.meta.url), JSON.stringify({ meta, vectors: check }, null, 2) + '\n');
console.log('Fet.');
