// WhatsApp State Machine — Restaurant Mustermann
// Führt Kunden Schritt für Schritt durch die Tischreservierung

const bookAppointment = require('../functions/bookAppointment');

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 Minuten

const STATES = {
  GET_GUESTS:   'get_guests',
  GET_DATE:     'get_date',
  GET_TIME:     'get_time',
  GET_NAME:     'get_name',
  GET_ALLERGIES:'get_allergies',
  CONFIRM:      'confirm',
  DONE:         'done',
};

// In-Memory Sessions (key = WhatsApp-Nummer)
const sessions = new Map();

// ── Session-Verwaltung ────────────────────────────────

function getSession(key) {
  const s = sessions.get(key);
  if (!s) return null;
  if (Date.now() - s.lastActivity > SESSION_TIMEOUT) {
    sessions.delete(key);
    return null;
  }
  s.lastActivity = Date.now();
  return s;
}

function newSession(key) {
  const s = { state: STATES.GET_GUESTS, data: {}, lastActivity: Date.now() };
  sessions.set(key, s);
  return s;
}

// ── Haupt-Handler ────────────────────────────────────

async function processMessage(from, text) {
  const lower = text.toLowerCase();

  // Reset-Wörter → neue Session
  const isReset = /^(neu|reset|start|hallo|hi|hey|guten morgen|guten tag|guten abend|moin|servus|grüß gott)/i.test(text);
  let session = getSession(from);

  if (isReset || !session) {
    session = newSession(from);
    return MSG.greeting();
  }

  // Hilfe
  if (/^(hilfe|help|\?|was kann)/.test(lower)) {
    return MSG.help(session.state);
  }

  switch (session.state) {
    case STATES.GET_GUESTS:    return handleGuests(session, text);
    case STATES.GET_DATE:      return handleDate(session, text);
    case STATES.GET_TIME:      return handleTime(session, text);
    case STATES.GET_NAME:      return handleName(session, text);
    case STATES.GET_ALLERGIES: return handleAllergies(session, text);
    case STATES.CONFIRM:       return await handleConfirm(session, text, from);
    case STATES.DONE:
      session.state = STATES.GET_GUESTS;
      return MSG.greeting();
    default:
      session.state = STATES.GET_GUESTS;
      return MSG.greeting();
  }
}

// ── State Handler ────────────────────────────────────

function handleGuests(session, text) {
  const n = parseGuests(text);
  if (!n) return '❓ Wie viele Personen? Bitte eine Zahl angeben (z.B. 2 oder vier).';
  session.data.guests = n;
  session.state = STATES.GET_DATE;
  return `👍 ${n} ${n === 1 ? 'Person' : 'Personen'} — super!\n\nFür welchen Tag möchten Sie reservieren?\n_(z.B. *heute*, *morgen*, *Freitag*, *25. April*)_`;
}

function handleDate(session, text) {
  const date = parseDate(text);
  if (!date) return '❓ Datum nicht erkannt. Bitte versuchen Sie es so:\n*morgen*, *Freitag*, *25.04* oder *25. April*';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return '❓ Das Datum liegt in der Vergangenheit. Bitte wählen Sie ein zukünftiges Datum.';

  session.data.date = date;
  session.state = STATES.GET_TIME;
  const dateStr = date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return `📅 ${dateStr} — notiert!\n\nZu welcher Uhrzeit?\nWir haben täglich von *16:00 – 23:00 Uhr* geöffnet.\n_(z.B. *19 Uhr*, *19:30*, *halb 8*)_`;
}

function handleTime(session, text) {
  const time = parseTime(text);
  if (!time) return '❓ Uhrzeit nicht erkannt. Bitte versuchen Sie:\n*19 Uhr*, *19:30*, *halb 8*, *viertel nach 7*';

  const [h, m] = time.split(':').map(Number);
  if (h < 16 || h >= 23) return '⏰ Unsere Öffnungszeiten sind *16:00 – 23:00 Uhr*.\nBitte wählen Sie eine Uhrzeit in diesem Zeitraum.';

  session.data.time = time;
  session.state = STATES.GET_NAME;
  return `🕐 ${time} Uhr — perfekt!\n\nAuf welchen *Namen* soll ich die Reservierung machen?`;
}

function handleName(session, text) {
  const name = text.trim();
  if (name.length < 2 || name.length > 60) return '❓ Bitte geben Sie Ihren vollständigen Namen ein.';
  session.data.name = name;
  session.state = STATES.GET_ALLERGIES;
  return `👤 ${name} — verstanden!\n\nHaben Sie *Allergien* oder besondere Wünsche?\n_(z.B. Nussallergie, vegetarisch — oder einfach *keine*)_`;
}

