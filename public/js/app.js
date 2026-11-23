// PistaYa · Single Page Application (SPA) amb renderització al client (CSR).
// Només hi ha un document HTML (index.html). La navegació canvia el fragment
// de l'URL (#/...) i el router pinta la vista corresponent sense recarregar.
import { h, buidar, icona } from './dom.js';
import { iniciarAuth, usuari, esAdmin, enCanviar, sortir, refrescarPerfil } from './auth.js';
import { error, exit, carregant } from './ui.js';
import { vistaInici } from './views/inici.js';
import { vistaInstallacio } from './views/installacio.js';
import { vistaReservar } from './views/reservar.js';
import { vistaMevesReserves } from './views/reserves.js';
import { vistaPerfil } from './views/perfil.js';
import { vistaEntrar, vistaRegistre } from './views/acces.js';
import { vistaAdminInstallacions, vistaAdminPistes, vistaAdminReserves } from './views/admin.js';

// Taula de rutes: patró → { vista, títol, accés }
const RUTES = [
  { patro: /^\/$/, vista: vistaInici, titol: 'Inici' },
  { patro: /^\/installacio\/(\d+)$/, vista: vistaInstallacio, titol: 'Instal·lació' },
  { patro: /^\/reservar\/(\d+)$/, vista: vistaReservar, titol: 'Reservar', acces: 'sessio' },
  { patro: /^\/reserves\/(\d+)\/editar$/, vista: (c, p) => vistaReservar(c, null, p[0]), titol: 'Modificar reserva', acces: 'sessio' },
  { patro: /^\/reserves$/, vista: vistaMevesReserves, titol: 'Les meves reserves', acces: 'sessio' },
  { patro: /^\/perfil$/, vista: vistaPerfil, titol: 'El meu perfil', acces: 'sessio' },
  { patro: /^\/entrar$/, vista: vistaEntrar, titol: 'Iniciar sessió' },
  { patro: /^\/registre$/, vista: vistaRegistre, titol: 'Crear compte' },
  { patro: /^\/admin\/installacions$/, vista: vistaAdminInstallacions, titol: 'Gestió d’instal·lacions', acces: 'admin' },
  { patro: /^\/admin\/pistes$/, vista: vistaAdminPistes, titol: 'Gestió de pistes', acces: 'admin' },
  { patro: /^\/admin\/reserves$/, vista: vistaAdminReserves, titol: 'Totes les reserves', acces: 'admin' },
];

const contingut = () => document.getElementById('contingut');
export const navegar = (ruta) => { location.hash = `#${ruta}`; };

async function encaminar() {
  const ruta = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const coincidencia = RUTES.map((r) => ({ r, m: ruta.match(r.patro) })).find((x) => x.m);
  const main = contingut();
  // Si l'usuari navega amb un diàleg obert, es tanca.
  bootstrap.Modal.getInstance(document.getElementById('modal-confirmar'))?.hide();

  if (!coincidencia) {
    document.title = 'Pàgina no trobada · PistaYa';
    buidar(main, h('h1', { tabindex: '-1' }, 'Pàgina no trobada'),
      h('p', {}, 'L’adreça no existeix. '), h('a', { href: '#/', class: 'btn btn-primary' }, 'Tornar a l’inici'));
    return enfocar();
  }
  const { r, m } = coincidencia;

  // Autorització a la capa de presentació (només per a la navegació; la
  // seguretat real es comprova a l'API i a la base de dades).
  if (r.acces && !usuari()) {
    sessionStorage.setItem('despresEntrar', ruta);
    error('Has d’iniciar sessió per accedir a aquesta pàgina.');
    return navegar('/entrar');
  }
  // El rol es torna a consultar al servidor abans d'obrir l'administració.
  if (r.acces === 'admin') await refrescarPerfil();
  if (r.acces === 'admin' && !esAdmin()) {
    error('Aquesta secció és només per a l’administració.');
    return navegar('/');
  }

  document.title = `${r.titol} · PistaYa`;
  marcarMenu(ruta);
  buidar(main, carregant());
  try {
    await r.vista(main, m.slice(1));
  } catch (e) {
    buidar(main, h('div', { class: 'alert alert-danger', role: 'alert' }, e.message || 'No s’ha pogut carregar la pàgina.'));
  }
  enfocar();
}

// Accessibilitat: en canviar de vista, el focus va al títol principal.
function enfocar() {
  const t = contingut().querySelector('h1');
  if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: false }); }
  window.scrollTo(0, 0);
}

function marcarMenu(ruta) {
  document.querySelectorAll('#menu a.nav-link').forEach((a) => {
    const actiu = a.getAttribute('href') === `#${ruta}`;
    a.classList.toggle('active', actiu);
    if (actiu) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function pintarMenu() {
  const u = usuari();
  const enllac = (ruta, text, ic) => h('li', { class: 'nav-item' }, h('a', { class: 'nav-link', href: `#${ruta}` }, icona(ic), ' ', text));
  const items = [enllac('/', 'Pistes', 'grid')];
  if (u) items.push(enllac('/reserves', 'Les meves reserves', 'calendar-check'));
  if (esAdmin()) {
    items.push(h('li', { class: 'nav-item dropdown' },
      h('a', { class: 'nav-link dropdown-toggle', href: '#', role: 'button', 'data-bs-toggle': 'dropdown', 'aria-expanded': 'false' }, icona('shield-lock'), ' Administració'),
      h('ul', { class: 'dropdown-menu' },
        h('li', {}, h('a', { class: 'dropdown-item', href: '#/admin/installacions' }, 'Instal·lacions')),
        h('li', {}, h('a', { class: 'dropdown-item', href: '#/admin/pistes' }, 'Pistes')),
        h('li', {}, h('a', { class: 'dropdown-item', href: '#/admin/reserves' }, 'Totes les reserves')))));
  }
  buidar(document.getElementById('menu'), ...items);

  const zona = document.getElementById('zona-usuari');
  if (u) {
    buidar(zona,
      h('a', { href: '#/perfil', class: 'btn btn-outline-light btn-sm me-2' }, icona('person-circle'), ' ', u.nom, esAdmin() ? h('span', { class: 'badge text-bg-warning ms-2' }, 'admin') : null),
      h('button', { type: 'button', class: 'btn btn-light btn-sm', onClick: async () => { await sortir(); exit('Has tancat la sessió.'); navegar('/'); } }, 'Sortir'));
  } else {
    buidar(zona,
      h('a', { href: '#/entrar', class: 'btn btn-outline-light btn-sm me-2' }, 'Entrar'),
      h('a', { href: '#/registre', class: 'btn btn-light btn-sm' }, 'Crear compte'));
  }
  marcarMenu((location.hash.replace(/^#/, '') || '/'));
}

async function arrencar() {
  try {
    await iniciarAuth();
  } catch {
    error('No s’ha pogut connectar amb el servei d’autenticació.');
  }
  pintarMenu();
  enCanviar(() => pintarMenu());
  window.addEventListener('hashchange', encaminar);
  // Tornada de GitHub (OAuth): Supabase deixa ?code=... a l'URL.
  if (location.search.includes('code=')) history.replaceState(null, '', `${location.pathname}#/`);
  await encaminar();
}

arrencar();
