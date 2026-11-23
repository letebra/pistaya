import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRest } from '../lib/http.js';
import { ErrorApp } from '../lib/errors.js';

function crida(handler, { method = 'GET', url = '/api/x', body } = {}) {
  return new Promise((resol) => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, end(t) { resol({ status: this.statusCode, json: JSON.parse(t), headers: this.headers }); } };
    handler({ method, url, headers: {}, body }, res);
  });
}

test('respon 405 si el mètode no existeix', async () => {
  const r = await crida(apiRest({ GET: async () => 1 }), { method: 'DELETE' });
  assert.equal(r.status, 405);
});

test('els errors interns no mostren detalls tècnics', async () => {
  const r = await crida(apiRest({ GET: async () => { throw new Error('password=secret'); } }));
  assert.equal(r.status, 500);
  assert.doesNotMatch(JSON.stringify(r.json), /secret/);
});

test('els errors de negoci arriben amb codi i missatge', async () => {
  const r = await crida(apiRest({ POST: async () => { throw new ErrorApp(409, 'Ocupada'); } }), { method: 'POST', body: {} });
  assert.deepEqual([r.status, r.json.error], [409, 'Ocupada']);
});

test('POST correcte retorna 201 i les dades', async () => {
  const r = await crida(apiRest({ POST: async (req, { cos, query }) => ({ cos, query }) }), { method: 'POST', url: '/api/x?id=3', body: { a: 1 } });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json.dades, { cos: { a: 1 }, query: { id: '3' } });
});
