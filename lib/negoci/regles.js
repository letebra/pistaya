// CAPA DE NEGOCI · regles de les reserves (funcions pures, provades amb tests).
import {
  DURADES_PERMESES, MAX_RESERVES_FUTURES, DIES_ANTELACIO_MAX, HORES_MIN_CANVI,
} from '../config.js';
import { localADate, minutsDelDia, minutsAHora } from '../temps.js';

const PAS_MINUTS = 30;

// Franges d'inici possibles en un dia, marcant les ocupades i les passades.
// ocupades: [{ inici: ISO, fi: ISO }]
export function calcularFranges({ dia, obertura, tancament, durada, ocupades = [], ara = new Date(), excloureReservaId = null }) {
  const ini = minutsDelDia(obertura.slice(0, 5));
  const fin = minutsDelDia(tancament.slice(0, 5));
  const franges = [];
  for (let m = ini; m + durada <= fin; m += PAS_MINUTS) {
    const hora = minutsAHora(m);
    const inici = localADate(dia, hora);
    const fi = new Date(inici.getTime() + durada * 60000);
    const ocupada = ocupades.some((o) =>
      o.id !== excloureReservaId && new Date(o.inici) < fi && new Date(o.fi) > inici);
    const passada = inici <= ara;
    franges.push({ hora, inici: inici.toISOString(), fi: fi.toISOString(), disponible: !ocupada && !passada, ocupada, passada });
  }
  return franges;
}

// Comprova totes les regles d'una reserva nova o modificada.
// Retorna una llista d'errors (buida si tot és correcte).
export function comprovarReserva({ dia, hora, durada, pista, installacio, ocupades, reservesFutures, ara = new Date(), esAdmin = false, reservaId = null }) {
  const errors = [];
  if (!DURADES_PERMESES.includes(durada)) errors.push('La durada ha de ser de 60, 90 o 120 minuts.');
  if (!pista) return ['La pista no existeix.'];
  if (!pista.activa) errors.push('Aquesta pista no està disponible per reservar.');
  if (!/^\d{2}:(00|30)$/.test(hora)) errors.push('L’hora d’inici ha de ser en punt o i mitja.');

  const inici = localADate(dia, hora);
  const fi = new Date(inici.getTime() + durada * 60000);
  if (inici <= ara) errors.push('No es pot reservar una hora que ja ha passat.');
  if (inici - ara > DIES_ANTELACIO_MAX * 86400000)
    errors.push(`Només es pot reservar amb ${DIES_ANTELACIO_MAX} dies d’antelació com a màxim.`);

  const ini = minutsDelDia(hora);
  if (ini < minutsDelDia(installacio.obertura.slice(0, 5)) || ini + durada > minutsDelDia(installacio.tancament.slice(0, 5)))
    errors.push(`La instal·lació obre de ${installacio.obertura.slice(0, 5)} a ${installacio.tancament.slice(0, 5)}.`);

  const solapa = ocupades.some((o) => o.id !== reservaId && new Date(o.inici) < fi && new Date(o.fi) > inici);
  if (solapa) errors.push('Aquesta franja ja està reservada. Tria’n una altra.');

  if (!esAdmin && reservaId === null && reservesFutures >= MAX_RESERVES_FUTURES)
    errors.push(`Com a màxim pots tenir ${MAX_RESERVES_FUTURES} reserves pendents alhora.`);

  return errors;
}

// Una reserva només es pot modificar o cancel·lar amb antelació suficient.
export function esPotCanviar(reserva, ara = new Date(), esAdmin = false) {
  if (esAdmin) return true;
  if (reserva.estat !== 'confirmada') return false;
  return new Date(reserva.inici) - ara >= HORES_MIN_CANVI * 3600000;
}

// El preu el calcula sempre el servidor (mai es confia en el que envia el client).
export const calcularPreu = (preuHora, durada) => Math.round(Number(preuHora) * (durada / 60) * 100) / 100;
