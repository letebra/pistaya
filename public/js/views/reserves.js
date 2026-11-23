// Vista: llistat de les reserves de la persona connectada (pista + instal·lació).
import { h, buidar, icona, ESPORTS, euros, dataLlarga } from '../dom.js';
import { api } from '../api.js';
import { exit, error, confirmar, buit } from '../ui.js';

export async function vistaMevesReserves(main) {
  const reserves = await api.get('reserves', { meves: '1' });
  const ara = new Date();
  const properes = reserves.filter((r) => r.estat === 'confirmada' && new Date(r.fi) >= ara).sort((a, b) => a.inici.localeCompare(b.inici));
  const historial = reserves.filter((r) => !properes.includes(r));

  const recarregar = () => vistaMevesReserves(main).catch((e) => error(e.message));

  async function cancellar(r) {
    if (!await confirmar({ titol: 'Cancel·lar la reserva?', text: `${r.pistes.nom} · ${dataLlarga(r.dia)} a les ${r.hora}. La franja quedarà lliure per a altres persones.`, boto: 'Sí, cancel·lar' })) return;
    try { await api.patch('reserves', r.id); exit('Reserva cancel·lada.'); recarregar(); } catch (e) { error(e.message); }
  }
  async function eliminar(r) {
    if (!await confirmar({ titol: 'Eliminar de l’historial?', text: 'Aquesta acció no es pot desfer.', boto: 'Eliminar' })) return;
    try { await api.del('reserves', r.id); exit('Reserva eliminada de l’historial.'); recarregar(); } catch (e) { error(e.message); }
  }

  const fila = (r, accions) => h('li', { class: 'list-group-item d-flex flex-column flex-md-row gap-2 justify-content-between align-items-md-center' },
    h('div', {},
      h('p', { class: 'fw-semibold mb-1' }, `${r.pistes.nom} · ${r.pistes.installacions.nom}`),
      h('p', { class: 'mb-0 text-secondary small' }, icona('calendar-event'), ` ${dataLlarga(r.dia)} · ${r.hora}–${r.hora_fi} · ${ESPORTS[r.pistes.esport]} · ${euros(r.preu_total)}`)),
    h('div', { class: 'd-flex gap-2 align-items-center' },
      h('span', { class: `badge ${r.estat === 'confirmada' ? 'text-bg-success' : 'text-bg-secondary'}` }, r.estat === 'confirmada' ? (new Date(r.fi) < ara ? 'Jugada' : 'Confirmada') : 'Cancel·lada'),
      accions));

  buidar(main,
    h('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-3' },
      h('h1', { class: 'h2 mb-0' }, 'Les meves reserves'),
      h('a', { href: '#/', class: 'btn btn-primary' }, icona('plus-lg'), ' Nova reserva')),
    h('h2', { class: 'h5 mt-3' }, `Properes (${properes.length})`),
    properes.length ? h('ul', { class: 'list-group mb-4' }, properes.map((r) => fila(r, r.es_pot_canviar
      ? [h('a', { href: `#/reserves/${r.id}/editar`, class: 'btn btn-sm btn-outline-primary' }, icona('pencil'), ' Modificar'),
         h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', onClick: () => cancellar(r) }, icona('x-circle'), ' Cancel·lar')]
      : h('span', { class: 'small text-secondary' }, 'Menys de 2 h: ja no es pot canviar'))))
      : buit('No tens cap reserva pendent.', h('a', { href: '#/', class: 'btn btn-primary btn-sm' }, 'Reservar una pista')),
    h('h2', { class: 'h5 mt-4' }, `Historial (${historial.length})`),
    historial.length ? h('ul', { class: 'list-group' }, historial.map((r) => fila(r,
      h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onClick: () => eliminar(r), 'aria-label': `Eliminar reserva de ${r.pistes.nom} del ${r.dia}` }, icona('trash'), ' Eliminar'))))
      : h('p', { class: 'text-secondary' }, 'Encara no hi ha historial.'));
}
