/**
 * lib/birthday-logic.js
 *
 * Funciones puras para calcular, dado "hoy", qué contactos cumplen años
 * en exactamente N días (manejando el caso de fin de año / años bisiestos
 * de forma simple, comparando mes+día contra la fecha de hoy + N días).
 */

function daysFromNow(n, today = new Date()) {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function matchesMonthDay(contact, date) {
  return (
    contact.birthMonth === date.getUTCMonth() + 1 &&
    contact.birthDay === date.getUTCDate()
  );
}

/**
 * Devuelve { sevenDaysBefore: Contact[], threeDaysBefore: Contact[] }
 */
function getContactsToNotify(contacts, today = new Date()) {
  const targetIn7 = daysFromNow(7, today);
  const targetIn3 = daysFromNow(3, today);

  const sevenDaysBefore = contacts.filter((c) => matchesMonthDay(c, targetIn7));
  const threeDaysBefore = contacts.filter((c) => matchesMonthDay(c, targetIn3));

  return { sevenDaysBefore, threeDaysBefore };
}

export { getContactsToNotify, daysFromNow, matchesMonthDay };
