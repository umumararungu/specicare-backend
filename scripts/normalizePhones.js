// scripts/normalizePhones.js
// One-off script to normalize phone numbers in Users and Hospitals tables.
const { User, Hospital, sequelize } = require('../models');
const { normalizePhone } = require('../utils/phone');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const users = await User.findAll();
    for (const u of users) {
      const normalized = normalizePhone(u.phone);
      if (normalized && normalized !== u.phone) {
        console.log(`Updating user ${u.id} phone: ${u.phone} -> ${normalized}`);
        u.phone = normalized;
        await u.save();
      }
    }

    const hospitals = await Hospital.findAll();
    for (const h of hospitals) {
      if (h.phone) {
        const normalized = normalizePhone(h.phone);
        if (normalized && normalized !== h.phone) {
          console.log(`Updating hospital ${h.id} phone: ${h.phone} -> ${normalized}`);
          h.phone = normalized;
          await h.save();
        }
      }
      if (h.emergency_phone) {
        const normalized = normalizePhone(h.emergency_phone);
        if (normalized && normalized !== h.emergency_phone) {
          console.log(`Updating hospital ${h.id} emergency_phone: ${h.emergency_phone} -> ${normalized}`);
          h.emergency_phone = normalized;
          await h.save();
        }
      }
    }

    console.log('Phone normalization complete');
    process.exit(0);
  } catch (err) {
    console.error('Error normalizing phones', err);
    process.exit(1);
  }
}

run();
