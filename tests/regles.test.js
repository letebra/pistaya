import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFranges, comprovarReserva, esPotCanviar, calcularPreu } from '../lib/negoci/regles.js';
import { localADate, dateALocal } from '../lib/temps.js';

const installacio = { obertura: '08:00:00', tancament: '23:00:00' };
const pista = { id: 1, activa: true, preu_hora: 12 };
const ara = localADate('2026-12-01', '10:00');

test('conversió hora local ⇄ UTC (hivern i estiu)', () => {
  assert.equal(localADate('2026-12-01', '18:00').toISOString(), '2026-12-01T17:00:00.000Z');
  assert.equal(localADate('2026-07-01', '18:00').toISOString(), '2026-07-01T16:00:00.000Z');
  assert.deepEqual(dateALocal('2026-12-01T17:00:00.000Z'), { dia: '2026-12-01', hora: '18:00' });
});

test('les franges respecten horari, durada i ocupació', () => {
  const ocupades = [{ id: 9, inici: localADate('2026-12-02', '18:00').toISOString(), fi: localADate('2026-12-02', '19:00').toISOString() }];
  const f = calcularFranges({ dia: '2026-12-02', ...installacio, durada: 60, ocupades, ara });
  assert.equal(f[0].hora, '08:00');
  assert.equal(f.at(-1).hora, '22:00');
  assert.equal(f.find((x) => x.hora === '18:00').disponible, false);
  assert.equal(f.find((x) => x.hora === '17:30').disponible, false); // solapa 30 min
  assert.equal(f.find((x) => x.hora === '19:00').disponible, true);
  const editant = calcularFranges({ dia: '2026-12-02', ...installacio, durada: 60, ocupades, ara, excloureReservaId: 9 });
  assert.equal(editant.find((x) => x.hora === '18:00').disponible, true);
});

test('no es pot reservar una franja ocupada', () => {
  const ocupades = [{ id: 1, inici: localADate('2026-12-02', '18:00').toISOString(), fi: localADate('2026-12-02', '19:30').toISOString() }];
  const e = comprovarReserva({ dia: '2026-12-02', hora: '19:00', durada: 60, pista, installacio, ocupades, reservesFutures: 0, ara });
  assert.match(e.join(' '), /ja està reservada/);
});

test('no es pot reservar en el passat, fora d’horari ni més de 30 dies vista', () => {
  const base = { durada: 60, pista, installacio, ocupades: [], reservesFutures: 0, ara };
  assert.match(comprovarReserva({ ...base, dia: '2026-12-01', hora: '09:00' }).join(), /ja ha passat/);
  assert.match(comprovarReserva({ ...base, dia: '2026-12-02', hora: '22:30' }).join(), /obre de 08:00 a 23:00/);
  assert.match(comprovarReserva({ ...base, dia: '2027-02-01', hora: '10:00' }).join(), /30 dies/);
});

test('límit de 3 reserves pendents (excepte admin) i pista inactiva', () => {
  const base = { dia: '2026-12-02', hora: '10:00', durada: 60, installacio, ocupades: [], ara };
  assert.match(comprovarReserva({ ...base, pista, reservesFutures: 3 }).join(), /màxim/);
  assert.deepEqual(comprovarReserva({ ...base, pista, reservesFutures: 3, esAdmin: true }), []);
  assert.match(comprovarReserva({ ...base, pista: { ...pista, activa: false }, reservesFutures: 0 }).join(), /no està disponible/);
  assert.match(comprovarReserva({ ...base, pista, reservesFutures: 0, durada: 45 }).join(), /durada/);
});

test('modificar/cancel·lar només amb 2 hores d’antelació', () => {
  const r = { estat: 'confirmada', inici: localADate('2026-12-01', '11:30').toISOString() };
  assert.equal(esPotCanviar(r, ara), false);
  assert.equal(esPotCanviar({ ...r, inici: localADate('2026-12-01', '12:00').toISOString() }, ara), true);
  assert.equal(esPotCanviar(r, ara, true), true);
});

test('el preu es calcula al servidor', () => {
  assert.equal(calcularPreu('12.00', 90), 18);
  assert.equal(calcularPreu(9.5, 120), 19);
});
