// Vista: llistat d'instal·lacions amb les seves pistes, cerca i filtre per esport.
import { h, buidar, icona, ESPORTS } from '../dom.js';
import { api } from '../api.js';
import { buit } from '../ui.js';

export async function vistaInici(main) {
  const installacions = await api.get('installacions');

  const cerca = h('input', { id: 'cerca', type: 'search', class: 'form-control', placeholder: 'Nom o ciutat', maxlength: '60' });
  const esport = h('select', { id: 'filtre-esport', class: 'form-select' },
    h('option', { value: '' }, 'Tots els esports'),
    Object.entries(ESPORTS).map(([v, t]) => h('option', { value: v }, t)));
  const resultat = h('div', { class: 'row g-3', 'aria-live': 'polite' });
  const comptador = h('p', { class: 'text-secondary small mb-2', role: 'status' });

  function pintar() {
    const text = cerca.value.trim().toLowerCase();
    const filtrades = installacions
      .map((i) => ({ ...i, pistesFiltrades: i.pistes.filter((p) => p.activa && (!esport.value || p.esport === esport.value)) }))
      .filter((i) => i.pistesFiltrades.length)
      .filter((i) => !text || i.nom.toLowerCase().includes(text) || i.ciutat.toLowerCase().includes(text));
    comptador.textContent = `${filtrades.length} instal·lació/ns amb pistes disponibles`;
    if (!filtrades.length) return buidar(resultat, h('div', { class: 'col-12' }, buit('Cap instal·lació coincideix amb la cerca.')));
    buidar(resultat, filtrades.map((i) => h('div', { class: 'col-12 col-md-6 col-lg-4' },
      h('article', { class: 'card h-100 shadow-sm targeta-installacio' },
        h('div', { class: 'card-body d-flex flex-column' },
          h('h2', { class: 'h5 card-title' }, i.nom),
          h('p', { class: 'card-text text-secondary mb-2' }, icona('geo-alt'), ' ', i.adreca, ', ', i.ciutat),
          h('p', { class: 'small mb-2' }, icona('clock'), ` Obert de ${i.obertura.slice(0, 5)} a ${i.tancament.slice(0, 5)}`),
          h('ul', { class: 'list-inline mb-3' },
            [...new Set(i.pistesFiltrades.map((p) => p.esport))].map((e) => h('li', { class: 'list-inline-item badge rounded-pill text-bg-light border' }, ESPORTS[e]))),
          h('p', { class: 'small text-secondary mt-auto mb-2' }, `${i.pistesFiltrades.length} pista/es · des de ${Math.min(...i.pistesFiltrades.map((p) => Number(p.preu_hora)))} €/h`),
          h('a', { href: `#/installacio/${i.id}`, class: 'btn btn-primary', 'aria-label': `Veure pistes de ${i.nom}` }, 'Veure pistes ', icona('arrow-right')))))));
  }
  cerca.addEventListener('input', pintar);
  esport.addEventListener('change', pintar);

  buidar(main,
    h('section', { class: 'hero rounded-4 p-4 p-md-5 mb-4' },
      h('h1', { class: 'display-6 fw-bold' }, 'Reserva la teva pista en segons'),
      h('p', { class: 'lead mb-0' }, 'Pàdel, tennis, futbol i bàsquet al Vallès. Tria instal·lació, dia i hora, i juga.')),
    h('form', { class: 'row g-2 align-items-end mb-3', role: 'search', onSubmit: (e) => e.preventDefault() },
      h('div', { class: 'col-12 col-md-6' }, h('label', { for: 'cerca', class: 'form-label' }, 'Cerca instal·lació'), cerca),
      h('div', { class: 'col-12 col-md-4' }, h('label', { for: 'filtre-esport', class: 'form-label' }, 'Esport'), esport)),
    comptador,
    resultat);
  pintar();
}
