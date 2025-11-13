const { TestResult } = require('../models');

exports.getMyResults = async (req, res) => {
  try {
    const results = await TestResult.findAll({ where: { patientId: req.user.id } });
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

