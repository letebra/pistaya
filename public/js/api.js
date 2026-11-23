// CAPA DE PRESENTACIÓ → CAPA DE NEGOCI: totes les dades es demanen a l'API
// REST pròpia (/api/...). El navegador mai parla directament amb les taules.
import { token } from './auth.js';

export class ErrorApi extends Error {
  constructor(status, missatge, errors) {
    super(missatge);
    this.status = status;
    this.errors = errors;
  }
}

async function crida(metode, ruta, cos) {
  const capcaleres = { Accept: 'application/json' };
  const t = await token();
  if (t) capcaleres.Authorization = `Bearer ${t}`;
  if (cos !== undefined) capcaleres['Content-Type'] = 'application/json';
  let resposta;
  try {
    resposta = await fetch(`/api/${ruta}`, { method: metode, headers: capcaleres, body: cos === undefined ? undefined : JSON.stringify(cos) });
  } catch {
    throw new ErrorApi(0, 'No hi ha connexió amb el servidor. Comprova la connexió a Internet.');
  }
  let json = null;
  try { json = await resposta.json(); } catch { /* resposta buida */ }
  if (!resposta.ok || !json?.ok) {
    throw new ErrorApi(resposta.status, json?.error || 'S’ha produït un error inesperat.', json?.errors);
  }
  return json.dades;
}

const qs = (params) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  get: (recurs, params = {}) => crida('GET', `${recurs}${qs(params)}`),
  post: (recurs, cos) => crida('POST', recurs, cos),
  put: (recurs, id, cos) => crida('PUT', `${recurs}${qs({ id })}`, cos),
  patch: (recurs, id, cos = {}) => crida('PATCH', `${recurs}${qs({ id })}`, cos),
  del: (recurs, id) => crida('DELETE', `${recurs}${qs({ id })}`),
};
