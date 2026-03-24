/**
 * Airtable Integration.
 * Persistente Reservierungsspeicherung — Railway-redeploy-fest, multi-instance-safe.
 */

const AIRTABLE_API = 'https://api.airtable.com/v0';

function getHeaders() {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) return null;
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function getTableUrl() {
  const baseId  = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_ID;
  if (!baseId || !tableId) return null;
  return `${AIRTABLE_API}/${baseId}/${tableId}`;
}

function normalizeId(id) {
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function toReservation(record) {
  const f = record.fields;
  return {
    confirmationId: f['Buchungs-ID'] || '',
    guestName:      f['Reservation Name'] || '',
    guestPhone:     f['Telefon'] || '',
    dateTime:       f['DateTime'] || '',
    guests:         parseInt(f['Number of Guests']) || 1,
    status:         f['Status'] === 'Cancelled' ? 'cancelled' : 'confirmed',
    recordId:       record.id,
  };
}

async function getAllRecords() {
  const url     = getTableUrl();
  const headers = getHeaders();
  if (!url || !headers) return [];

  const res = await fetch(`${url}?maxRecords=1000`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable GET: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.records || [];
}

/**
 * Fügt eine neue Reservierung in Airtable ein.
 */
async function appendReservation(confirmationId, guestName, guestPhone, dateTime, guests) {
  const headers = getHeaders();
  const url     = getTableUrl();
  if (!headers || !url) {
    console.log('[Airtable] Credentials fehlen — übersprungen');
    return;
  }

  const d        = new Date(dateTime);
  const datePart = d.toISOString().split('T')[0]; // "2025-03-24"

  const body = JSON.stringify({
    fields: {
      'Buchungs-ID':        confirmationId.toUpperCase(),
      'Reservation Name':   guestName,
      'Telefon':            guestPhone || '',
      'DateTime':           dateTime,
      'Reservation Date':   datePart,
      'Number of Guests':   parseInt(guests) || 1,
      'Status':             'Confirmed',
    },
  });

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable POST: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log(`[Airtable] ${confirmationId} eingetragen (${data.id})`);
  return data.id;
}

/**
 * Setzt den Status einer Reservierung auf "Cancelled".
 */
async function cancelReservationInAirtable(confirmationId) {
  if (!confirmationId) return;
  const headers = getHeaders();
  const url     = getTableUrl();
  if (!headers || !url) return;

  const records = await getAllRecords();
  const norm    = normalizeId(confirmationId);
  const record  = records.find(r => normalizeId(r.fields['Buchungs-ID']) === norm);

  if (!record) {
    console.log(`[Airtable] ${confirmationId} nicht gefunden`);
    return;
  }

  const res = await fetch(`${url}/${record.id}`, {
    method:  'PATCH',
    headers,
    body:    JSON.stringify({ fields: { 'Status': 'Cancelled' } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable PATCH: ${res.status} ${text}`);
  }

  console.log(`[Airtable] ${confirmationId} storniert`);
}

/**
 * Sucht aktive Reservierungen per Buchungs-ID, Name oder Telefon.
 * Gibt leeres Array zurück wenn Credentials fehlen oder nichts gefunden.
 */
async function findReservationsInAirtable({ confirmationId, guestName, phone } = {}) {
  const headers = getHeaders();
  if (!headers) return [];

  let records;
  try {
    records = await getAllRecords();
  } catch (err) {
    console.error('[Airtable] Fehler beim Laden:', err.message);
    return [];
  }

  const norm       = confirmationId ? normalizeId(confirmationId) : '';
  const nameLower  = guestName ? guestName.toLowerCase().trim() : '';
  const phoneDigits = phone ? phone.replace(/\D/g, '') : '';

  const results = [];
  const seen    = new Set();

  for (const record of records) {
    const r = toReservation(record);
    if (r.status === 'cancelled') continue;
    if (seen.has(r.confirmationId)) continue;

    let match = false;

    if (norm && normalizeId(r.confirmationId) === norm) match = true;

    if (!match && nameLower && r.guestName.toLowerCase().includes(nameLower)) match = true;

    if (!match && phoneDigits.length >= 6) {
      const stored = r.guestPhone.replace(/\D/g, '');
      if (stored.length >= 6) {
        const tail = Math.min(phoneDigits.length, stored.length, 8);
        if (phoneDigits.slice(-tail) === stored.slice(-tail)) match = true;
      }
    }

    if (match) {
      seen.add(r.confirmationId);
      results.push(r);
    }
  }

  console.log(`[Airtable] findReservations: ${results.length} Treffer`);
  return results;
}

module.exports = { appendReservation, cancelReservationInAirtable, findReservationsInAirtable };
