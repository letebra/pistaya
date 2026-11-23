// Vista: perfil de la persona connectada (modificar nom i telèfon).
import { h, buidar } from '../dom.js';
import { api } from '../api.js';
import { refrescarPerfil, usuari } from '../auth.js';
import { exit, error, camp, validarFormulari, mostrarErrors, ambBotoOcupat } from '../ui.js';

export async function vistaPerfil(main) {
  const u = await api.get('perfil');
  const boto = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Desar canvis');
  const form = h('form', { novalidate: true, onSubmit: async (e) => {
    e.preventDefault();
    if (!validarFormulari(form)) return;
    await ambBotoOcupat(boto, async () => {
      try {
        await api.put('perfil', null, { nom: form.nom.value, telefon: form.telefon.value });
        await refrescarPerfil();
        exit('Perfil actualitzat.');
      } catch (err) { if (err.errors) mostrarErrors(form, err.errors); error(err.message); }
    });
  } },
  camp({ nom: 'nom', etiqueta: 'Nom', valor: u.nom, obligatori: true, minlength: 2, maxlength: 80, autocomplete: 'name' }),
  camp({ nom: 'email', etiqueta: 'Correu electrònic', tipus: 'email', valor: u.email, disabled: true, ajuda: 'El correu no es pot canviar.' }),
  camp({ nom: 'telefon', etiqueta: 'Telèfon', tipus: 'tel', valor: u.telefon ?? '', pattern: '[0-9 +]{9,15}', title: 'Només números, espais i +, entre 9 i 15 caràcters.', autocomplete: 'tel', ajuda: 'Opcional. Només el veu l’administració.' }),
  boto);
  buidar(main, h('h1', { class: 'h2' }, 'El meu perfil'),
    h('p', { class: 'text-secondary' }, `Rol: ${usuari()?.rol === 'admin' ? 'administració' : 'persona usuària'}`),
    h('div', { class: 'card shadow-sm ample-560' }, h('div', { class: 'card-body' }, form)));
}
