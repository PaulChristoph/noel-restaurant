const { cancelReservation, findReservationById, findReservationByName } = require('../services/mockCalendar');
const { cancelReservationInSheets, findReservationsInSheets } = require('../services/googleSheets');

/**
 * Storniert eine bestehende Reservierung.
 * Wird aufgerufen bei Stornierung oder vor einer Umbuchung.
 */
async function cancelAppointment({ confirmation_id, guest_name }) {
  try {
    let reservation = null;

    if (confirmation_id) {
      reservation = findReservationById(confirmation_id);
    } else if (guest_name) {
      const results = findReservationByName(guest_name);
      // Nächste zukünftige Buchung nehmen
      const now = new Date();
      reservation = results
        .filter(r => new Date(r.dateTime) > now && r.status !== 'cancelled')
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0] || null;
    }

    // Fallback: Google Sheets suchen (JSON nach Railway-Redeploy leer oder anderer Instance)
    if (!reservation) {
      try {
        const sheetsResults = await findReservationsInSheets({ confirmationId: confirmation_id, guestName: guest_name });
        if (sheetsResults.length > 0) {
          const r = sheetsResults[0];
          await cancelReservationInSheets(r.confirmationId);
          const d = new Date(r.dateTime);
          const date = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
          const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          console.log(`[Cancel] Sheets-Fallback: ${r.confirmationId} storniert`);
          return {
            success: true,
            cancelled_id: r.confirmationId,
            message: `Ihre Reservierung ${r.confirmationId} (${date} um ${time} Uhr) wurde erfolgreich storniert.`,
          };
        }
      } catch (err) {
        console.error('[Cancel] Sheets-Fallback Fehler:', err.message);
      }
      return {
        success: false,
        message: 'Ich konnte diese Reservierung leider nicht finden. Haben Sie vielleicht die genaue Buchungsnummer zur Hand? Die lautet M S T R, gefolgt von vier Ziffern.',
      };
    }

    if (reservation.status === 'cancelled') {
      return {
        success: false,
        message: `Die Reservierung ${reservation.confirmationId} wurde bereits storniert.`,
      };
    }

    // Lokal stornieren
    const ok = cancelReservation(reservation.confirmationId);
    if (!ok) {
      return { success: false, message: 'Stornierung leider nicht möglich. Bitte rufen Sie uns direkt an.' };
    }

    // Google Sheets aktualisieren (fire & forget)
    cancelReservationInSheets(reservation.confirmationId)
      .catch(err => console.error('[Sheets] Storno-Fehler:', err.message));

    const d = new Date(reservation.dateTime);
    const date = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    return {
      success: true,
      cancelled_id: reservation.confirmationId,
      message: `Ihre Reservierung ${reservation.confirmationId} (${date} um ${time} Uhr) wurde erfolgreich storniert.`,
    };

  } catch (err) {
    console.error('[Cancel] Unerwarteter Fehler:', err.message, err.stack);
    return {
      success: false,
      message: 'Es gab ein technisches Problem beim Stornieren. Bitte nennen Sie mir Ihre Buchungsnummer, M S T R gefolgt von vier Ziffern.',
    };
  }
}

module.exports = cancelAppointment;
