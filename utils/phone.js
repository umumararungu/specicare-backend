const { parsePhoneNumberFromString } = require('libphonenumber-js');
require('dotenv').config();

const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || 'RW';

/**
 * Normalize a phone number to E.164 format using libphonenumber-js.
 * Returns the E.164 string (e.g. +250788123456) or null if invalid.
 */
function normalizePhone(raw, defaultCountry = DEFAULT_COUNTRY) {
  if (!raw) return null;
  const str = String(raw).trim();
  const pn = parsePhoneNumberFromString(str, defaultCountry);
  if (!pn) return null;
  if (!pn.isValid()) return null;
  return pn.number; // E.164 format
}

function isValidPhone(raw, defaultCountry = DEFAULT_COUNTRY) {
  return !!normalizePhone(raw, defaultCountry);
}

module.exports = {
  normalizePhone,
  isValidPhone,
};
