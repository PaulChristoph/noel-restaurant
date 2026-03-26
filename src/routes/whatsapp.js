// WhatsApp Webhook — Restaurant Mustermann
// Empfängt eingehende Twilio-WhatsApp-Nachrichten und antwortet via TwiML

const router = require('express').Router();
const twilio = require('twilio');
const { processMessage } = require('../services/whatsappSession');

// Inbound SMS — loggt alle eingehenden SMS (z.B. Verification Codes)
router.post('/sms-in', (req, res) => {
  const params = new URLSearchParams(req.rawBody || '');
  const from = params.get('From') || '';
  const body = params.get('Body') || '';
  console.log(`[SMS-IN] Von: ${from} | Nachricht: ${body}`);
  res.type('text/xml').send('<Response></Response>');
});

// Inbound Voice Call — nimmt Anruf an, gibt Code per Speech zurück (für Meta Verification)
router.post('/voice-in', (req, res) => {
  const params = new URLSearchParams(req.rawBody || '');
  const from = params.get('From') || '';
  console.log(`[VOICE-IN] Anruf von: ${from}`);
  // Anruf annehmen und aufnehmen damit der Code hörbar ist
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Bitte sagen Sie Ihren Code nach dem Signalton.</Say>
  <Record maxLength="10" transcribe="true" transcribeCallback="/whatsapp/voice-transcription" />
</Response>`);
});

// Transkription des Anruf-Codes
router.post('/voice-transcription', (req, res) => {
  const params = new URLSearchParams(req.rawBody || '');
  const text = params.get('TranscriptionText') || '';
  const recording = params.get('RecordingUrl') || '';
  console.log(`[VOICE-CODE] *** VERIFICATION CODE: ${text} *** | Recording: ${recording}`);
  res.sendStatus(200);
});

router.post('/incoming', async (req, res) => {
  // server.js setzt req.rawBody (x-www-form-urlencoded von Twilio)
  const params = new URLSearchParams(req.rawBody || '');
  const from = params.get('From') || '';  // z.B. "whatsapp:+4917612345678"
  const body = params.get('Body') || '';

  console.log(`[WhatsApp] ${from}: ${body}`);

  const reply = await processMessage(from, body.trim());

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});

module.exports = router;