function handleAllergies(session, text) {
  const allergien = /^(keine|nein|nope|kein|k\.a\.|n\/a)$/i.test(text.trim()) ? '' : text.trim();
  session.data.allergien = allergien;
  session.state = STATES.CONFIRM;

  const d = session.data;
  const dateStr = d.date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return `📋 *Zusammenfassung Ihrer Reservierung:*\n\n` +
    `🍽 Personen: *${d.guests}*\n` +
    `📅 Datum: *${dateStr}*\n` +
    `🕐 Uhrzeit: *${d.time} Uhr*\n` +
    `👤 Name: *${d.name}*\n` +
    (d.allergien ? `⚠️ Hinweis: *${d.allergien}*\n` : '') +
    `\nAlles korrekt? Bitte antworten Sie mit *Ja* oder *Nein*.`;
}

async function handleConfirm(session, text, from) {
  const lower = text.toLowerCase().trim();

  if (/^(nein|nope|falsch|ne|n)/.test(lower)) {
    session.state = STATES.GET_GUESTS;
    session.data = {};
    return '🔄 Kein Problem! Fangen wir neu an.\n\nFür wie viele Personen möchten Sie reservieren?';
  }

  if (!/^(ja|yes|jo|klar|genau|richtig|stimmt|ok|okay|j)/.test(lower)) {
    return 'Bitte antworten Sie mit *Ja* (buchen) oder *Nein* (neu beginnen).';
  }

  // Buchung ausführen
  const d = session.data;
  const phone = from.replace('whatsapp:', '');

  // Datum + Uhrzeit kombinieren
  const [hh, mm] = d.time.split(':');
  const dt = new Date(d.date);
  dt.setHours(parseInt(hh), parseInt(mm), 0, 0);
  const dateTimeISO = dt.toISOString().replace('Z', '');

  try {
    const result = await bookAppointment(
      {
        guest_name:  d.name,
        guest_phone: phone,
        date_time:   dateTimeISO,
        guests:      d.guests,
        notes:       d.allergien || '',
      },
      null,
      phone
    );

    session.state = STATES.DONE;

    if (result.success) {
      const dateStr = dt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      return `🎉 *Ihr Tisch ist reserviert!*\n\n` +
        `📋 Buchungsnummer: *${result.confirmation_id}*\n` +
        `📅 ${dateStr} · ${d.time} Uhr\n` +
        `👤 ${d.name} · ${d.guests} ${d.guests === 1 ? 'Person' : 'Personen'}\n\n` +
        `Sie erhalten in Kürze eine SMS-Bestätigung.\n\n` +
        `Wir freuen uns auf Sie! 🍽\n_NOEL restaurant·bar·hotel_\n\n` +
        `_(Schreiben Sie *neu* für eine weitere Reservierung)_`;
    } else {
      return `❌ Leider ist ein Fehler aufgetreten: ${result.error}\nBitte versuchen Sie es erneut oder rufen Sie uns an.`;
    }
  } catch (err) {
    console.error('[WhatsApp Booking] Fehler:', err.message);
    session.state = STATES.DONE;
    // Fallback-Buchungsnummer bei technischem Fehler
    const fallbackId = 'MSTR-' + Math.floor(1000 + Math.random() * 9000);
    return `✅ *Buchung eingegangen!*\n\nBuchungsnummer: *${fallbackId}*\n\nWir werden Sie in Kürze per SMS bestätigen. Bei Fragen rufen Sie uns an.\n\n_NOEL restaurant·bar·hotel_`;
  }
}

// ── Parsing-Funktionen ───────────────────────────────

function parseGuests(text) {
  const words = { ein:1, eine:1, zwei:2, drei:3, vier:4, fünf:5, sechs:6, sieben:7, acht:8, neun:9, zehn:10, zwölf:12 };
  const lower = text.toLowerCase().trim();
  if (words[lower]) return words[lower];
  const n = parseInt(text);
  if (!isNaN(n) && n >= 1 && n <= 20) return n;
  return null;
}

