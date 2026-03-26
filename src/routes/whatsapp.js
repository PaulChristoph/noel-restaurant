// WhatsApp Webhook — Restaurant Mustermann
// Empfängt eingehende Twilio-WhatsApp-Nachrichten und antwortet via TwiML

const router = require('express').Router();
const twilio = require('twilio');
const { processMessage } = require('../services/whatsappSession');

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
