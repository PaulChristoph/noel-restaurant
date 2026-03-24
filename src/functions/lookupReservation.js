const {
  findReservationByName,
  findReservationByPhone,
  findReservationById,
} = require('../services/mockCalendar');
const { getCallerPhone } = require('../services/retellCall');
const { findReservationsInSheets } = require('../services/googleSheets');

/**
 * Sucht eine bestehende Reservierung — per Name, Buchungs-ID oder Anrufernummer.
 */
async function lookupReservation({ guest_name, confirmation_id }, callId, fromNumber) {
  let results = [];

  // 1. Per Buchungs-ID suchen (präziseste Suche)
  if (confirmation_id) {
    const found = findReservationById(confirmation_id);
    if (found) results = [found];
  }

  // 2. Per Name suchen
  if (results.length === 0 && guest_name) {
    results = findReservationByName(guest_name);
  }

  // 3. Automatisch per Anrufernummer suchen (direkt aus Retell-Body, dann API-Fallback)
  if (results.length === 0) {
    const callerPhone = fromNumber || (callId ? await getCallerPhone(callId) : null);
    if (callerPhone) {
      results = findReservationByPhone(callerPhone);
    }
  }

  // 4. Fallback: Google Sheets (JSON nach Railway-Redeploy leer)
  if (results.length === 0) {
    try {
      const callerPhoneForSheets = fromNumber || (callId ? await getCallerPhone(callId) : null);
      const sheetsResults = await findReservationsInSheets({
        confirmationId: confirmation_id,
        guestName: guest_name,
        phone: callerPhoneForSheets,
      });
      if (sheetsResults.length > 0) results = sheetsResults;
    } catch (err) {
      console.error('[Lookup] Sheets-Fallback Fehler:', err.message);
    }
  }

  if (results.length === 0) {
    return {
      found: false,
      message: 'Ich konnte leider keine Reservierung unter diesem Namen finden. Haben Sie vielleicht unter einem anderen Namen gebucht, oder kann ich Ihnen anderweitig helfen?',
    };
  }

  // Maximal 3 Treffer zurückgeben, zukünftige zuerst
  const now = new Date();
  const sorted = results
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .slice(0, 3);

  const formatted = sorted.map(r => {
    const d = new Date(r.dateTime);
    const date = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const past = d < now ? ' (bereits vergangen)' : '';
    return `${r.guestName}, ${r.guests} ${r.guests === 1 ? 'Person' : 'Personen'}, am ${date} um ${time} Uhr, Buchungs-Nr. ${r.confirmationId}${past}`;
  });

  if (formatted.length === 1) {
    return {
      found: true,
      count: 1,
      confirmation_id: sorted[0].confirmationId,
      guest_name: sorted[0].guestName,
      date_time: sorted[0].dateTime,
      guests: sorted[0].guests,
      message: `Ich habe folgende Reservierung gefunden: ${formatted[0]}.`,
    };
  }

  return {
    found: true,
    count: formatted.length,
    confirmation_id: sorted[0].confirmationId,
    guest_name: sorted[0].guestName,
    date_time: sorted[0].dateTime,
    guests: sorted[0].guests,
    message: `Ich habe ${formatted.length} Reservierungen gefunden: ${formatted.join('. Außerdem: ')}.`,
  };
}

module.exports = lookupReservation;
