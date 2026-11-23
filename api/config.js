// API REST · /api/config: dades públiques que necessita el navegador per a
// l'autenticació (URL del projecte i clau pública "anon"). Cap secret.
import { apiRest } from '../lib/http.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/config.js';

export default apiRest({
  GET: async () => ({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY }),
});
