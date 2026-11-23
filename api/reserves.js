// API REST de negoci · /api/reserves
//   GET    /api/reserves[?dia=&meves=1]   reserves pròpies (admin: totes)
//   GET    /api/reserves?id=1             detall
//   POST   /api/reserves                  crear
//   PUT    /api/reserves?id=1             modificar dia/hora/durada/pista
//   PATCH  /api/reserves?id=1             cancel·lar
//   DELETE /api/reserves?id=1             eliminar
import { apiRest } from '../lib/http.js';
import { requerirSessio } from '../lib/negoci/sessio.js';
import { Reserves } from '../lib/negoci/serveis.js';

export default apiRest({
  GET: async (req, { query }) => {
    const sessio = await requerirSessio(req);
    return query.id ? Reserves.obtenir(sessio, query.id) : Reserves.llistar(sessio, query);
  },
  POST: async (req, { cos }) => Reserves.crear(await requerirSessio(req), cos),
  PUT: async (req, { query, cos }) => Reserves.modificar(await requerirSessio(req), query.id, cos),
  PATCH: async (req, { query }) => Reserves.cancellar(await requerirSessio(req), query.id),
  DELETE: async (req, { query }) => Reserves.eliminar(await requerirSessio(req), query.id),
});
