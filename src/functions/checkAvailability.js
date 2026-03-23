const { checkTableAvailability } = require('../services/mockCalendar');

async function checkAvailability({ date, time, guests }) {
  if (!date || !time) {
    return { available: false, message: 'Bitte nennen Sie Datum und Uhrzeit für die Reservierung.' };
  }

  // Vergangene Zeiten ablehnen
  const requestedDateTime = new Date(`${date}T${time}:00`);
  if (requestedDateTime < new Date()) {
    return { available: false, message: 'Dieser Zeitpunkt liegt in der Vergangenheit. Bitte wählen Sie einen zukünftigen Termin.' };
  }

  const result = await checkTableAvailability(date, time);

  return {
    available: result.available,
    message: result.message,
    tables_left: result.tables_left || 0,
  };
}

module.exports = checkAvailability;
