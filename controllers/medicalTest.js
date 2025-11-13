const { MedicalTest, Hospital } = require('../models');

exports.getAllTests = async (req, res) => {
  try {
    const tests = await MedicalTest.findAll({ include: Hospital });
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
