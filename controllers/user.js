const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { normalizePhone } = require('../utils/phone');

exports.register = async (req, res) => {
  try {
  const { name, email, password, phone, gender, dateOfBirth, role } = req.body;
  // Note: uniqueness check for email removed to allow multiple users with the same email

    // Normalize phone to E.164 and reject if invalid
    const normalizedPhone = normalizePhone(phone);
    if (phone && !normalizedPhone) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: normalizedPhone || null,
      gender,
      dateOfBirth,
      role: role || 'patient',
      isActive: true,
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Record recent activity: user registration
    try {
      const { recordActivity } = require('../services/activity');
      await recordActivity({
        patientId: newUser.id,
        type: 'system_alert',
        title: 'Account created',
        message: `User ${newUser.name || newUser.email} registered`,
        data: { userId: newUser.id, email: newUser.email },
        channels: [],
        priority: 'low',
      });
    } catch (e) {
      console.error('Failed to record registration activity:', e);
    }

    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
