const { createReservation } = require('../services/mockCalendar');
const { cancelReservationInAirtable, findReservationsInAirtable, appendReservation } = require('../services/airtable');
const { findReservationById, findReservationByName, findReservationByPhone, cancelReservation } = require('../services/mockCalendar');
const { getCallerPhone } = require('../services/retellCall');

/**
 * Verschiebt eine bestehende Reservierung auf neues Datum/Uhrzeit.
 * Suche per Buchungs-ID, Telefonnummer oder Name.
 */
async function rescheduleAppointment({ confirmation_id, guest_name, new_date, new_time }, callId, fromNumber) {
  try {
    if (!new_date || !new_time) {
      return { success: false, message: 'Bitte nennen Sie mir das neue Datum und die neue Uhrzeit.' };
    }

    const newDateTime = `${new_date}T${new_time}:00`;

    // Telefonnummer ermitteln
    const callerPhone = fromNumber || (callId ? await getCallerPhone(callId) : null);

    // --- Reservierung suchen ---
    let reservation = null;

    // 1. JSON per ID
    if (confirmation_id) {
      reservation = findReservationById(confirmation_id);
    }

    // 2. JSON per Name
    if (!reservation && guest_name) {
      const results = findReservationByName(guest_name);
      const now = new Date();
      reservation = results
        .filter(r => new Date(r.dateTime) > now && r.status !== 'cancelled')
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0] || null;
    }

    // 3. JSON per Telefon
    if (!reservation && callerPhone) {
      const results = findReservationByPhone(callerPhone);
      const now = new Date();
      reservation = results
        .filter(r => new Date(r.dateTime) > now && r.status !== 'cancelled')
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0] || null;
    }

    // 4. Airtable-Fallback
    if (!reservation) {
      const airtableResults = await findReservationsInAirtable({
        confirmationId: confirmation_id,
        guestName: guest_name,
        phone: callerPhone,
      });
      if (airtableResults.length > 0) {
        // Airtable-Treffer als reservation-Objekt mappen
        const r = airtableResults[0];
        reservation = {
          confirmationId: r.confirmationId,
          guestName:      r.guestName,
          guestPhone:     r.guestPhone,
          guests:         r.guests,
          notes:          '',
          fromAirtable:   true,
        };
      }
    }

    if (!reservation) {
      return {
        success: false,
        message: 'Ich konnte keine aktive Reservierung unter Ihrem Namen oder Ihrer Nummer finden. Haben Sie die Buchungsnummer zur Hand? Sie lautet M S T R, gefolgt von vier Ziffern.',
      };
    }

    const oldId = reservation.confirmationId;

    // --- Alten Termin stornieren ---
    if (!reservation.fromAirtable) {
      cancelReservation(oldId);
    }
    await cancelReservationInAirtable(oldId);

    // --- Neuen Termin anlegen ---
    const { confirmationId: newId, startTime } = await createReservation(
      reservation.guestName,
      reservation.guestPhone || callerPhone || '',
      newDateTime,
      reservation.guests,
      reservation.notes || ''
    );

    // Airtable-Eintrag — awaited
    try {
      await appendReservation(newId, reservation.guestName, reservation.guestPhone || callerPhone || '', startTime, reservation.guests);
    } catch (err) {
      console.error('[Airtable] Umbuchungs-Eintrag fehlgeschlagen:', err.message);
    }

    const d = new Date(startTime);
    const dateFormatted = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    const prefix  = newId.split('-')[0].split('').join(' ');
    const numbers = newId.split('-')[1].split('').join(' ');

    console.log(`[Reschedule] ${oldId} → ${newId} (${startTime})`);

    return {
      success: true,
      old_id:          oldId,
      new_id:          newId,
      new_date_time:   startTime,
      message: `Ihre Reservierung wurde umgebucht auf ${dateFormatted} um ${timeFormatted} Uhr. Ihre neue Buchungsnummer lautet ${prefix}, ${numbers}.`,
    };

  } catch (err) {
    console.error('[Reschedule] Fehler:', err.message, err.stack);
    return {
      success: false,
      message: 'Es gab ein technisches Problem bei der Umbuchung. Bitte nennen Sie mir Ihre Buchungsnummer, M S T R gefolgt von vier Ziffern.',
    };
  }
}

module.exports = rescheduleAppointment;
