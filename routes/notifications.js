const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const { authenticate } = require('../middleware/auth');

// Get current user's notifications (recent first)
router.get('/my', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { patient_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Mark a notification as read
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const n = await Notification.findOne({ where: { id: req.params.id, patient_id: req.user.id } });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    n.read = true;
    n.read_at = new Date();
    await n.save();
    res.json({ success: true, notification: n });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

module.exports = router;
