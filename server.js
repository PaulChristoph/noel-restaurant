require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { verifyRetell } = require('./src/middleware/verifyRetell');

const app = express();
const PORT = process.env.PORT || 3000;

// Raw Body für Retell Webhook
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    try { req.body = JSON.parse(data); } catch { req.body = {}; }
    next();
  });
});

app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

// Routen
app.use('/retell', verifyRetell, require('./src/routes/retell'));
app.use('/health', require('./src/routes/health'));
app.use('/api', require('./src/routes/api'));
app.use('/whatsapp', require('./src/routes/whatsapp'));

app.get('/verify/:id', async (req, res) => {
  const confirmationId = req.params.id;
  try {
    const { verifyReservationInAirtable } = require('./src/services/airtable');
    await verifyReservationInAirtable(confirmationId);
    res.send(`
      <html>
        <head>
          <title>Buchung best&auml;tigt</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px 20px; background: #f9fafb; color: #111827; }
            h1 { color: #059669; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>&check; Vielen Dank!</h1>
            <p>Ihre Reservierung wurde erfolgreich best&auml;tigt. Wir freuen uns auf Ihren Besuch im NOEL restaurant&middot;bar&middot;hotel.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[Verify] Fehler:', err.message);
    res.status(500).send('<h1>Fehler</h1><p>Ihre Reservierung konnte momentan nicht verifiziert werden. Bitte rufen Sie uns an.</p>');
  }
});

// Debug: zeigt welche Routen registriert sind
app.get('/debug/routes', (req, res) => {
  res.json({ version: '2.1.0-whatsapp', routes: ['retell','health','api','whatsapp','verify'] });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Nicht gefunden' }));

// Fehler-Handler
app.use((err, req, res, next) => {
  console.error('[Fehler]', err.message);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`[Server] KI-Telefonassistent läuft auf Port ${PORT}`);
  console.log(`[Server] Restaurant: ${process.env.RESTAURANT_NAME || 'Restaurant Mustermann'}`);
});