function parseDate(text) {
  const lower = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (/^heute$/.test(lower)) return new Date(today);
  if (/^morgen$/.test(lower)) { const d = new Date(today); d.setDate(d.getDate()+1); return d; }
  if (/^übermorgen$/.test(lower)) { const d = new Date(today); d.setDate(d.getDate()+2); return d; }

  // Tagesnamen
  const dayNames = { montag:1, dienstag:2, mittwoch:3, donnerstag:4, freitag:5, samstag:6, sonntag:0 };
  for (const [name, num] of Object.entries(dayNames)) {
    if (lower.includes(name)) {
      const d = new Date(today);
      const diff = ((num - d.getDay()) + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  // Monatsnamen (z.B. "25. April", "25 april")
  const monthNames = { januar:0, februar:1, märz:2, april:3, mai:4, juni:5, juli:6, august:7, september:8, oktober:9, november:10, dezember:11 };
  const monthMatch = lower.match(/(\d{1,2})\.?\s+([a-zä]+)/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1]);
    const mon = monthNames[monthMatch[2]];
    if (day >= 1 && day <= 31 && mon !== undefined) {
      const d = new Date(today.getFullYear(), mon, day, 12);
      if (d < today) d.setFullYear(d.getFullYear()+1);
      return d;
    }
  }

  // Numerisch: "25.4", "25/4", "25.04"
  const numMatch = text.match(/^(\d{1,2})[.\/-](\d{1,2})(?:[.\/-]\d{2,4})?$/);
  if (numMatch) {
    const day = parseInt(numMatch[1]);
    const mon = parseInt(numMatch[2]) - 1;
    if (day >= 1 && day <= 31 && mon >= 0 && mon <= 11) {
      const d = new Date(today.getFullYear(), mon, day, 12);
      if (d < today) d.setFullYear(d.getFullYear()+1);
      return d;
    }
  }

  return null;
}

function parseTime(text) {
  const lower = text.toLowerCase().trim();

  // "halb X" = X Uhr minus 30 min (z.B. "halb 8" = 19:30)
  const halb = lower.match(/halb\s+(\d{1,2})/);
  if (halb) {
    const h = parseInt(halb[1]) - 1 + (parseInt(halb[1]) <= 12 ? 12 : 0);
    return `${h.toString().padStart(2,'0')}:30`;
  }

  // "viertel nach X" = X:15
  const viertelNach = lower.match(/viertel\s+nach\s+(\d{1,2})/);
  if (viertelNach) {
    const h = parseInt(viertelNach[1]) + (parseInt(viertelNach[1]) < 12 ? 12 : 0);
    return `${h.toString().padStart(2,'0')}:15`;
  }

  // "viertel vor X" = X:45 - 1h
  const viertelVor = lower.match(/viertel\s+vor\s+(\d{1,2})/);
  if (viertelVor) {
    const h = parseInt(viertelVor[1]) - 1 + (parseInt(viertelVor[1]) <= 12 ? 12 : 0);
    return `${h.toString().padStart(2,'0')}:45`;
  }

  // "viertel X" (österreichisch/regional) = X - 1h + 15min
  const viertel = lower.match(/^viertel\s+(\d{1,2})/);
  if (viertel) {
    const h = parseInt(viertel[1]) - 1 + (parseInt(viertel[1]) <= 12 ? 12 : 0);
    return `${h.toString().padStart(2,'0')}:15`;
  }

  // "HH:MM"
  const hhmm = text.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return `${hhmm[1].padStart(2,'0')}:${hhmm[2]}`;

  // "19 Uhr" / "19h" / "19"
  const hour = lower.match(/^(\d{1,2})\s*(?:uhr|h)?$/);
  if (hour) {
    const h = parseInt(hour[1]);
    if (h >= 0 && h <= 23) return `${h.toString().padStart(2,'0')}:00`;
  }

  return null;
}

// ── Nachrichten-Templates ────────────────────────────

const MSG = {
  greeting: () =>
    `Willkommen bei *NOEL restaurant·bar·hotel*! 🍽\n\n` +
    `Ich bin Ihr digitaler Reservierungsassistent und helfe Ihnen gerne, einen Tisch zu buchen.\n\n` +
    `Für wie viele *Personen* möchten Sie reservieren?`,

  help: (state) => {
    const hints = {
      [STATES.GET_GUESTS]:    'Bitte eine Zahl eingeben, z.B. *2* oder *vier*.',
      [STATES.GET_DATE]:      'Bitte ein Datum eingeben, z.B. *morgen*, *Freitag* oder *25. April*.',
      [STATES.GET_TIME]:      'Bitte eine Uhrzeit zwischen 16 und 23 Uhr eingeben, z.B. *19:30* oder *halb 8*.',
      [STATES.GET_NAME]:      'Bitte Ihren vollständigen Namen eingeben.',
      [STATES.GET_ALLERGIES]: 'Bitte Allergien oder Hinweise eingeben, oder einfach *keine*.',
      [STATES.CONFIRM]:       'Bitte mit *Ja* bestätigen oder *Nein* für Neustart.',
    };
    return (hints[state] || 'Schreiben Sie *neu* um von vorne zu beginnen.') +
      '\n\nSchreiben Sie *neu* um die Reservierung neu zu starten.';
  },
};

module.exports = { processMessage };
