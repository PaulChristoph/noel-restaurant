const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    restaurant: process.env.RESTAURANT_NAME || 'NOEL Fleestedt',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
