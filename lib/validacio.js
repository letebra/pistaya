// Validació i sanejament de dades a la CAPA DE NEGOCI.
// Tot el que arriba de la capa de presentació es considera no fiable.
import { errorValidacio } from './errors.js';

// Elimina etiquetes HTML, caràcters de control i espais sobrers.
export function sanejaText(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor)
    .normalize('NFC')
    .replace(/<[^>]*>/g, '')            // fora etiquetes (<script>, <img ...>)
    .replace(/[<>]/g, '')               // fora angles solts
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Acumula errors per camp i els llança tots junts.
export class Validador {
  constructor(dades) {
    this.dades = dades && typeof dades === 'object' ? dades : {};
    this.errors = {};
    this.net = {};
  }

  text(camp, { min = 1, max = 255, obligatori = true, etiqueta = camp } = {}) {
    const v = sanejaText(this.dades[camp]);
    if (!v) {
      if (obligatori) this.errors[camp] = `${etiqueta} és obligatori.`;
      else this.net[camp] = null;
      return this;
    }
    if (v.length < min) this.errors[camp] = `${etiqueta} ha de tenir com a mínim ${min} caràcters.`;
    else if (v.length > max) this.errors[camp] = `${etiqueta} pot tenir com a màxim ${max} caràcters.`;
    else this.net[camp] = v;
    return this;
  }

  enter(camp, { min = 1, max = Number.MAX_SAFE_INTEGER, etiqueta = camp } = {}) {
    const v = Number(this.dades[camp]);
    if (!Number.isInteger(v)) this.errors[camp] = `${etiqueta} ha de ser un número enter.`;
    else if (v < min || v > max) this.errors[camp] = `${etiqueta} ha d’estar entre ${min} i ${max}.`;
    else this.net[camp] = v;
    return this;
  }

  decimal(camp, { min = 0, max = 1e6, minExclusiu = false, etiqueta = camp } = {}) {
    const brut = String(this.dades[camp] ?? '').replace(',', '.').trim();
    const v = Number(brut);
    if (brut === '' || !Number.isFinite(v)) this.errors[camp] = `${etiqueta} ha de ser un número.`;
    else if ((minExclusiu ? v <= min : v < min) || v > max)
      this.errors[camp] = `${etiqueta} ha de ser ${minExclusiu ? 'més gran que' : 'com a mínim'} ${min} i com a màxim ${max}.`;
    else this.net[camp] = Math.round(v * 100) / 100;
    return this;
  }

  opcio(camp, opcions, { etiqueta = camp } = {}) {
    const v = sanejaText(this.dades[camp]);
    if (!opcions.includes(v)) this.errors[camp] = `${etiqueta} no és vàlid.`;
    else this.net[camp] = v;
    return this;
  }

  boolea(camp) {
    const v = this.dades[camp];
    this.net[camp] = v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
    return this;
  }

  data(camp, { etiqueta = camp } = {}) {
    const v = sanejaText(this.dades[camp]);
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
      && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
    if (!ok) this.errors[camp] = `${etiqueta} ha de tenir el format AAAA-MM-DD.`;
    else this.net[camp] = v;
    return this;
  }

  hora(camp, { etiqueta = camp } = {}) {
    const v = sanejaText(this.dades[camp]);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) this.errors[camp] = `${etiqueta} ha de tenir el format HH:MM.`;
    else this.net[camp] = v;
    return this;
  }

  telefon(camp, { etiqueta = 'El telèfon' } = {}) {
    const v = sanejaText(this.dades[camp]);
    if (!v) { this.net[camp] = null; return this; }
    if (!/^[0-9 +]{9,15}$/.test(v)) this.errors[camp] = `${etiqueta} només pot tenir números, espais i + (9-15 caràcters).`;
    else this.net[camp] = v;
    return this;
  }

  // Retorna les dades netes o llança un error 400 amb tots els camps erronis.
  resultat() {
    if (Object.keys(this.errors).length) throw errorValidacio(this.errors);
    return this.net;
  }
}

export const idValid = (valor, etiqueta = 'L’identificador') =>
  new Validador({ id: valor }).enter('id', { min: 1, etiqueta }).resultat().id;
