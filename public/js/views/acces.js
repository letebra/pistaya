// Vistes: iniciar sessió i crear compte (usuari/contrasenya o GitHub).
import { h, buidar, icona } from '../dom.js';
import { entrar, registrar, entrarAmbGithub, usuari } from '../auth.js';
import { exit, error, camp, validarFormulari, ambBotoOcupat } from '../ui.js';
import { navegar } from '../app.js';

const botoGithub = () => h('button', { type: 'button', class: 'btn btn-dark w-100', onClick: async () => {
  try { await entrarAmbGithub(); } catch (e) { error(e.message); }
} }, icona('github'), ' Continuar amb GitHub');

const separador = () => h('div', { class: 'd-flex align-items-center gap-2 my-3 text-secondary' },
  h('hr', { class: 'flex-grow-1' }), h('span', { class: 'small' }, 'o'), h('hr', { class: 'flex-grow-1' }));

function destinacio() {
  const r = sessionStorage.getItem('despresEntrar') || '/';
  sessionStorage.removeItem('despresEntrar');
  return r;
}

export async function vistaEntrar(main) {
  if (usuari()) return navegar('/');
  const boto = h('button', { type: 'submit', class: 'btn btn-primary w-100' }, 'Entrar');
  const form = h('form', { novalidate: true, onSubmit: async (e) => {
    e.preventDefault();
    if (!validarFormulari(form)) return;
    await ambBotoOcupat(boto, async () => {
      try {
        const u = await entrar(form.email.value.trim(), form.contrasenya.value);
        exit(`Hola, ${u?.nom ?? ''}! Has iniciat sessió.`);
        navegar(destinacio());
      } catch (err) { error(err.message); form.contrasenya.value = ''; form.contrasenya.focus(); }
    });
  } },
  camp({ nom: 'email', etiqueta: 'Correu electrònic', tipus: 'email', obligatori: true, autocomplete: 'email', maxlength: 120 }),
  camp({ nom: 'contrasenya', etiqueta: 'Contrasenya', tipus: 'password', obligatori: true, autocomplete: 'current-password' }),
  boto);
  buidar(main, h('div', { class: 'targeta-acces mx-auto' },
    h('h1', { class: 'h3 mb-3' }, 'Iniciar sessió'),
    h('div', { class: 'card shadow-sm' }, h('div', { class: 'card-body p-4' }, botoGithub(), separador(), form,
      h('p', { class: 'mt-3 mb-0 small text-center' }, 'No tens compte? ', h('a', { href: '#/registre' }, 'Crea’n un'))))));
}

export async function vistaRegistre(main) {
  if (usuari()) return navegar('/');
  const boto = h('button', { type: 'submit', class: 'btn btn-primary w-100' }, 'Crear compte');
  const form = h('form', { novalidate: true, onSubmit: async (e) => {
    e.preventDefault();
    if (!validarFormulari(form)) return;
    if (form.contrasenya.value !== form.repetir.value) {
      form.repetir.classList.add('is-invalid');
      error('Les contrasenyes no coincideixen.');
      form.repetir.focus();
      return;
    }
    await ambBotoOcupat(boto, async () => {
      try {
        const r = await registrar(form.nom.value.trim(), form.email.value.trim(), form.contrasenya.value);
        if (r.necessitaConfirmacio) {
          exit('Compte creat. Revisa el correu per confirmar-lo i després inicia sessió.');
          navegar('/entrar');
        } else {
          exit('Compte creat! Ja pots reservar.');
          navegar(destinacio());
        }
      } catch (err) { error(err.message); }
    });
  } },
  camp({ nom: 'nom', etiqueta: 'Nom', obligatori: true, minlength: 2, maxlength: 80, autocomplete: 'name' }),
  camp({ nom: 'email', etiqueta: 'Correu electrònic', tipus: 'email', obligatori: true, autocomplete: 'email', maxlength: 120 }),
  camp({ nom: 'contrasenya', etiqueta: 'Contrasenya', tipus: 'password', obligatori: true, minlength: 8, maxlength: 72, autocomplete: 'new-password',
    pattern: '(?=.*[A-Za-z])(?=.*[0-9]).{8,}', title: 'Mínim 8 caràcters amb lletres i números.', ajuda: 'Mínim 8 caràcters, amb lletres i números.' }),
  camp({ nom: 'repetir', etiqueta: 'Repeteix la contrasenya', tipus: 'password', obligatori: true, minlength: 8, maxlength: 72, autocomplete: 'new-password' }),
  boto);
  buidar(main, h('div', { class: 'targeta-acces mx-auto' },
    h('h1', { class: 'h3 mb-3' }, 'Crear compte'),
    h('div', { class: 'card shadow-sm' }, h('div', { class: 'card-body p-4' }, botoGithub(), separador(), form,
      h('p', { class: 'mt-3 mb-0 small text-center' }, 'Ja tens compte? ', h('a', { href: '#/entrar' }, 'Inicia sessió'))))));
}
