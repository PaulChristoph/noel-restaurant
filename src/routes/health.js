const express = require('express');
const router = express.Router();
const { findReservationsInSheets } = require('../services/googleSheets');

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    restaurant: process.env.RESTAURANT_NAME || 'Restaurant Mustermann',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/sheets?id=MSTR-1133&name=Paul
 * Direkter Sheets-Test: prüft Credentials und Lookup.
 */
router.get('/sheets', async (req, res) => {
  const { id, name } = req.query;
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasKey   = !!process.env.GOOGLE_PRIVATE_KEY;
  const sheetsId = process.env.GOOGLE_SHEETS_ID || null;
  try {
    const results = await findReservationsInSheets({ confirmationId: id, guestName: name });
    return res.json({ hasEmail, hasKey, sheetsId, query: { id, name }, results });
  } catch (err) {
    return res.json({ hasEmail, hasKey, sheetsId, error: err.message });
  }
});

module.exports = router;
