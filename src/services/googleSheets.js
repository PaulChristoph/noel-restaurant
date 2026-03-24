/**
 * Google Sheets Integration.
 * Schreibt jede Reservierung live in eine Google-Tabelle.
 * Perfekt für Demo-Videos: Buchung erscheint sofort im Sheet.
 */
const { google } = require('googleapis');

function getAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return null;
  }
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key:   process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Erstellt Header-Zeile falls das Sheet noch leer ist.
 */
async function ensureHeaders(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:H1',
  });
  const values = res.data.values;
  if (!values || !values.length || !values[0].length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Buchungs-ID', 'Datum', 'Uhrzeit', 'Personen', 'Name', 'Telefon', 'Erstellt', 'Status']],
      },
    });
  }
}

/**
 * Fügt eine Reservierung als neue Zeile ins Google Sheet ein.
 */
async function appendReservation(confirmationId, guestName, guestPhone, dateTime, guests) {
  const auth = getAuth();
  if (!auth) {
    console.log('[Sheets] Keine Service-Account-Credentials — Sheets übersprungen');
    return;
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    console.log('[Sheets] GOOGLE_SHEETS_ID fehlt — Sheets übersprungen');
    return;
  }

  const sheets = google.sheets({ version: 'v4', auth });

  const d = new Date(dateTime);
  const datePart = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timePart = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const createdAt = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

  await ensureHeaders(sheets, spreadsheetId);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:H',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        confirmationId,
        datePart,
        timePart + ' Uhr',
        guests + (guests === 1 ? ' Person' : ' Personen'),
        guestName,
        guestPhone || '—',
        createdAt,
        'Bestätigt ✓',
      ]],
    },
  });

  console.log(`[Sheets] Reservierung ${confirmationId} eingetragen`);
}

module.exports = { appendReservation };
