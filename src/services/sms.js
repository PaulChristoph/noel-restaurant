const twilio = require('twilio');

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSMS(to, body) {
  const client = getClient();
  if (!client) {
    console.log(`[SMS] Nicht konfiguriert — würde senden an ${to}: ${body}`);
    return null;
  }
  const msg = await client.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
  console.log(`[SMS] Gesendet an ${to} — SID: ${msg.sid}`);
  return msg.sid;
}

async function sendReservationConfirmation(guestPhone, guestName, dateTime, guests, confirmationId) {
  const d = new Date(dateTime);
  const date = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const name = process.env.RESTAURANT_NAME || 'NOEL';
  const phone = process.env.RESTAURANT_PHONE || '04105-6763302';

  const body = `Hallo ${guestName.split(' ')[0]}, Ihre Reservierung (${guests} Personen) am ${date} um ${time} Uhr im ${name} ist bestätigt. Buchungs-Nr.: ${confirmationId}. Bei Fragen: ${phone}`;

  return sendSMS(guestPhone, body);
}

module.exports = { sendSMS, sendReservationConfirmation };
