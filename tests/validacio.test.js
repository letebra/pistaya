import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanejaText, Validador } from '../lib/validacio.js';

test('sanejaText elimina etiquetes HTML i espais sobrers (XSS)', () => {
  assert.equal(sanejaText('  <script>alert(1)</script>Pista   1 '), 'alert(1)Pista 1');
  assert.equal(sanejaText('<img src=x onerror=alert(1)>Nord'), 'Nord');
  assert.equal(sanejaText(null), '');
});

test('Validador acumula errors de diversos camps', () => {
  const v = new Validador({ nom: 'a', preu_hora: '-3', esport: 'golf' })
    .text('nom', { min: 2, etiqueta: 'El nom' })
    .decimal('preu_hora', { min: 0, minExclusiu: true, etiqueta: 'El preu' })
    .opcio('esport', ['padel', 'tennis'], { etiqueta: 'L’esport' });
  assert.throws(() => v.resultat(), (e) => e.status === 400 && Object.keys(e.errors).length === 3);
});

test('Validador retorna dades netes', () => {
  const d = new Validador({ nom: ' <b>Pista</b> 2 ', preu_hora: '12,5', activa: 'on', dia: '2026-12-01', hora: '18:30' })
    .text('nom').decimal('preu_hora').boolea('activa').data('dia').hora('hora').resultat();
  assert.deepEqual(d, { nom: 'Pista 2', preu_hora: 12.5, activa: true, dia: '2026-12-01', hora: '18:30' });
});

test('dates i hores invàlides', () => {
  assert.throws(() => new Validador({ dia: '2026-02-30' }).data('dia').resultat());
  assert.throws(() => new Validador({ hora: '25:00' }).hora('hora').resultat());
  assert.throws(() => new Validador({ t: '12ab' }).telefon('t').resultat());
});
