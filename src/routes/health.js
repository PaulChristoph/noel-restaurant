const express = require('express');
const router = express.Router();
const { findReservationsInAirtable } = require('../services/airtable');

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    restaurant: process.env.RESTAURANT_NAME || 'Restaurant Mustermann',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/airtable?id=MSTR-1133&name=Paul
 * Direkter Airtable-Test: prüft Credentials und Lookup.
 */
router.get('/airtable', async (req, res) => {
  const { id, name } = req.query;
  const hasKey  = !!process.env.AIRTABLE_API_KEY;
  const baseId  = process.env.AIRTABLE_BASE_ID  || null;
  const tableId = process.env.AIRTABLE_TABLE_ID || null;
  try {
    const results = await findReservationsInAirtable({ confirmationId: id, guestName: name });
    return res.json({ hasKey, baseId, tableId, query: { id, name }, results });
  } catch (err) {
    return res.json({ hasKey, baseId, tableId, error: err.message });
  }
});

module.exports = router;
