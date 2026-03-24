const express = require('express');
const router = express.Router();

const checkAvailability   = require('../functions/checkAvailability');
const bookAppointment     = require('../functions/bookAppointment');
const sendConfirmation    = require('../functions/sendConfirmation');
const lookupReservation   = require('../functions/lookupReservation');
const cancelAppointment   = require('../functions/cancelAppointment');
const answerFAQ           = require('../functions/answerFAQ');
const getCurrentDatetime  = require('../functions/getCurrentDatetime');
const getRecommendations  = require('../functions/getRecommendations');

/**
 * POST /retell/function-call
 * Retell AI ruft diesen Endpoint auf wenn Sofia eine Funktion ausführen soll.
 */
router.post('/function-call', async (req, res) => {
  const name        = req.body.name || req.body.function_name;
  const parameters  = req.body.args || req.body.parameters || {};
  const call_id     = req.body.call?.call_id || req.body.call_id;
  const from_number = req.body.call?.from_number || req.body.call?.caller_number || null;

  // Debug: zeigt exakt was Retell schickt (nur Felder aus call-Objekt)
  if (req.body.call) {
    const callKeys = Object.keys(req.body.call).join(', ');
    console.log(`[Retell] Call-Felder: ${callKeys}`);
    console.log(`[Retell] from_number raw: ${req.body.call.from_number} | caller_number raw: ${req.body.call.caller_number}`);
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
        result = await cancelAppointment(parameters);
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
