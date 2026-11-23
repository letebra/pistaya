// Autenticació amb Supabase Auth:
//  · Usuari (correu) + contrasenya. Supabase guarda les contrasenyes xifrades (bcrypt).
//  · OAuth federat amb GitHub.
// El navegador obté un token JWT de sessió que s'envia a l'API de negoci.
let client = null;
let perfil = null;
const oients = new Set();

export async function iniciarAuth() {
  const r = await fetch('/api/config');
  const { dades } = await r.json();
  client = window.supabase.createClient(dades.supabaseUrl, dades.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { perfil = null; notificar(); }
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') carregarPerfil();
  });
  await carregarPerfil();
}

export async function token() {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function carregarPerfil() {
  const t = await token();
  if (!t) { perfil = null; notificar(); return null; }
  try {
    const r = await fetch('/api/perfil', { headers: { Authorization: `Bearer ${t}` } });
    const json = await r.json();
    perfil = json.ok ? json.dades : null;
  } catch { perfil = null; }
  notificar();
  return perfil;
}

export const refrescarPerfil = carregarPerfil;
export const usuari = () => perfil;
export const esAdmin = () => perfil?.rol === 'admin';
export const enCanviar = (fn) => { oients.add(fn); return () => oients.delete(fn); };
function notificar() { oients.forEach((fn) => fn(perfil)); }

const MISSATGES = {
  'Invalid login credentials': 'El correu o la contrasenya no són correctes.',
  'Email not confirmed': 'Encara no has confirmat el correu. Revisa la safata d’entrada.',
  'User already registered': 'Ja existeix un compte amb aquest correu.',
};
const traduir = (e) => MISSATGES[e?.message] || 'No s’ha pogut completar l’accés. Torna-ho a provar.';

export async function entrar(email, contrasenya) {
  const { error } = await client.auth.signInWithPassword({ email, password: contrasenya });
  if (error) throw new Error(traduir(error));
  return carregarPerfil();
}

export async function registrar(nom, email, contrasenya) {
  const { data, error } = await client.auth.signUp({
    email, password: contrasenya,
    options: { data: { nom }, emailRedirectTo: `${location.origin}/` },
  });
  if (error) throw new Error(traduir(error));
  if (data.session) await carregarPerfil();
  return { necessitaConfirmacio: !data.session };
}

export async function entrarAmbGithub() {
  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${location.origin}/` },
  });
  if (error) throw new Error('No s’ha pogut connectar amb GitHub.');
}

export async function sortir() {
  await client.auth.signOut();
  perfil = null;
  notificar();
}
