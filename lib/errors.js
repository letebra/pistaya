// Errors de l'aplicació amb codi HTTP i missatge pensat per a la persona usuària.
export class ErrorApp extends Error {
  constructor(status, missatge, errors = null) {
    super(missatge);
    this.status = status;
    this.errors = errors; // { camp: 'missatge' } per a errors de validació
  }
}

export const errorValidacio = (errors) =>
  new ErrorApp(400, 'Revisa els camps marcats.', errors);
export const errorNoAutenticat = () =>
  new ErrorApp(401, 'Has d’iniciar sessió per fer aquesta acció.');
export const errorSensePermis = () =>
  new ErrorApp(403, 'No tens permís per fer aquesta acció.');
export const errorNoTrobat = (que = 'El registre') =>
  new ErrorApp(404, `${que} no existeix.`);
export const errorConflicte = (missatge) => new ErrorApp(409, missatge);
