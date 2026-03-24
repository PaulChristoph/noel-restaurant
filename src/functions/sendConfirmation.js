const { sendReservationConfirmation } = require('../services/sms');
const { sendGuestConfirmationEmail }  = require('../services/email');

/**
 * Sendet Buchungsbestätigung per SMS oder E-Mail an den Gast.
 * Wird von Sofia aufgerufen nachdem der Gast die Methode gewählt hat.
 */
async function sendConfirmation({ method, contact, confirmation_id, guest_name, date_time, guests }) {
  if (!method || !contact || !confirmation_id) {
    return { success: false, error: 'Fehlende Parameter: method, contact oder confirmation_id.' };
  }

  const m = method.toLowerCase();

  if (m === 'sms') {
    // Nummer bereinigen: nur Ziffern und führendes +
    const phone = contact.replace(/[^\d+]/g, '');
    if (phone.length < 6) {
      return { success: false, message: 'Die Telefonnummer scheint nicht korrekt zu sein. Könnten Sie sie noch einmal nennen?' };
    }
    await sendReservationConfirmation(phone, guest_name, date_time, guests, confirmation_id);
    console.log(`[Bestätigung] SMS gesendet an ${phone}`);
    return { success: true, message: 'Ihre Bestätigung ist per SMS unterwegs!' };
  }

  if (m === 'email' || m === 'e-mail') {
    // Einfache E-Mail-Validierung
    if (!contact.includes('@') || !contact.includes('.')) {
      return { success: false, message: 'Die E-Mail-Adresse scheint nicht korrekt zu sein. Könnten Sie sie noch einmal buchstabieren?' };
    }
    await sendGuestConfirmationEmail(contact, guest_name, date_time, guests, confirmation_id);
    console.log(`[Bestätigung] E-Mail gesendet an ${contact}`);
    return { success: true, message: 'Ihre Buchungsbestätigung ist per E-Mail unterwegs!' };
  }

  return { success: false, message: 'Bitte sagen Sie SMS oder E-Mail.' };
}

module.exports = sendConfirmation;
