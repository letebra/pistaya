// Vista: formulari per crear o modificar una reserva.
// Mostra les franges lliures (consultades a l'API) i calcula el preu.
import { h, buidar, icona, ESPORTS, euros, dataLlarga, avui } from '../dom.js';
import { api } from '../api.js';
import { exit, error, validarFormulari, mostrarErrors, ambBotoOcupat, carregant } from '../ui.js';
import { navegar } from '../app.js';

export async function vistaReservar(main, params, reservaId = null) {
  let reserva = null;
  let pistaId = params?.[0];
  if (reservaId) {
    reserva = await api.get('reserves', { id: reservaId });
    if (!reserva.es_pot_canviar) throw new Error('Aquesta reserva ja no es pot modificar (cal fer-ho com a mínim 2 hores abans).');
    pistaId = reserva.pista_id;
  }
  const pista = await api.get('pistes', { id: pistaId });

  const inputDia = h('input', { id: 'f-dia', name: 'dia', type: 'date', class: 'form-control', required: true, min: avui(), max: avui(30), value: reserva?.dia ?? avui() });
  const selDurada = h('select', { id: 'f-durada', name: 'durada', class: 'form-select', required: true },
    [[60, '1 hora'], [90, '1 h 30 min'], [120, '2 hores']].map(([v, t]) => h('option', { value: v, selected: Number(reserva?.durada ?? 60) === v }, t)));
  const zonaFranges = h('fieldset', { class: 'mb-3', id: 'franges' });
  const resum = h('div', { class: 'alert alert-light border', 'aria-live': 'polite' });
  const boto = h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, reserva ? 'Desar canvis' : 'Confirmar reserva');
  let horaTriada = reserva?.hora ?? null;

  function actualitzarResum() {
    const durada = Number(selDurada.value);
    if (!horaTriada) { resum.textContent = 'Tria una hora d’inici disponible.'; return; }
    buidar(resum, icona('receipt'), ' ',
      h('strong', {}, `${dataLlarga(inputDia.value)}, ${horaTriada}`), ` · ${durada} min · `,
      h('strong', {}, euros(Number(pista.preu_hora) * durada / 60)));
  }

  async function carregarFranges() {
    buidar(zonaFranges, carregant('Consultant disponibilitat…'));
    try {
      const d = await api.get('disponibilitat', { pista_id: pista.id, dia: inputDia.value, durada: selDurada.value, reserva_id: reserva?.id });
      if (!d.franges.some((f) => f.hora === horaTriada && f.disponible)) horaTriada = null;
      const lliures = d.franges.filter((f) => f.disponible).length;
      buidar(zonaFranges,
        h('legend', { class: 'form-label fs-6' }, 'Hora d’inici ', h('span', { class: 'text-danger', 'aria-hidden': 'true' }, '*'),
          h('span', { class: 'text-secondary small ms-2' }, `(${lliures} franges lliures)`)),
        lliures === 0 ? h('p', { class: 'text-secondary' }, 'No hi ha franges lliures aquest dia. Prova un altre dia o una durada més curta.') : null,
        h('div', { class: 'franges' }, d.franges.map((f) => {
          const id = `hora-${f.hora.replace(':', '')}`;
          const radio = h('input', { type: 'radio', class: 'btn-check', name: 'hora', id, value: f.hora, disabled: !f.disponible, checked: f.hora === horaTriada, required: true,
            onChange: () => { horaTriada = f.hora; actualitzarResum(); } });
          const motiu = f.ocupada ? 'ocupada' : f.passada ? 'passada' : 'lliure';
          return [radio, h('label', { class: `btn ${f.disponible ? 'btn-outline-primary' : 'btn-outline-secondary'}`, for: id, title: `${f.hora} (${motiu})` },
            f.hora, f.disponible ? null : h('span', { class: 'visually-hidden' }, ` (${motiu})`))];
        })));
      actualitzarResum();
    } catch (e) {
      buidar(zonaFranges, h('div', { class: 'alert alert-danger', role: 'alert' }, e.message));
    }
  }

  const form = h('form', { novalidate: true, onSubmit: async (e) => {
    e.preventDefault();
    if (!validarFormulari(form)) return;
    if (!horaTriada) { error('Tria una hora d’inici.'); return; }
    const cos = { pista_id: pista.id, dia: inputDia.value, hora: horaTriada, durada: Number(selDurada.value) };
    await ambBotoOcupat(boto, async () => {
      try {
        if (reserva) await api.put('reserves', reserva.id, cos);
        else await api.post('reserves', cos);
        exit(reserva ? 'Reserva modificada correctament.' : 'Reserva confirmada! La trobaràs a «Les meves reserves».');
        navegar('/reserves');
      } catch (err) {
        if (err.errors) mostrarErrors(form, err.errors);
        error(err.message);
        if (err.status === 409) carregarFranges();
      }
    });
  } },
  h('div', { class: 'row g-3' },
    h('div', { class: 'col-12 col-md-6' }, h('label', { for: 'f-dia', class: 'form-label' }, 'Dia ', h('span', { class: 'text-danger', 'aria-hidden': 'true' }, '*')), inputDia,
      h('div', { class: 'form-text' }, 'Pots reservar fins a 30 dies vista.')),
    h('div', { class: 'col-12 col-md-6' }, h('label', { for: 'f-durada', class: 'form-label' }, 'Durada ', h('span', { class: 'text-danger', 'aria-hidden': 'true' }, '*')), selDurada)),
  h('div', { class: 'mt-3' }, zonaFranges),
  resum,
  h('div', { class: 'd-flex flex-wrap gap-2' }, boto,
    h('a', { href: reserva ? '#/reserves' : `#/installacio/${pista.installacio_id}`, class: 'btn btn-outline-secondary btn-lg' }, 'Cancel·lar')));

  inputDia.addEventListener('change', () => { if (inputDia.validity.valid) carregarFranges(); });
  selDurada.addEventListener('change', carregarFranges);

  buidar(main,
    h('nav', { 'aria-label': 'Ruta de navegació' }, h('ol', { class: 'breadcrumb' },
      h('li', { class: 'breadcrumb-item' }, h('a', { href: '#/' }, 'Pistes')),
      h('li', { class: 'breadcrumb-item' }, h('a', { href: `#/installacio/${pista.installacio_id}` }, pista.installacions.nom)),
      h('li', { class: 'breadcrumb-item active', 'aria-current': 'page' }, reserva ? 'Modificar reserva' : 'Reservar'))),
    h('h1', { class: 'h2' }, reserva ? 'Modificar reserva' : `Reservar ${pista.nom}`),
    h('p', { class: 'text-secondary' }, `${pista.installacions.nom} · ${ESPORTS[pista.esport]} · ${euros(pista.preu_hora)}/hora`),
    h('div', { class: 'card shadow-sm' }, h('div', { class: 'card-body' }, form)));
  await carregarFranges();
}
