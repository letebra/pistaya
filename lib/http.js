// Utilitats HTTP de l'API REST de negoci (funcions serverless de Vercel).
import { ErrorApp } from './errors.js';

const MIDA_MAX_COS = 10 * 1024; // 10 KB

async function llegirCos(req) {
  if (req.method === 'GET' || req.method === 'DELETE') return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let text = '';
  for await (const tros of req) {
    text += tros;
    if (text.length > MIDA_MAX_COS) throw new ErrorApp(413, 'Les dades enviades són massa grans.');
  }
  return text ? JSON.parse(text) : {};
}

function enviar(res, status, cos) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(cos));
}

// Crea un handler REST a partir d'un objecte { GET, POST, PUT, PATCH, DELETE }.
// Cada mètode rep (req, { query, cos }) i retorna les dades de resposta.
export function apiRest(metodes) {
  return async function handler(req, res) {
    const metode = req.method?.toUpperCase();
    const accio = metodes[metode];
    if (!accio) {
      res.setHeader('Allow', Object.keys(metodes).join(', '));
      return enviar(res, 405, { ok: false, error: 'Mètode no permès.' });
    }
    try {
      const query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      let cos;
      try { cos = await llegirCos(req); } catch (e) {
        if (e instanceof ErrorApp) throw e;
        throw new ErrorApp(400, 'El format de les dades no és vàlid.');
      }
      const dades = await accio(req, { query, cos });
      const status = metode === 'POST' ? 201 : 200;
      return enviar(res, status, { ok: true, dades });
    } catch (e) {
      if (e instanceof ErrorApp) {
        return enviar(res, e.status, { ok: false, error: e.message, errors: e.errors || undefined });
      }
      // Mai s'envien detalls tècnics al client; només es registren al servidor.
      console.error('[api] error inesperat:', e);
      return enviar(res, 500, { ok: false, error: 'S’ha produït un error inesperat. Torna-ho a provar.' });
    }
  };
}
