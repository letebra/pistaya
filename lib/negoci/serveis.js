// CAPA DE NEGOCI · casos d'ús de l'aplicació.
// Rep dades de la capa de presentació (via API REST), les valida i saneja,
// aplica les regles de negoci i fa servir els DAO per accedir a les dades.
import { Validador, idValid } from '../validacio.js';
import { ErrorApp, errorNoTrobat, errorSensePermis, errorConflicte, errorValidacio } from '../errors.js';
import { InstallacionsDAO, PistesDAO, ReservesDAO, UsuarisDAO } from '../persistencia/daos.js';
import { calcularFranges, comprovarReserva, esPotCanviar, calcularPreu } from './regles.js';
import { esAdmin } from './sessio.js';
import { localADate, dateALocal } from '../temps.js';
import { DURADES_PERMESES } from '../config.js';

const ESPORTS = ['padel', 'tennis', 'futbol', 'basquet'];
const TIPUS = ['coberta', 'exterior'];

// ---------------- Perfil ----------------
export const Perfil = {
  async obtenir(sessio) {
    const { token, ...dades } = sessio;
    return dades;
  },
  async actualitzar(sessio, cos) {
    const d = new Validador(cos)
      .text('nom', { min: 2, max: 80, etiqueta: 'El nom' })
      .telefon('telefon')
      .resultat();
    const r = await UsuarisDAO.actualitzar(sessio.id, d, sessio.token);
    if (!r) throw errorNoTrobat('El perfil');
    return { id: r.id, nom: r.nom, email: r.email, telefon: r.telefon, rol: r.rol };
  },
};

// ---------------- Instal·lacions ----------------
function validarInstallacio(cos) {
  const d = new Validador(cos)
    .text('nom', { min: 3, max: 80, etiqueta: 'El nom' })
    .text('adreca', { min: 5, max: 120, etiqueta: 'L’adreça' })
    .text('ciutat', { min: 2, max: 60, etiqueta: 'La ciutat' })
    .hora('obertura', { etiqueta: 'L’hora d’obertura' })
    .hora('tancament', { etiqueta: 'L’hora de tancament' })
    .resultat();
  if (d.tancament <= d.obertura) throw errorValidacio({ tancament: 'L’hora de tancament ha de ser posterior a la d’obertura.' });
  return d;
}

export const Installacions = {
  llistar: (sessio) => InstallacionsDAO.tots(sessio?.token),
  async obtenir(id, sessio) {
    const r = await InstallacionsDAO.perId(idValid(id), sessio?.token);
    if (!r) throw errorNoTrobat('La instal·lació');
    return r;
  },
  crear: (sessio, cos) => InstallacionsDAO.crear(validarInstallacio(cos), sessio.token),
  async actualitzar(sessio, id, cos) {
    const r = await InstallacionsDAO.actualitzar(idValid(id), validarInstallacio(cos), sessio.token);
    if (!r) throw errorNoTrobat('La instal·lació');
    return r;
  },
  async eliminar(sessio, id) {
    const inst = await Installacions.obtenir(id, sessio);
    // Regla: no s'elimina una instal·lació que encara té pistes.
    if (inst.pistes?.length) throw errorConflicte(`No es pot eliminar: «${inst.nom}» encara té ${inst.pistes.length} pista/es. Elimina-les primer.`);
    await InstallacionsDAO.eliminar(inst.id, sessio.token);
    return { id: inst.id };
  },
};

// ---------------- Pistes ----------------
function validarPista(cos) {
  return new Validador(cos)
    .enter('installacio_id', { min: 1, etiqueta: 'La instal·lació' })
    .text('nom', { min: 2, max: 60, etiqueta: 'El nom' })
    .opcio('esport', ESPORTS, { etiqueta: 'L’esport' })
    .opcio('tipus', TIPUS, { etiqueta: 'El tipus' })
    .decimal('preu_hora', { min: 0, max: 200, minExclusiu: true, etiqueta: 'El preu per hora' })
    .boolea('activa')
    .resultat();
}

export const Pistes = {
  llistar(sessio, query) {
    const f = {};
    if (query.installacio_id) f.installacio_id = idValid(query.installacio_id, 'La instal·lació');
    if (query.esport) f.esport = new Validador(query).opcio('esport', ESPORTS, { etiqueta: 'L’esport' }).resultat().esport;
    if (query.actives === '1') f.nomesActives = true;
    return PistesDAO.tots(f, sessio?.token);
  },
  async obtenir(id, sessio) {
    const r = await PistesDAO.perId(idValid(id), sessio?.token);
    if (!r) throw errorNoTrobat('La pista');
    return r;
  },
  async crear(sessio, cos) {
    const d = validarPista(cos);
    await Installacions.obtenir(d.installacio_id, sessio); // ha d'existir
    return PistesDAO.crear(d, sessio.token);
  },
  async actualitzar(sessio, id, cos) {
    const d = validarPista(cos);
    await Installacions.obtenir(d.installacio_id, sessio);
    const r = await PistesDAO.actualitzar(idValid(id), d, sessio.token);
    if (!r) throw errorNoTrobat('La pista');
    return r;
  },
  async eliminar(sessio, id) {
    const pista = await Pistes.obtenir(id, sessio);
    // Regla: una pista amb reserves no s'elimina (es pot desactivar).
    const seves = await ReservesDAO.llistar({ pista_id: pista.id }, sessio.token);
    if (seves.length) throw errorConflicte(`No es pot eliminar «${pista.nom}»: té ${seves.length} reserva/es. Desactiva-la perquè no es pugui reservar.`);
    await PistesDAO.eliminar(pista.id, sessio.token);
    return { id: pista.id };
  },
};

