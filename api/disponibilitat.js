// API REST de negoci · /api/disponibilitat?pista_id=1&dia=2026-12-01&durada=60
// Retorna les franges horàries d'una pista indicant quines estan lliures.
import { apiRest } from '../lib/http.js';
import { identificar } from '../lib/negoci/sessio.js';
import { disponibilitat } from '../lib/negoci/serveis.js';

export default apiRest({
  GET: async (req, { query }) => disponibilitat(await identificar(req), query),
});
