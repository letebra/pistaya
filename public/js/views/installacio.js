// Vista: detall d'una instal·lació i les seves pistes (dades de dues taules).
import { h, buidar, icona, ESPORTS, TIPUS, euros } from '../dom.js';
import { api } from '../api.js';
import { usuari } from '../auth.js';

export async function vistaInstallacio(main, [id]) {
  const i = await api.get('installacions', { id });
  const pistes = [...i.pistes].sort((a, b) => a.nom.localeCompare(b.nom));
  buidar(main,
    h('nav', { 'aria-label': 'Ruta de navegació' }, h('ol', { class: 'breadcrumb' },
      h('li', { class: 'breadcrumb-item' }, h('a', { href: '#/' }, 'Pistes')),
      h('li', { class: 'breadcrumb-item active', 'aria-current': 'page' }, i.nom))),
    h('h1', { class: 'h2' }, i.nom),
    h('p', { class: 'text-secondary' }, icona('geo-alt'), ` ${i.adreca}, ${i.ciutat} · `, icona('clock'), ` ${i.obertura.slice(0, 5)}–${i.tancament.slice(0, 5)}`),
    usuari() ? null : h('div', { class: 'alert alert-info' }, icona('info-circle'), ' Per reservar has d’', h('a', { href: '#/entrar' }, 'iniciar sessió'), ' o ', h('a', { href: '#/registre' }, 'crear un compte'), '.'),
    h('div', { class: 'row g-3' }, pistes.map((p) => h('div', { class: 'col-12 col-sm-6 col-lg-4' },
      h('article', { class: `card h-100 ${p.activa ? '' : 'opacity-75'}` },
        h('div', { class: 'card-body' },
          h('h2', { class: 'h5' }, p.nom),
          h('p', { class: 'mb-1' }, `${ESPORTS[p.esport]} · ${TIPUS[p.tipus]}`),
          h('p', { class: 'fw-semibold' }, `${euros(p.preu_hora)} / hora`),
          p.activa
            ? h('a', { href: `#/reservar/${p.id}`, class: 'btn btn-primary w-100' }, icona('calendar-plus'), ' Reservar')
            : h('p', { class: 'badge text-bg-secondary' }, 'No disponible')))))));
}
