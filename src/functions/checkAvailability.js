const { checkTableAvailability } = require('../services/mockCalendar');

async function checkAvailability({ date, time, guests }) {
  if (!date || !time) {
    return { available: false, message: 'Bitte nennen Sie Datum und Uhrzeit für die Reservierung.' };
  }

  const result = await checkTableAvailability(date, time);

  return {
    available: result.available,
    message: result.message,
    tables_left: result.tables_left || 0,
  };
}

module.exports = checkAvailability;
