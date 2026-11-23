// Vistes d'administració (només rol admin): CRUD d'instal·lacions i pistes,
// i consulta/eliminació de totes les reserves.
import { h, buidar, icona, ESPORTS, TIPUS, euros, dataLlarga, avui } from '../dom.js';
import { api } from '../api.js';
import { exit, error, confirmar, camp, validarFormulari, mostrarErrors, ambBotoOcupat, buit } from '../ui.js';

// Formulari genèric dins d'una targeta (crear o editar).
function panellFormulari({ titol, camps, enDesar, enTancar }) {
  const boto = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Desar');
  const form = h('form', { novalidate: true, onSubmit: async (e) => {
    e.preventDefault();
    if (!validarFormulari(form)) return;
    await ambBotoOcupat(boto, async () => {
      try { await enDesar(Object.fromEntries(new FormData(form)), form); } catch (err) {
        if (err.errors) mostrarErrors(form, err.errors);
        error(err.message);
      }
    });
  } }, camps, h('div', { class: 'd-flex gap-2' }, boto, h('button', { type: 'button', class: 'btn btn-outline-secondary', onClick: enTancar }, 'Cancel·lar')));
  const panell = h('section', { class: 'card shadow-sm mb-4 border-primary', 'aria-labelledby': 'titol-form' },
    h('div', { class: 'card-body' }, h('h2', { class: 'h5', id: 'titol-form', tabindex: '-1' }, titol), form));
  setTimeout(() => panell.querySelector('input,select')?.focus(), 50);
  return panell;
}

