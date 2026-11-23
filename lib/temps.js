// Conversions de data i hora a la zona horària de les instal·lacions.
import { ZONA_HORARIA } from './config.js';

// Desfasament (ms) de la zona respecte UTC en un instant concret.
function desfasament(instantMs, zona = ZONA_HORARIA) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(instantMs)).map((x) => [x.type, x.value]));
  const comLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return comLocal - Math.floor(instantMs / 1000) * 1000;
}

// '2026-12-01' + '18:30' (hora local) -> Date
export function localADate(dia, hora, zona = ZONA_HORARIA) {
  const [a, m, d] = dia.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const suposat = Date.UTC(a, m - 1, d, h, min);
  let r = suposat - desfasament(suposat, zona);
  r = suposat - desfasament(r, zona); // segona passada pels canvis d'hora
  return new Date(r);
}

// Date -> { dia: 'AAAA-MM-DD', hora: 'HH:MM' } en hora local
export function dateALocal(data, zona = ZONA_HORARIA) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(data)).map((x) => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export const minutsDelDia = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

export const minutsAHora = (minuts) =>
  `${String(Math.floor(minuts / 60)).padStart(2, '0')}:${String(minuts % 60).padStart(2, '0')}`;
