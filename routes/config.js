const express = require('express');
const router = express.Router();

// Returns booking availability configuration derived from env vars.
router.get('/availability', (req, res) => {
  const allowedDaysEnv = process.env.AVAILABLE_TEST_DAYS || 'Monday,Thursday';
  const allowedDays = allowedDaysEnv.split(',').map(d => d.trim());
  const opens = process.env.BUSINESS_OPEN || '08:00';
  const closes = process.env.BUSINESS_CLOSE || '17:00';

  res.json({
    success: true,
    availability: {
      allowedDays,
      opens,
      closes,
    },
  });
});

module.exports = router;
