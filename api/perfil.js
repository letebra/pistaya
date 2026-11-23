// API REST de negoci · /api/perfil
//   GET /api/perfil   dades de la persona connectada (inclou el rol)
//   PUT /api/perfil   modificar nom i telèfon
import { apiRest } from '../lib/http.js';
import { requerirSessio } from '../lib/negoci/sessio.js';
import { Perfil } from '../lib/negoci/serveis.js';

export default apiRest({
  GET: async (req) => Perfil.obtenir(await requerirSessio(req)),
  PUT: async (req, { cos }) => Perfil.actualitzar(await requerirSessio(req), cos),
});
