// routes/medicalTests.js
const express = require('express');
const { MedicalTest } = require('../models');
const router = express.Router();

// Get all medical tests
router.get('/', async (req, res) => {
  try {
    const tests = await MedicalTest.findAll({
      where: { is_available: true },
      order: [['name', 'ASC']]
    });

    res.json(tests);
  } catch (error) {
    console.error('Get medical tests error:', error);
    res.status(500).json({ 
      message: 'Error fetching medical tests',
      error: error.message 
    });
  }
});

// Get single medical test
router.get('/:id', async (req, res) => {
  try {
    const test = await MedicalTest.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Medical test not found' });
    }

    res.json(test);
  } catch (error) {
    console.error('Get medical test error:', error);
    res.status(500).json({ 
      message: 'Error fetching medical test',
      error: error.message 
    });
  }
});

module.exports = router;