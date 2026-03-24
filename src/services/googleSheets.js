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

/**
 * Setzt den Status einer Reservierung in Google Sheets auf "Storniert".
 */
async function cancelReservationInSheets(confirmationId) {
  const auth = getAuth();
  if (!auth) return;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return;

  const sheets = google.sheets({ version: 'v4', auth });

  // Alle Buchungs-IDs in Spalte A suchen
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'A:A' });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === confirmationId.toUpperCase());
  if (rowIndex === -1) {
    console.log(`[Sheets] ${confirmationId} nicht gefunden`);
    return;
  }

  // Status in Spalte H dieser Zeile überschreiben (1-basierter Index)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `H${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['Storniert ✗']] },
  });

  console.log(`[Sheets] ${confirmationId} als storniert markiert`);
}

/**
 * Sucht Reservierungen in Google Sheets als Fallback (JSON nach Railway-Redeploy leer).
 * Suche per Buchungs-ID, Name oder Telefon.
 */
async function findReservationsInSheets({ confirmationId, guestName, phone } = {}) {
  const auth = getAuth();
  if (!auth) return [];
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return [];

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'A:H' });
  const rows = res.data.values || [];

  const results = [];
  // Zeile 0 ist Header — ab Zeile 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    const [rowId, datePart, timeStr, personsStr, name, rowPhone, , status] = row;
    if (status === 'Storniert ✗') continue;

    let match = false;
    if (confirmationId && rowId && rowId.toUpperCase() === confirmationId.toUpperCase()) match = true;
    if (!match && guestName && name && name.toLowerCase().includes(guestName.toLowerCase())) match = true;
    if (!match && phone && rowPhone && rowPhone !== '—') {
      const d1 = phone.replace(/\D/g, '');
      const d2 = rowPhone.replace(/\D/g, '');
      if (d1.length >= 6 && (d1.includes(d2.slice(-8)) || d2.includes(d1.slice(-8)))) match = true;
    }

    if (match) {
      // Datum und Zeit zurück in ISO konvertieren: "30.03.2025" + "18:00 Uhr"
      const parts = datePart.split('.');
      const timeClean = timeStr.replace(' Uhr', '');
      const timeParts = timeClean.split(':');
      const dt = new Date(
        parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]),
        parseInt(timeParts[0]), parseInt(timeParts[1])
      );
      results.push({
        confirmationId: rowId,
        guestName: name,
        guestPhone: rowPhone !== '—' ? rowPhone : '',
        dateTime: dt.toISOString(),
        guests: parseInt(personsStr) || 1,
        status: 'confirmed',
      });
    }
  }
  console.log(`[Sheets] findReservationsInSheets: ${results.length} Treffer`);
  return results;
}

module.exports = { appendReservation, cancelReservationInSheets, findReservationsInSheets };
