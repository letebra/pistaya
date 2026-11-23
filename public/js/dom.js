// Creació d'elements del DOM de manera segura (protecció XSS a la capa de
// presentació): el text sempre s'insereix amb textContent, mai amb innerHTML.
export function h(etiqueta, atributs = {}, ...fills) {
  const el = document.createElement(etiqueta);
  for (const [clau, valor] of Object.entries(atributs || {})) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (clau.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(clau.slice(2).toLowerCase(), valor);
    } else if (clau === 'class') {
      el.className = valor;
    } else if (clau === 'dataset') {
      Object.assign(el.dataset, valor);
    } else if (clau === 'value') {
      el.value = valor;
    } else if (valor === true) {
      el.setAttribute(clau, '');
    } else {
      el.setAttribute(clau, String(valor));
    }
  }
  afegir(el, fills);
  return el;
}

function afegir(el, fills) {
  for (const fill of fills.flat(Infinity)) {
    if (fill === null || fill === undefined || fill === false) continue;
    el.append(fill instanceof Node ? fill : document.createTextNode(String(fill)));
  }
}

export const icona = (nom) => h('i', { class: `bi bi-${nom}`, 'aria-hidden': 'true' });

export function buidar(el, ...fills) {
  el.replaceChildren();
  afegir(el, fills);
  return el;
}

export const ESPORTS = { padel: 'Pàdel', tennis: 'Tennis', futbol: 'Futbol', basquet: 'Bàsquet' };
export const TIPUS = { coberta: 'Coberta', exterior: 'Exterior' };

export const euros = (n) => new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Number(n));

export function dataLlarga(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return new Intl.DateTimeFormat('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(Date.UTC(a, m - 1, d, 12)));
}

export function avui(offsetDies = 0) {
  const d = new Date(Date.now() + offsetDies * 86400000);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return p; // AAAA-MM-DD
}
