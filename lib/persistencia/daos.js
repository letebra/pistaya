// CAPA DE PERSISTÈNCIA · patró DAO (Data Access Object).
// Cada DAO encapsula l'accés a una taula; la capa de negoci no sap res de SQL
// ni de l'API REST. Els paràmetres sempre viatgen codificats (mai concatenats
// en SQL), i PostgREST genera consultes parametritzades.
import { peticio, rpc, q } from './client.js';

export const UsuarisDAO = {
  perId: (id, token) =>
    peticio(`usuaris?id=eq.${q(id)}&select=id,nom,email,telefon,rol,creat_el`, { token, unic: true }),
  actualitzar: (id, canvis, token) =>
    peticio(`usuaris?id=eq.${q(id)}`, { metode: 'PATCH', cos: canvis, token, unic: true }),
};

export const InstallacionsDAO = {
  // Inclou les pistes de cada instal·lació (consulta de dues taules).
  tots: (token) =>
    peticio('installacions?select=id,nom,adreca,ciutat,obertura,tancament,pistes(id,nom,esport,tipus,preu_hora,activa)&order=nom', { token }),
  perId: (id, token) =>
    peticio(`installacions?id=eq.${q(id)}&select=*,pistes(id,nom,esport,tipus,preu_hora,activa)`, { token, unic: true }),
  crear: (dades, token) => peticio('installacions', { metode: 'POST', cos: dades, token, unic: true }),
  actualitzar: (id, dades, token) =>
    peticio(`installacions?id=eq.${q(id)}`, { metode: 'PATCH', cos: dades, token, unic: true }),
  eliminar: (id, token) => peticio(`installacions?id=eq.${q(id)}`, { metode: 'DELETE', token, unic: true }),
};

export const PistesDAO = {
  // Inclou les dades de la instal·lació (JOIN pistes ⟶ installacions).
  tots: (filtre, token) => {
    let ruta = 'pistes?select=id,nom,esport,tipus,preu_hora,activa,installacio_id,installacions(id,nom,ciutat)&order=installacio_id,nom';
    if (filtre.installacio_id) ruta += `&installacio_id=eq.${q(filtre.installacio_id)}`;
    if (filtre.esport) ruta += `&esport=eq.${q(filtre.esport)}`;
    if (filtre.nomesActives) ruta += '&activa=is.true';
    return peticio(ruta, { token });
  },
  perId: (id, token) =>
    peticio(`pistes?id=eq.${q(id)}&select=*,installacions(id,nom,ciutat,obertura,tancament)`, { token, unic: true }),
  crear: (dades, token) => peticio('pistes', { metode: 'POST', cos: dades, token, unic: true }),
  actualitzar: (id, dades, token) =>
    peticio(`pistes?id=eq.${q(id)}`, { metode: 'PATCH', cos: dades, token, unic: true }),
  eliminar: (id, token) => peticio(`pistes?id=eq.${q(id)}`, { metode: 'DELETE', token, unic: true }),
};

const SELECT_RESERVA =
  'id,inici,fi,estat,preu_total,creat_el,usuari_id,pista_id,' +
  'pistes(id,nom,esport,tipus,installacions(id,nom,ciutat)),usuaris(nom,email)';

export const ReservesDAO = {
  // Reserves amb pista, instal·lació i persona usuària (consulta de 4 taules).
  // RLS fa que una persona usuària només rebi les seves; l'admin, totes.
  llistar: (filtre, token) => {
    let ruta = `reserves?select=${SELECT_RESERVA}&order=inici.desc`;
    if (filtre.usuari_id) ruta += `&usuari_id=eq.${q(filtre.usuari_id)}`;
    if (filtre.pista_id) ruta += `&pista_id=eq.${q(filtre.pista_id)}`;
    if (filtre.desDe) ruta += `&inici=gte.${q(filtre.desDe)}`;
    if (filtre.finsA) ruta += `&inici=lt.${q(filtre.finsA)}`;
    return peticio(ruta, { token });
  },
  perId: (id, token) => peticio(`reserves?id=eq.${q(id)}&select=${SELECT_RESERVA}`, { token, unic: true }),
  futuresConfirmades: (usuariId, araIso, token) =>
    peticio(`reserves?usuari_id=eq.${q(usuariId)}&estat=eq.confirmada&inici=gte.${q(araIso)}&select=id`, { token }),
  frangesOcupades: (pistaId, dia, token) => rpc('franges_ocupades', { p_pista: pistaId, p_dia: dia }, token),
  crear: (dades, token) => peticio('reserves', { metode: 'POST', cos: dades, token, unic: true }),
  actualitzar: (id, dades, token) =>
    peticio(`reserves?id=eq.${q(id)}`, { metode: 'PATCH', cos: dades, token, unic: true }),
  eliminar: (id, token) => peticio(`reserves?id=eq.${q(id)}`, { metode: 'DELETE', token, unic: true }),
};
