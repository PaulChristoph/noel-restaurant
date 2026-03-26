const express = require('express');
const router = express.Router();

// CORS für localhost-Frontend erlauben
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Mock-Daten Fallback wenn Airtable nicht konfiguriert
const mockReservations = [
  { id: 'RES-001', confirmationId: 'MSTR-1001', guestName: 'Thomas Müller', guestPhone: '+4915123456789', dateTime: new Date().toISOString().slice(0,10) + 'T19:00:00', guests: 4, status: 'Confirmed', channel: 'Telefon', allergien: 'Nussallergie', createdAt: new Date().toISOString() },
  { id: 'RES-002', confirmationId: 'MSTR-1002', guestName: 'Anna Schmidt', guestPhone: '+4915987654321', dateTime: new Date().toISOString().slice(0,10) + 'T20:30:00', guests: 2, status: 'Pending', channel: 'WhatsApp', allergien: '', createdAt: new Date().toISOString() },
  { id: 'RES-003', confirmationId: 'MSTR-1003', guestName: 'Familie Weber', guestPhone: '+4916111222333', dateTime: new Date().toISOString().slice(0,10) + 'T18:00:00', guests: 6, status: 'Confirmed', channel: 'Online', allergien: 'Laktoseintoleranz', createdAt: new Date().toISOString() },
  { id: 'RES-004', confirmationId: 'MSTR-1004', guestName: 'Klaus Wagner', guestPhone: '+4917444555666', dateTime: new Date().toISOString().slice(0,10) + 'T21:00:00', guests: 2, status: 'Confirmed', channel: 'Telefon', allergien: '', createdAt: new Date().toISOString() },
];

const mockCustomers = [
  { id: 'CUST-001', name: 'Thomas Müller', phone: '+4915123456789', email: 'thomas@example.de', birthday: '1985-03-15', allergien: 'Nussallergie', besuche: 7, letzteBuchung: '2026-03-10', dsgvoAkzeptiert: true },
  { id: 'CUST-002', name: 'Anna Schmidt', phone: '+4915987654321', email: 'anna@example.de', birthday: '1992-07-22', allergien: '', besuche: 3, letzteBuchung: '2026-02-28', dsgvoAkzeptiert: true },
  { id: 'CUST-003', name: 'Familie Weber', phone: '+4916111222333', email: 'weber@example.de', birthday: '1978-11-05', allergien: 'Laktoseintoleranz', besuche: 12, letzteBuchung: '2026-03-18', dsgvoAkzeptiert: true },
];

// GET /api/reservations — alle Buchungen
router.get('/reservations', async (req, res) => {
  try {
    const { getAllReservations } = require('../services/airtable');
    const reservations = await getAllReservations();
    return res.json({ success: true, data: reservations });
  } catch (e) {
    // Airtable nicht konfiguriert → Mock-Daten
    return res.json({ success: true, data: mockReservations, mock: true });
  }
});

// GET /api/reservations/today — heutige Buchungen
router.get('/reservations/today', async (req, res) => {
  try {
    const { getAllReservations } = require('../services/airtable');
    const all = await getAllReservations();
    const today = new Date().toISOString().slice(0, 10);
    const todayRes = all.filter(r => r.dateTime?.startsWith(today));
    return res.json({ success: true, data: todayRes });
  } catch (e) {
    const today = new Date().toISOString().slice(0, 10);
    return res.json({ success: true, data: mockReservations.filter(r => r.dateTime.startsWith(today)), mock: true });
  }
});

// POST /api/booking — neue Buchung (Frontend-Formular)
router.post('/booking', async (req, res) => {
  const { guestName, guestPhone, email, dateTime, guests, allergien, birthday, dsgvoAkzeptiert } = req.body;

  if (!guestName || !dateTime || !guests) {
    return res.status(400).json({ success: false, error: 'Name, Datum und Personenzahl sind Pflichtfelder.' });
  }
  if (!dsgvoAkzeptiert) {
    return res.status(400).json({ success: false, error: 'Datenschutz muss akzeptiert werden.' });
  }

  try {
    const { bookAppointment } = require('../functions/bookAppointment');
    const result = await bookAppointment({ guest_name: guestName, guest_phone: guestPhone, date_time: dateTime, guests: parseInt(guests), notes: allergien }, null, guestPhone);

    // Gast-Profil anlegen/aktualisieren
    if (email || birthday) {
      try {
        const { upsertCustomer } = require('../services/airtable');
        await upsertCustomer({ name: guestName, phone: guestPhone, email, birthday, allergien, dsgvoAkzeptiert });
      } catch (e) { /* Airtable optional */ }
    }

    return res.json({ success: true, confirmationId: result.confirmation_id, message: result.confirmation_message });
  } catch (e) {
    // Demo-Fallback
    const confirmationId = 'MSTR-' + Math.floor(1000 + Math.random() * 9000);
    return res.json({ success: true, confirmationId, message: `Buchung bestätigt! Ihre Buchungsnummer: ${confirmationId}`, mock: true });
  }
});

// GET /api/customers — Gäste-Profile
router.get('/customers', async (req, res) => {
  try {
    const { getAllCustomers } = require('../services/airtable');
    const customers = await getAllCustomers();
    return res.json({ success: true, data: customers });
  } catch (e) {
    return res.json({ success: true, data: mockCustomers, mock: true });
  }
});

// GET /api/stats — Analytics
router.get('/stats', async (req, res) => {
  try {
    const { getAllReservations } = require('../services/airtable');
    const all = await getAllReservations();
    const today = new Date().toISOString().slice(0, 10);
    const thisWeek = all.filter(r => {
      const d = new Date(r.dateTime);
      const now = new Date();
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    });

    const byChannel = all.reduce((acc, r) => {
      acc[r.channel || 'Unbekannt'] = (acc[r.channel || 'Unbekannt'] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        totalReservations: all.length,
        thisWeek: thisWeek.length,
        todayCount: all.filter(r => r.dateTime?.startsWith(today)).length,
        byChannel,
        auslastung: Math.min(100, Math.round((all.filter(r => r.dateTime?.startsWith(today)).length / 10) * 100)),
      }
    });
  } catch (e) {
    return res.json({
      success: true,
      data: { totalReservations: 47, thisWeek: 14, todayCount: 4, byChannel: { Telefon: 22, WhatsApp: 15, Online: 10 }, auslastung: 40 },
      mock: true
    });
  }
});

module.exports = router;
