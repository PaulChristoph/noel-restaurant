const { createReservation }           = require('../services/mockCalendar');
const { sendReservationConfirmation } = require('../services/sms');
const { sendRestaurantNotification }  = require('../services/email');
const { appendReservation }           = require('../services/googleSheets');
const { getCallerPhone }              = require('../services/retellCall');

async function bookAppointment({ guest_name, guest_phone, date_time, guests, notes }, callId, fromNumber) {
  if (!guest_name || !date_time || !guests) {
    return { success: false, error: 'Bitte nennen Sie Ihren Namen, die Personenzahl sowie Datum und Uhrzeit.' };
  }

  // Telefonnummer: 1) vom Gast genannt, 2) direkt aus Retell-Body, 3) API-Fallback
  let phone = guest_phone || fromNumber;
  if (phone) {
    console.log(`[Booking] Telefonnummer: ${phone}`);
  } else if (callId) {
    phone = await getCallerPhone(callId);
    if (phone) console.log(`[Booking] Anrufernummer via API erkannt: ${phone}`);
  }

  const { id, confirmationId, startTime } = await createReservation(
    guest_name,
    phone,
    date_time,
    guests,
    notes || ''
  );

  const d = new Date(startTime);
  const dateFormatted = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeFormatted = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // Email-Benachrichtigung ans Restaurant (fire & forget)
  sendRestaurantNotification(guest_name, phone, startTime, guests, confirmationId)
    .catch(err => console.error('[Email] Fehler:', err.message));

  // Google Sheets Eintrag — AWAITED damit Cancel-Fallback die Buchung sofort findet
  try {
    await appendReservation(confirmationId, guest_name, phone, startTime, guests);
  } catch (err) {
    console.error('[Sheets] Eintrag fehlgeschlagen:', err.message);
    // Buchung trotzdem bestätigen
  }

  // TTS-freundliche Buchungsnummer: "MSTR-1234" → "M S T R, 1 2 3 4"
  const prefix  = confirmationId.split('-')[0].split('').join(' ');
  const numbers = confirmationId.split('-')[1].split('').join(' ');

  return {
    success: true,
    confirmation_id: confirmationId,
    detected_phone: phone || null,
    guest_name,
    date_time: startTime,
    guests,
    confirmation_message: `Perfekt! Ihr Tisch ist reserviert. ${guests} ${guests === 1 ? 'Person' : 'Personen'} am ${dateFormatted} um ${timeFormatted} Uhr. Ihre Buchungsnummer lautet ${prefix}, ${numbers}.`,
  };
}

module.exports = bookAppointment;
