function verifyRetell(req, res, next) {
  // In Production: Retell Webhook Signatur prüfen
  next();
}

module.exports = { verifyRetell };
