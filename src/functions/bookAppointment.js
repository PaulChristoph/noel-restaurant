const { createReservation } = require('../services/mockCalendar');
const { sendReservationConfirmation } = require('../services/sms');
const { getCallerPhone } = require('../services/retellCall');

async function bookAppointment({ guest_name, guest_phone, date_time, guests, notes }, callId) {
  if (!guest_name || !date_time || !guests) {
    return { success: false, error: 'Bitte nennen Sie Ihren Namen, die Personenzahl sowie Datum und Uhrzeit.' };
  }

  // Telefonnummer: genannt oder automatisch aus Anruf
  let phone = guest_phone;
  if (!phone && callId) {
    phone = await getCallerPhone(callId);
    if (phone) console.log(`[Booking] Anrufernummer automatisch erkannt: ${phone}`);
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

  // Bestätigungs-SMS (fire & forget)
  if (phone) {
    sendReservationConfirmation(phone, guest_name, startTime, guests, confirmationId)
      .catch(err => console.error('[SMS] Fehler:', err.message));
  }

  return {
    success: true,
    confirmation_id: confirmationId,
    confirmation_message: `Perfekt! Ich habe Ihren Tisch reserviert. ${guests} ${guests === 1 ? 'Person' : 'Personen'} am ${dateFormatted} um ${timeFormatted} Uhr. Ihre Reservierungsnummer lautet ${confirmationId}.${phone ? ' Sie erhalten gleich eine Bestätigungs-SMS.' : ''} Wir freuen uns auf Ihren Besuch im NOEL!`,
  };
}

module.exports = bookAppointment;
