// Components d'interfície: missatges (toasts), confirmacions, errors de formulari.
import { h, icona } from './dom.js';

// ---- Missatges de feedback (zona aria-live per a lectors de pantalla) ----
export function avis(missatge, tipus = 'success') {
  const zona = document.getElementById('avisos');
  const icones = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill', warning: 'exclamation-circle-fill', info: 'info-circle-fill' };
  const toast = h('div', { class: `toast align-items-center text-bg-${tipus} border-0`, role: tipus === 'danger' ? 'alert' : 'status', 'aria-atomic': 'true' },
    h('div', { class: 'd-flex' },
      h('div', { class: 'toast-body' }, icona(icones[tipus] || 'info-circle-fill'), ' ', missatge),
      h('button', { type: 'button', class: 'btn-close btn-close-white me-2 m-auto', 'data-bs-dismiss': 'toast', 'aria-label': 'Tancar' })));
  zona.append(toast);
  const t = new bootstrap.Toast(toast, { delay: tipus === 'danger' ? 8000 : 4500 });
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  t.show();
}

export const exit = (m) => avis(m, 'success');
export const error = (m) => avis(m, 'danger');

// ---- Diàleg de confirmació (prevenció d'errors en accions destructives) ----
export function confirmar({ titol, text, boto = 'Eliminar', tipus = 'danger' }) {
  return new Promise((resol) => {
    const modalEl = document.getElementById('modal-confirmar');
    modalEl.querySelector('.modal-title').textContent = titol;
    modalEl.querySelector('.modal-body p').textContent = text;
    const ok = modalEl.querySelector('[data-confirmar]');
    ok.textContent = boto;
    ok.className = `btn btn-${tipus}`;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    let resultat = false;
    const enAcceptar = () => { resultat = true; modal.hide(); };
    ok.addEventListener('click', enAcceptar, { once: true });
    modalEl.addEventListener('hidden.bs.modal', () => {
      ok.removeEventListener('click', enAcceptar);
      resol(resultat);
    }, { once: true });
    modal.show();
  });
}

// ---- Errors de validació als camps del formulari ----
export function netejarErrors(form) {
  form.querySelectorAll('.is-invalid').forEach((c) => c.classList.remove('is-invalid'));
  form.querySelectorAll('.invalid-feedback[data-servidor]').forEach((e) => e.remove());
}

export function mostrarErrors(form, errors = {}) {
  let primer = null;
  for (const [camp, missatge] of Object.entries(errors)) {
    const input = form.elements[camp];
    if (!input) continue;
    input.classList.add('is-invalid');
    const fb = h('div', { class: 'invalid-feedback', 'data-servidor': '1', id: `err-${camp}` }, missatge);
    input.setAttribute('aria-describedby', `err-${camp}`);
    input.insertAdjacentElement('afterend', fb);
    primer ??= input;
  }
  primer?.focus();
}

// Validació a la capa de presentació (HTML5 + missatges en català).
export function validarFormulari(form) {
  netejarErrors(form);
  const errors = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === 'button' || el.type === 'submit') continue;
    if (el.validity.valid) continue;
    const etiqueta = form.querySelector(`label[for="${el.id}"]`)?.textContent.replace('*', '').trim() || el.name;
    if (el.validity.valueMissing) errors[el.name] = `${etiqueta} és obligatori.`;
    else if (el.validity.tooShort) errors[el.name] = `${etiqueta}: mínim ${el.minLength} caràcters.`;
    else if (el.validity.tooLong) errors[el.name] = `${etiqueta}: màxim ${el.maxLength} caràcters.`;
    else if (el.validity.typeMismatch) errors[el.name] = `${etiqueta} no té un format vàlid.`;
    else if (el.validity.patternMismatch) errors[el.name] = el.title || `${etiqueta} no té un format vàlid.`;
    else if (el.validity.rangeUnderflow || el.validity.rangeOverflow) errors[el.name] = `${etiqueta} ha d’estar entre ${el.min} i ${el.max}.`;
    else errors[el.name] = `${etiqueta} no és vàlid.`;
  }
  if (Object.keys(errors).length) { mostrarErrors(form, errors); return false; }
  return true;
}

// Desactiva el botó mentre s'envia (evita enviaments duplicats).
export async function ambBotoOcupat(boto, feina) {
  const text = boto.textContent;
  boto.disabled = true;
  boto.replaceChildren(h('span', { class: 'spinner-border spinner-border-sm me-2', 'aria-hidden': 'true' }), 'Enviant…');
  try { return await feina(); } finally { boto.disabled = false; boto.textContent = text; }
}

export const carregant = (text = 'Carregant…') =>
  h('div', { class: 'd-flex align-items-center gap-2 text-secondary py-4', role: 'status' },
    h('span', { class: 'spinner-border spinner-border-sm', 'aria-hidden': 'true' }), text);

export const buit = (text, accio = null) =>
  h('div', { class: 'text-center text-secondary border rounded-3 p-4 bg-white' }, h('p', { class: 'mb-2' }, text), accio);

// Camp de formulari amb etiqueta associada (accessibilitat).
export function camp({ nom, etiqueta, tipus = 'text', valor = '', obligatori = false, ajuda = null, opcions = null, ...extra }) {
  const id = `f-${nom}`;
  const attrs = { id, name: nom, class: opcions ? 'form-select' : 'form-control', required: obligatori, 'aria-describedby': ajuda ? `${id}-ajuda` : null, ...extra };
  const input = opcions
    ? h('select', attrs, opcions.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valor) }, t)))
    : h('input', { ...attrs, type: tipus, value: valor ?? '' });
  return h('div', { class: 'mb-3' },
    h('label', { for: id, class: 'form-label' }, etiqueta, obligatori ? h('span', { class: 'text-danger', 'aria-hidden': 'true' }, ' *') : null),
    input,
    ajuda ? h('div', { id: `${id}-ajuda`, class: 'form-text' }, ajuda) : null);
}
