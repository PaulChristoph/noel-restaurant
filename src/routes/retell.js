const express = require('express');
const router = express.Router();

const checkAvailability      = require('../functions/checkAvailability');
const bookAppointment        = require('../functions/bookAppointment');
const sendConfirmation       = require('../functions/sendConfirmation');
const lookupReservation      = require('../functions/lookupReservation');
const cancelAppointment      = require('../functions/cancelAppointment');
const rescheduleAppointment  = require('../functions/rescheduleAppointment');
const answerFAQ              = require('../functions/answerFAQ');
const getCurrentDatetime     = require('../functions/getCurrentDatetime');
const getRecommendations     = require('../functions/getRecommendations');
const { findReservationsInAirtable } = require('../services/airtable');

/**
 * GET /retell/debug-airtable?id=MSTR-1133
 * Direkter Airtable-Test.
 */
router.get('/debug-airtable', async (req, res) => {
  const id = req.query.id || '';
  try {
    const results = await findReservationsInAirtable({ confirmationId: id });
    const baseId  = process.env.AIRTABLE_BASE_ID  || 'NICHT GESETZT';
    const tableId = process.env.AIRTABLE_TABLE_ID || 'NICHT GESETZT';
    const hasAuth = !!process.env.AIRTABLE_API_KEY;
    return res.json({ baseId, tableId, hasAuth, searchId: id, results });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

/**
 * POST /retell/function-call
 * Retell AI ruft diesen Endpoint auf wenn Sofia eine Funktion ausführen soll.
 */
router.post('/function-call', async (req, res) => {
  const name        = req.body.name || req.body.function_name;
  const parameters  = req.body.args || req.body.parameters || {};
  const call_id     = req.body.call?.call_id || req.body.call_id;
  const from_number = req.body.call?.from_number || req.body.call?.caller_number || null;

  if (req.body.call) {
    const callKeys = Object.keys(req.body.call).join(', ');
    console.log(`[Retell] Call-Felder: ${callKeys}`);
    console.log(`[Retell] from_number: ${req.body.call.from_number} | caller_number: ${req.body.call.caller_number}`);
  }
  console.log(`[Retell] Funktion: ${name} | Call: ${call_id} | Von: ${from_number || 'unbekannt'}`);

  try {
    let result;

    switch (name) {
      case 'check_availability':
        result = await checkAvailability(parameters);
        break;

      case 'book_appointment':
        result = await bookAppointment(parameters, call_id, from_number);
        break;

      case 'send_confirmation':
        result = await sendConfirmation(parameters);
        break;

      case 'lookup_reservation':
        result = await lookupReservation(parameters, call_id, from_number);
        break;

      case 'cancel_appointment':
        result = await cancelAppointment(parameters, call_id, from_number);
        break;

      case 'reschedule_appointment':
        result = await rescheduleAppointment(parameters, call_id, from_number);
        break;

      case 'answer_faq':
        result = answerFAQ(parameters);
        break;

      case 'get_current_datetime':
        result = getCurrentDatetime();
        break;

      case 'get_recommendations':
        result = getRecommendations(parameters);
        break;

      default:
        console.warn(`[Retell] Unbekannte Funktion: ${name}`);
        result = { error: `Unbekannte Funktion: ${name}` };
    }

    return res.status(200).json({ result });

  } catch (err) {
    console.error(`[Retell] Fehler bei ${name}:`, err.message);
    return res.status(200).json({
      result: {
        error: true,
        message: 'Es ist ein technischer Fehler aufgetreten. Bitte rufen Sie uns direkt unter 04105 676 33 02 an.',
      },
    });
  }
});

module.exports = router;
