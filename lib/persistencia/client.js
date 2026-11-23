// CAPA DE PERSISTÈNCIA · client de l'API REST de Supabase (PostgREST).
// Totes les crides porten el token de la persona connectada: així la base de
// dades aplica les polítiques RLS amb la seva identitat.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { ErrorApp } from '../errors.js';

// Tradueix els errors de PostgreSQL a missatges entenedors (sense detalls tècnics).
function traduirError(status, cos) {
  const codi = cos?.code;
  if (codi === '23P01') return new ErrorApp(409, 'Aquesta franja ja està reservada. Tria’n una altra.');
  if (codi === '23505') return new ErrorApp(409, 'Ja existeix un registre amb aquest nom.');
  if (codi === '23503') return new ErrorApp(409, 'No es pot fer: hi ha registres relacionats que en depenen.');
  if (codi === '23514') return new ErrorApp(400, 'Les dades no compleixen les restriccions.');
  if (codi === '42501' || status === 403) return new ErrorApp(403, 'No tens permís per fer aquesta acció.');
  if (codi === 'P0001') return new ErrorApp(403, cos.message);
  if (status === 401) return new ErrorApp(401, 'La sessió ha caducat. Torna a iniciar sessió.');
  if (status === 404) return new ErrorApp(404, 'No s’ha trobat el recurs.');
  return new ErrorApp(500, 'Error en accedir a les dades. Torna-ho a provar més tard.');
}

// Fa una petició a l'API REST. `ruta` és relativa a /rest/v1/.
export async function peticio(ruta, { metode = 'GET', token, cos, retornar = true, unic = false } = {}) {
  const capcaleres = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  if (metode !== 'GET' && retornar) capcaleres.Prefer = 'return=representation';
  if (unic) capcaleres.Accept = 'application/vnd.pgrst.object+json';

  let resposta;
  try {
    resposta = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
      method: metode,
      headers: capcaleres,
      body: cos === undefined ? undefined : JSON.stringify(cos),
    });
  } catch (e) {
    console.error('[persistencia] connexió fallida:', e.message);
    throw new ErrorApp(503, 'No s’ha pogut connectar amb la base de dades.');
  }

  const text = await resposta.text();
  const dades = text ? JSON.parse(text) : null;
  if (!resposta.ok) {
    if (unic && resposta.status === 406) return null; // cap fila
    console.error('[persistencia]', resposta.status, dades?.code, dades?.message);
    throw traduirError(resposta.status, dades);
  }
  return dades;
}

// Crida una funció SQL (RPC) exposada per PostgREST.
export const rpc = (funcio, parametres, token) =>
  peticio(`rpc/${funcio}`, { metode: 'POST', cos: parametres, token });

// Comprova el token amb Supabase Auth i retorna l'usuari (o null).
export async function usuariDelToken(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    throw new ErrorApp(503, 'No s’ha pogut verificar la sessió.');
  }
}

export const q = encodeURIComponent;
