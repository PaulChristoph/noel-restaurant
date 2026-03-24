/**
 * Mock-Kalender für Restaurant-Reservierungen.
 * Speichert Reservierungen in einer JSON-Datei — kein externes System nötig.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '../../data/reservations.json');
const MAX_TABLES = parseInt(process.env.MAX_TABLES || '10', 10);
// Letzte Reservierung X Minuten vor Schließung
const LAST_RESERVATION_MIN = parseInt(process.env.LAST_RESERVATION_MINUTES || '90', 10);

// -------------------------------------------------------
// DB-Hilfsfunktionen
// -------------------------------------------------------
function loadDB() {
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDB(reservations) {
  fs.writeFileSync(DB_FILE, JSON.stringify(reservations, null, 2));
}

// -------------------------------------------------------
// Öffnungszeiten für einen bestimmten Wochentag
// -------------------------------------------------------
function getOpeningHours(date) {
  const dayKeys = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  const dayKey = dayKeys[new Date(date).getDay()];
  const envKey = `OPENING_HOURS_${dayKey.toUpperCase()}`;
  const value = process.env[envKey];

  if (!value || value === 'geschlossen') return null;
  return value; // z.B. "12:00-22:30"
}

// -------------------------------------------------------
// Prüft ob eine Uhrzeit innerhalb der Öffnungszeiten liegt
// -------------------------------------------------------
function isWithinOpeningHours(dateTimeStr) {
  const dt = new Date(dateTimeStr);
  const dateStr = dt.toISOString().split('T')[0];
  const hours = getOpeningHours(dateStr);
  if (!hours) return false;

  const [startStr, endStr] = hours.split('-');
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const openTime = new Date(dateStr);
  openTime.setHours(startH, startM, 0, 0);

  const closeTime = new Date(dateStr);
  closeTime.setHours(endH, endM, 0, 0);
  // Letzte Reservierung X Minuten vor Schließung
  closeTime.setMinutes(closeTime.getMinutes() - LAST_RESERVATION_MIN);

  return dt >= openTime && dt <= closeTime;
}

// -------------------------------------------------------
// Anzahl belegter Tische zum gewünschten Zeitpunkt
// -------------------------------------------------------
function countTablesTaken(dateTimeStr) {
  const reservations = loadDB();
  const dt = new Date(dateTimeStr);
  // Tisch gilt 2h als belegt
  return reservations.filter(r => {
    const rStart = new Date(r.dateTime);
    const rEnd = new Date(rStart.getTime() + 2 * 60 * 60 * 1000);
    return dt >= rStart && dt < rEnd;
  }).length;
}

// -------------------------------------------------------
// Öffentliche Funktionen
// -------------------------------------------------------

/**
 * Prüft Tischverfügbarkeit für ein Datum und eine Uhrzeit.
 */
async function checkTableAvailability(date, time) {
  const dateTimeStr = `${date}T${time}:00`;

  const openingHours = getOpeningHours(date);
  if (!openingHours) {
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const dayName = dayNames[new Date(date).getDay()];
    return {
      available: false,
      message: `Das Restaurant ist ${dayName}s leider geschlossen.`,
    };
  }

  if (!isWithinOpeningHours(dateTimeStr)) {
    return {
      available: false,
      message: `Die gewünschte Uhrzeit liegt außerhalb unserer Öffnungszeiten. Wir haben ${openingHours.replace('-', ' bis ')} Uhr geöffnet. Letzte Reservierung ist ${LAST_RESERVATION_MIN} Minuten vor Schließung.`,
    };
  }

  const tablesTaken = countTablesTaken(dateTimeStr);
  const tablesLeft = MAX_TABLES - tablesTaken;

  if (tablesLeft <= 0) {
    return {
      available: false,
      message: `Für diesen Zeitpunkt sind leider keine Tische mehr frei. Möchten Sie einen anderen Zeitpunkt versuchen?`,
    };
  }

  const d = new Date(dateTimeStr);
  const dateFormatted = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFormatted = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return {
    available: true,
    tables_left: tablesLeft,
    message: `Ja, wir haben am ${dateFormatted} um ${timeFormatted} Uhr noch Tische frei.`,
  };
}

/**
 * Erstellt eine Reservierung.
 */
async function createReservation(guestName, guestPhone, dateTime, guests, notes) {
  const reservations = loadDB();
  const id = `res-${Date.now()}`;
  const confirmationId = `MSTR-${Math.floor(1000 + Math.random() * 9000)}`;
  const reviewToken = crypto.randomBytes(12).toString('hex');

  reservations.push({
    id,
    confirmationId,
    guestName,
    guestPhone: guestPhone || '',
    dateTime,
    guests,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    reviewToken,
    reviewSent: false,
  });

  saveDB(reservations);
  console.log(`[Reservierung] ${confirmationId} — ${guestName}, ${guests} Personen, ${dateTime}`);

  return { id, confirmationId, startTime: dateTime };
}

/**
 * Sucht Reservierungen anhand des Gästnamens (case-insensitive, Teilstring).
 */
function findReservationByName(name) {
  const q = name.toLowerCase().trim();
  return loadDB().filter(r => r.guestName.toLowerCase().includes(q));
}

/**
 * Sucht Reservierungen anhand der Telefonnummer (nur Ziffern-Vergleich).
 */
function findReservationByPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return [];
  return loadDB().filter(r => r.guestPhone.replace(/\D/g, '').includes(digits));
}

/**
 * Sucht eine Reservierung anhand der Buchungs-ID (z.B. "MSTR-4821").
 */
function findReservationById(confirmationId) {
  return loadDB().find(r => r.confirmationId === confirmationId.toUpperCase()) || null;
}

module.exports = {
  checkTableAvailability,
  createReservation,
  findReservationByName,
  findReservationByPhone,
  findReservationById,
};
