/**
 * Email-Benachrichtigung via Gmail SMTP (Nodemailer).
 * Sendet bei jeder Buchung eine Email ans Restaurant.
 */
const nodemailer = require('nodemailer');

// Transporter — gracefully disabled wenn keine Credentials
function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Sendet Buchungsbestätigung ans Restaurant.
 */
async function sendRestaurantNotification(guestName, guestPhone, dateTime, guests, confirmationId) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email] Kein Gmail-Account konfiguriert — Email übersprungen');
    return;
  }

  const restaurantEmail = process.env.RESTAURANT_EMAIL || process.env.GMAIL_USER;
  const restaurantName  = process.env.RESTAURANT_NAME  || 'Restaurant Mustermann';

  const d = new Date(dateTime);
  const dateFormatted = d.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const mailOptions = {
    from: `"${restaurantName} KI-Assistent" <${process.env.GMAIL_USER}>`,
    to:   restaurantEmail,
    subject: `🍽️ Neue Tischreservierung — ${guestName} am ${dateFormatted}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; color: #d4a017;">🍽️ Neue Tischreservierung</h2>
          <p style="margin: 4px 0 0; color: #aaa; font-size: 14px;">${restaurantName} — KI-Telefonassistent</p>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; width: 140px;">Buchungs-ID</td><td style="padding: 8px 0; font-weight: bold;">${confirmationId}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Gast</td><td style="padding: 8px 0; font-weight: bold;">${guestName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Telefon</td><td style="padding: 8px 0;">${guestPhone || '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Datum</td><td style="padding: 8px 0;">${dateFormatted}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Uhrzeit</td><td style="padding: 8px 0;">${timeFormatted} Uhr</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Personen</td><td style="padding: 8px 0;">${guests} ${guests === 1 ? 'Person' : 'Personen'}</td></tr>
          </table>
          <div style="margin-top: 20px; padding: 12px; background: #d4a01720; border-left: 3px solid #d4a017; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #555;">Diese Buchung wurde automatisch vom KI-Telefonassistenten entgegengenommen.</p>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Email] Buchungsbenachrichtigung gesendet an ${restaurantEmail}`);
}

/**
 * Sendet Buchungsbestätigung direkt an den Gast (per E-Mail).
 */
async function sendGuestConfirmationEmail(guestEmail, guestName, dateTime, guests, confirmationId) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email] Kein Gmail-Account konfiguriert — Gast-Email übersprungen');
    return;
  }

  const restaurantName  = process.env.RESTAURANT_NAME  || 'Restaurant Mustermann';
  const restaurantPhone = process.env.RESTAURANT_PHONE || '04105 676 33 02';

  const d = new Date(dateTime);
  const dateFormatted = d.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const mailOptions = {
    from: `"${restaurantName}" <${process.env.GMAIL_USER}>`,
    to:   guestEmail,
    subject: `Ihre Tischreservierung im ${restaurantName} — ${confirmationId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; color: #d4a017;">Ihre Reservierung ist bestätigt!</h2>
          <p style="margin: 4px 0 0; color: #aaa; font-size: 14px;">${restaurantName}</p>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hallo ${guestName.split(' ')[0]},</p>
          <p>vielen Dank für Ihre Reservierung! Wir freuen uns auf Ihren Besuch.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fff; border-bottom: 1px solid #eee;">
              <td style="padding: 10px; color: #666; width: 140px;">Buchungs-Nr.</td>
              <td style="padding: 10px; font-weight: bold; font-size: 18px; color: #d4a017;">${confirmationId}</td>
            </tr>
            <tr style="background: #f5f5f5; border-bottom: 1px solid #eee;">
              <td style="padding: 10px; color: #666;">Datum</td>
              <td style="padding: 10px;">${dateFormatted}</td>
            </tr>
            <tr style="background: #fff; border-bottom: 1px solid #eee;">
              <td style="padding: 10px; color: #666;">Uhrzeit</td>
              <td style="padding: 10px;">${timeFormatted} Uhr</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; color: #666;">Personen</td>
              <td style="padding: 10px;">${guests} ${guests === 1 ? 'Person' : 'Personen'}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 12px; background: #d4a01720; border-left: 3px solid #d4a017; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #555;">
              Bei Fragen oder Änderungen erreichen Sie uns unter <strong>${restaurantPhone}</strong>.
            </p>
          </div>
          <p style="margin-top: 24px; color: #999; font-size: 12px;">
            Wir freuen uns auf Sie!<br>${restaurantName}
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Email] Gast-Bestätigung gesendet an ${guestEmail}`);
}

module.exports = { sendRestaurantNotification, sendGuestConfirmationEmail };