// ---------------- Disponibilitat ----------------
export async function disponibilitat(sessio, query) {
  const d = new Validador(query)
    .enter('pista_id', { min: 1, etiqueta: 'La pista' })
    .data('dia', { etiqueta: 'El dia' })
    .enter('durada', { min: 60, max: 120, etiqueta: 'La durada' })
    .resultat();
  if (!DURADES_PERMESES.includes(d.durada)) throw errorValidacio({ durada: 'La durada ha de ser de 60, 90 o 120 minuts.' });
  const pista = await Pistes.obtenir(d.pista_id, sessio);
  const ocupades = await ReservesDAO.frangesOcupades(pista.id, d.dia, sessio?.token);
  const excloure = query.reserva_id ? Number(query.reserva_id) : null;
  return {
    pista: { id: pista.id, nom: pista.nom, activa: pista.activa, preu_hora: pista.preu_hora, installacio: pista.installacions },
    dia: d.dia,
    durada: d.durada,
    franges: pista.activa
      ? calcularFranges({ dia: d.dia, obertura: pista.installacions.obertura, tancament: pista.installacions.tancament, durada: d.durada, ocupades, excloureReservaId: excloure })
      : [],
  };
}

// ---------------- Reserves ----------------
function validarDadesReserva(cos) {
  return new Validador(cos)
    .enter('pista_id', { min: 1, etiqueta: 'La pista' })
    .data('dia', { etiqueta: 'El dia' })
    .hora('hora', { etiqueta: 'L’hora' })
    .enter('durada', { min: 60, max: 120, etiqueta: 'La durada' })
    .resultat();
}

async function preparar(sessio, d, reservaId = null, usuariId = sessio.id) {
  const pista = await Pistes.obtenir(d.pista_id, sessio);
  const ocupades = await ReservesDAO.frangesOcupades(pista.id, d.dia, sessio.token);
  const futures = await ReservesDAO.futuresConfirmades(usuariId, new Date().toISOString(), sessio.token);
  const errors = comprovarReserva({
    dia: d.dia, hora: d.hora, durada: d.durada, pista, installacio: pista.installacions,
    ocupades, reservesFutures: futures.length, esAdmin: esAdmin(sessio), reservaId,
  });
  if (errors.length) throw new ErrorApp(409, errors.join(' '));
  const inici = localADate(d.dia, d.hora);
  return {
    pista_id: pista.id,
    inici: inici.toISOString(),
    fi: new Date(inici.getTime() + d.durada * 60000).toISOString(),
    preu_total: calcularPreu(pista.preu_hora, d.durada),
  };
}

function formatar(r) {
  const ini = dateALocal(r.inici);
  const fi = dateALocal(r.fi);
  return { ...r, dia: ini.dia, hora: ini.hora, hora_fi: fi.hora, durada: Math.round((new Date(r.fi) - new Date(r.inici)) / 60000) };
}

export const Reserves = {
  async llistar(sessio, query) {
    const f = {};
    if (!esAdmin(sessio) || query.meves === '1') f.usuari_id = sessio.id;
    if (query.dia) {
      const dia = new Validador(query).data('dia', { etiqueta: 'El dia' }).resultat().dia;
      f.desDe = localADate(dia, '00:00').toISOString();
      f.finsA = new Date(localADate(dia, '00:00').getTime() + 86400000).toISOString();
    }
    const llista = await ReservesDAO.llistar(f, sessio.token);
    return llista.map((r) => ({ ...formatar(r), es_pot_canviar: esPotCanviar(r, new Date(), esAdmin(sessio)) }));
  },
  async obtenir(sessio, id) {
    const r = await ReservesDAO.perId(idValid(id), sessio.token); // RLS: només la pròpia o admin
    if (!r) throw errorNoTrobat('La reserva');
    return { ...formatar(r), es_pot_canviar: esPotCanviar(r, new Date(), esAdmin(sessio)) };
  },
  async crear(sessio, cos) {
    const d = validarDadesReserva(cos);
    const dades = await preparar(sessio, d);
    const r = await ReservesDAO.crear({ ...dades, usuari_id: sessio.id }, sessio.token);
    return formatar(r);
  },
  async modificar(sessio, id, cos) {
    const actual = await Reserves.obtenir(sessio, id);
    if (!esPotCanviar(actual, new Date(), esAdmin(sessio)))
      throw errorConflicte('Les reserves només es poden modificar fins a 2 hores abans de començar.');
    const d = validarDadesReserva(cos);
    const dades = await preparar(sessio, d, actual.id, actual.usuari_id);
    const r = await ReservesDAO.actualitzar(actual.id, dades, sessio.token);
    return formatar(r);
  },
  async cancellar(sessio, id) {
    const actual = await Reserves.obtenir(sessio, id);
    if (!esPotCanviar(actual, new Date(), esAdmin(sessio)))
      throw errorConflicte('Les reserves només es poden cancel·lar fins a 2 hores abans de començar.');
    const r = await ReservesDAO.actualitzar(actual.id, { estat: 'cancel·lada' }, sessio.token);
    return formatar(r);
  },
  async eliminar(sessio, id) {
    const actual = await Reserves.obtenir(sessio, id);
    // Les persones usuàries només poden esborrar reserves cancel·lades o passades.
    const passada = new Date(actual.fi) < new Date();
    if (!esAdmin(sessio) && actual.estat === 'confirmada' && !passada)
      throw errorSensePermis();
    await ReservesDAO.eliminar(actual.id, sessio.token);
    return { id: actual.id };
  },
};
