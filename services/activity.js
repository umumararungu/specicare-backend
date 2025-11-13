const { Notification } = require('../models');

/**
 * Record an activity/notification in the database.
 * @param {Object} opts
 * @param {number|string} opts.patientId - id of the patient/user related to the activity
 * @param {string} opts.type - one of Notification.type enum values
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {Object} [opts.data] - arbitrary JSON data
 * @param {Array} [opts.channels] - e.g. ['sms','email']
 * @param {string} [opts.priority]
 */
async function recordActivity({ patientId, type = 'system_alert', title = '', message = '', data = {}, channels = [], priority = 'medium' }) {
  try {
    if (!patientId) {
      console.warn('recordActivity called without patientId, skipping');
      return null;
    }

    const n = await Notification.create({
      patientId,
      type,
      title: title || message.substring(0, 120),
      message: message || title,
      data: data || {},
      channels: channels || [],
      priority: priority || 'medium',
    });

    return n;
  } catch (err) {
    console.error('Error recording activity:', err);
    return null;
  }
}

module.exports = { recordActivity };
