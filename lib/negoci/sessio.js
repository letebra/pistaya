// CAPA DE NEGOCI · autenticació i autorització per codi.
// 1) Autenticació: el token (JWT) que envia el navegador es verifica amb
//    Supabase Auth. Si no és vàlid, la petició es rebutja (401).
// 2) Autorització: el rol es llegeix de la taula `usuaris` i cada operació
//    declara quin rol necessita. A més, la BBDD aplica RLS (doble barrera).
import { usuariDelToken } from '../persistencia/client.js';
import { UsuarisDAO } from '../persistencia/daos.js';
import { errorNoAutenticat, errorSensePermis } from '../errors.js';

export function tokenDeLaPeticio(req) {
  const capcalera = req.headers?.authorization || req.headers?.Authorization || '';
  const [tipus, token] = String(capcalera).split(' ');
  return tipus === 'Bearer' && token ? token : null;
}

// Retorna { id, email, nom, rol, token } o null si no hi ha sessió.
export async function identificar(req) {
  const token = tokenDeLaPeticio(req);
  if (!token) return null;
  const usuari = await usuariDelToken(token);
  if (!usuari?.id) return null;
  const perfil = await UsuarisDAO.perId(usuari.id, token);
  return {
    id: usuari.id,
    email: usuari.email,
    nom: perfil?.nom ?? usuari.email,
    telefon: perfil?.telefon ?? null,
    rol: perfil?.rol === 'admin' ? 'admin' : 'usuari',
    token,
  };
}

export async function requerirSessio(req) {
  const sessio = await identificar(req);
  if (!sessio) throw errorNoAutenticat();
  return sessio;
}

export async function requerirAdmin(req) {
  const sessio = await requerirSessio(req);
  if (sessio.rol !== 'admin') throw errorSensePermis();
  return sessio;
}

export const esAdmin = (sessio) => sessio?.rol === 'admin';
