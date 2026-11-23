// API REST de negoci · /api/installacions
//   GET    /api/installacions            llistat (amb les seves pistes)
//   GET    /api/installacions?id=1       detall
//   POST   /api/installacions            crear        (admin)
//   PUT    /api/installacions?id=1       modificar    (admin)
//   DELETE /api/installacions?id=1       eliminar     (admin)
import { apiRest } from '../lib/http.js';
import { identificar, requerirAdmin } from '../lib/negoci/sessio.js';
import { Installacions } from '../lib/negoci/serveis.js';

export default apiRest({
  GET: async (req, { query }) => {
    const sessio = await identificar(req);
    return query.id ? Installacions.obtenir(query.id, sessio) : Installacions.llistar(sessio);
  },
  POST: async (req, { cos }) => Installacions.crear(await requerirAdmin(req), cos),
  PUT: async (req, { query, cos }) => Installacions.actualitzar(await requerirAdmin(req), query.id, cos),
  DELETE: async (req, { query }) => Installacions.eliminar(await requerirAdmin(req), query.id),
});
