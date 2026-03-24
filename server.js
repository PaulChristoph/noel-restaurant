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