const taula = (capcalera, files) => h('div', { class: 'table-responsive' },
  h('table', { class: 'table table-hover align-middle bg-white' },
    h('thead', { class: 'table-light' }, h('tr', {}, capcalera.map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, files)));

// ---------------- Instal·lacions ----------------
export async function vistaAdminInstallacions(main) {
  const llista = await api.get('installacions');
  const zonaForm = h('div');
  const recarregar = () => vistaAdminInstallacions(main).catch((e) => error(e.message));

  function obrirForm(i = null) {
    buidar(zonaForm, panellFormulari({
      titol: i ? `Editar «${i.nom}»` : 'Nova instal·lació',
      camps: h('div', { class: 'row' },
        h('div', { class: 'col-md-6' }, camp({ nom: 'nom', etiqueta: 'Nom', valor: i?.nom, obligatori: true, minlength: 3, maxlength: 80 })),
        h('div', { class: 'col-md-6' }, camp({ nom: 'ciutat', etiqueta: 'Ciutat', valor: i?.ciutat, obligatori: true, minlength: 2, maxlength: 60 })),
        h('div', { class: 'col-12' }, camp({ nom: 'adreca', etiqueta: 'Adreça', valor: i?.adreca, obligatori: true, minlength: 5, maxlength: 120 })),
        h('div', { class: 'col-6' }, camp({ nom: 'obertura', etiqueta: 'Obertura', tipus: 'time', valor: i?.obertura?.slice(0, 5) ?? '08:00', obligatori: true })),
        h('div', { class: 'col-6' }, camp({ nom: 'tancament', etiqueta: 'Tancament', tipus: 'time', valor: i?.tancament?.slice(0, 5) ?? '23:00', obligatori: true }))),
      enDesar: async (dades) => {
        if (i) await api.put('installacions', i.id, dades); else await api.post('installacions', dades);
        exit(i ? 'Instal·lació actualitzada.' : 'Instal·lació creada correctament.');
        recarregar();
      },
      enTancar: () => buidar(zonaForm),
    }));
  }

  async function eliminar(i) {
    if (!await confirmar({ titol: 'Eliminar la instal·lació?', text: `«${i.nom}». Aquesta acció no es pot desfer.` })) return;
    try { await api.del('installacions', i.id); exit('Instal·lació eliminada.'); recarregar(); } catch (e) { error(e.message); }
  }

  buidar(main,
    h('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-3' },
      h('h1', { class: 'h2 mb-0' }, 'Gestió d’instal·lacions'),
      h('button', { type: 'button', class: 'btn btn-primary', onClick: () => obrirForm() }, icona('plus-lg'), ' Nova instal·lació')),
    zonaForm,
    llista.length ? taula(['Nom', 'Ciutat', 'Horari', 'Pistes', 'Accions'], llista.map((i) => h('tr', {},
      h('td', {}, h('strong', {}, i.nom), h('div', { class: 'small text-secondary' }, i.adreca)),
      h('td', {}, i.ciutat),
      h('td', {}, `${i.obertura.slice(0, 5)}–${i.tancament.slice(0, 5)}`),
      h('td', {}, h('a', { href: '#/admin/pistes', onClick: () => sessionStorage.setItem('filtreInstallacio', i.id) }, `${i.pistes.length}`)),
      h('td', { class: 'text-nowrap' },
        h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary me-1', onClick: () => obrirForm(i), 'aria-label': `Editar ${i.nom}` }, icona('pencil'), ' Editar'),
        h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', onClick: () => eliminar(i), 'aria-label': `Eliminar ${i.nom}` }, icona('trash'), ' Eliminar'))))) : buit('Encara no hi ha instal·lacions.'));
}

// ---------------- Pistes ----------------
export async function vistaAdminPistes(main) {
  const installacions = await api.get('installacions');
  const filtreInicial = sessionStorage.getItem('filtreInstallacio') || '';
  sessionStorage.removeItem('filtreInstallacio');
  const filtre = h('select', { id: 'filtre-inst', class: 'form-select' }, h('option', { value: '' }, 'Totes les instal·lacions'),
    installacions.map((i) => h('option', { value: i.id, selected: String(i.id) === filtreInicial }, i.nom)));
  const zonaForm = h('div');
  const zonaTaula = h('div', { 'aria-live': 'polite' });

  async function pintar() {
    try {
      const pistes = await api.get('pistes', { installacio_id: filtre.value });
      buidar(zonaTaula, pistes.length ? taula(['Pista', 'Instal·lació', 'Esport', 'Preu/h', 'Estat', 'Accions'], pistes.map((p) => h('tr', {},
        h('td', {}, h('strong', {}, p.nom), h('div', { class: 'small text-secondary' }, TIPUS[p.tipus])),
        h('td', {}, p.installacions.nom),
        h('td', {}, ESPORTS[p.esport]),
        h('td', {}, euros(p.preu_hora)),
        h('td', {}, h('span', { class: `badge ${p.activa ? 'text-bg-success' : 'text-bg-secondary'}` }, p.activa ? 'Activa' : 'Inactiva')),
        h('td', { class: 'text-nowrap' },
          h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary me-1', onClick: () => obrirForm(p), 'aria-label': `Editar ${p.nom} de ${p.installacions.nom}` }, icona('pencil'), ' Editar'),
          h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', onClick: () => eliminar(p), 'aria-label': `Eliminar ${p.nom} de ${p.installacions.nom}` }, icona('trash'), ' Eliminar')))))
        : buit('No hi ha pistes amb aquest filtre.'));
    } catch (e) { error(e.message); }
  }

  function obrirForm(p = null) {
    buidar(zonaForm, panellFormulari({
      titol: p ? `Editar «${p.nom}»` : 'Nova pista',
      camps: h('div', { class: 'row' },
        h('div', { class: 'col-md-6' }, camp({ nom: 'installacio_id', etiqueta: 'Instal·lació', obligatori: true, valor: p?.installacio_id ?? filtre.value,
          opcions: [['', 'Tria una instal·lació…'], ...installacions.map((i) => [i.id, i.nom])] })),
        h('div', { class: 'col-md-6' }, camp({ nom: 'nom', etiqueta: 'Nom de la pista', valor: p?.nom, obligatori: true, minlength: 2, maxlength: 60 })),
        h('div', { class: 'col-md-4' }, camp({ nom: 'esport', etiqueta: 'Esport', obligatori: true, valor: p?.esport ?? 'padel', opcions: Object.entries(ESPORTS) })),
        h('div', { class: 'col-md-4' }, camp({ nom: 'tipus', etiqueta: 'Tipus', obligatori: true, valor: p?.tipus ?? 'coberta', opcions: Object.entries(TIPUS) })),
        h('div', { class: 'col-md-4' }, camp({ nom: 'preu_hora', etiqueta: 'Preu per hora (€)', tipus: 'number', valor: p?.preu_hora ?? '', obligatori: true, min: '0.5', max: '200', step: '0.5', ajuda: 'Ha de ser més gran que 0.' })),
        h('div', { class: 'col-12 mb-3' }, h('div', { class: 'form-check form-switch' },
          h('input', { class: 'form-check-input', type: 'checkbox', role: 'switch', id: 'f-activa', name: 'activa', checked: p ? p.activa : true }),
          h('label', { class: 'form-check-label', for: 'f-activa' }, 'Pista activa (es pot reservar)')))),
      enDesar: async (dades) => {
        dades.activa = dades.activa === 'on';
        if (p) await api.put('pistes', p.id, dades); else await api.post('pistes', dades);
        exit(p ? 'Pista actualitzada.' : 'Pista creada correctament.');
        buidar(zonaForm);
        pintar();
      },
      enTancar: () => buidar(zonaForm),
    }));
  }

  async function eliminar(p) {
    if (!await confirmar({ titol: 'Eliminar la pista?', text: `«${p.nom}» de ${p.installacions.nom}. Només es pot eliminar si no té reserves.` })) return;
    try { await api.del('pistes', p.id); exit('Pista eliminada.'); pintar(); } catch (e) { error(e.message); }
  }

  filtre.addEventListener('change', pintar);
  buidar(main,
    h('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-3' },
      h('h1', { class: 'h2 mb-0' }, 'Gestió de pistes'),
      h('button', { type: 'button', class: 'btn btn-primary', onClick: () => obrirForm() }, icona('plus-lg'), ' Nova pista')),
    h('div', { class: 'mb-3 ample-360' }, h('label', { for: 'filtre-inst', class: 'form-label' }, 'Filtrar per instal·lació'), filtre),
    zonaForm, zonaTaula);
  await pintar();
}

// ---------------- Reserves (totes) ----------------
export async function vistaAdminReserves(main) {
  const dia = h('input', { id: 'filtre-dia', type: 'date', class: 'form-control', value: '' });
  const zona = h('div', { 'aria-live': 'polite' });

  async function pintar() {
    try {
      const reserves = await api.get('reserves', { dia: dia.value });
      buidar(zona, h('p', { class: 'small text-secondary' }, `${reserves.length} reserva/es`),
        reserves.length ? taula(['Dia i hora', 'Persona', 'Pista', 'Preu', 'Estat', ''], reserves.map((r) => h('tr', {},
          h('td', {}, `${dataLlarga(r.dia)}`, h('div', { class: 'small text-secondary' }, `${r.hora}–${r.hora_fi}`)),
          h('td', {}, r.usuaris?.nom ?? '—', h('div', { class: 'small text-secondary' }, r.usuaris?.email ?? '')),
          h('td', {}, r.pistes.nom, h('div', { class: 'small text-secondary' }, r.pistes.installacions.nom)),
          h('td', {}, euros(r.preu_total)),
          h('td', {}, h('span', { class: `badge ${r.estat === 'confirmada' ? 'text-bg-success' : 'text-bg-secondary'}` }, r.estat)),
          h('td', { class: 'text-nowrap' },
            r.estat === 'confirmada' && new Date(r.inici) > new Date()
              ? h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary me-1', onClick: () => cancellar(r) }, 'Cancel·lar') : null,
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', onClick: () => eliminar(r), 'aria-label': `Eliminar reserva ${r.id}` }, icona('trash')))))) : buit('No hi ha reserves.'));
    } catch (e) { error(e.message); }
  }
  async function cancellar(r) {
    if (!await confirmar({ titol: 'Cancel·lar la reserva?', text: `${r.usuaris?.nom} · ${r.pistes.nom} · ${r.dia} ${r.hora}`, boto: 'Cancel·lar reserva', tipus: 'warning' })) return;
    try { await api.patch('reserves', r.id); exit('Reserva cancel·lada.'); pintar(); } catch (e) { error(e.message); }
  }
  async function eliminar(r) {
    if (!await confirmar({ titol: 'Eliminar la reserva?', text: 'S’esborrarà definitivament.' })) return;
    try { await api.del('reserves', r.id); exit('Reserva eliminada.'); pintar(); } catch (e) { error(e.message); }
  }
  dia.addEventListener('change', pintar);
  buidar(main, h('h1', { class: 'h2' }, 'Totes les reserves'),
    h('div', { class: 'row g-2 align-items-end mb-3' },
      h('div', { class: 'col-auto' }, h('label', { for: 'filtre-dia', class: 'form-label' }, 'Filtrar per dia'), dia),
      h('div', { class: 'col-auto' }, h('button', { type: 'button', class: 'btn btn-outline-secondary', onClick: () => { dia.value = avui(); pintar(); } }, 'Avui')),
      h('div', { class: 'col-auto' }, h('button', { type: 'button', class: 'btn btn-outline-secondary', onClick: () => { dia.value = ''; pintar(); } }, 'Totes'))),
    zona);
  await pintar();
}
