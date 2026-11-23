// API REST de negoci · /api/pistes
//   GET    /api/pistes[?installacio_id=&esport=&actives=1]   llistat amb instal·lació
//   GET    /api/pistes?id=1                                  detall
//   POST   /api/pistes                                       crear      (admin)
//   PUT    /api/pistes?id=1                                  modificar  (admin)
//   DELETE /api/pistes?id=1                                  eliminar   (admin)
import { apiRest } from '../lib/http.js';
import { identificar, requerirAdmin } from '../lib/negoci/sessio.js';
import { Pistes } from '../lib/negoci/serveis.js';

export default apiRest({
  GET: async (req, { query }) => {
    const sessio = await identificar(req);
    return query.id ? Pistes.obtenir(query.id, sessio) : Pistes.llistar(sessio, query);
  },
  POST: async (req, { cos }) => Pistes.crear(await requerirAdmin(req), cos),
  PUT: async (req, { query, cos }) => Pistes.actualitzar(await requerirAdmin(req), query.id, cos),
  DELETE: async (req, { query }) => Pistes.eliminar(await requerirAdmin(req), query.id),
});
