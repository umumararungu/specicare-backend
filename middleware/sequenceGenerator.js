// utils/sequenceGenerator.js
const { sequelize } = require("../models");

/**
 * Generates appointment reference in format: APT-YYYY-XXXXXX
 */
async function generateAppointmentReference() {
  try {
    // Get the next value from the sequence
    const [result] = await sequelize.query(
      "SELECT nextval('appointment_ref_seq') as next_val"
    );
    const sequenceValue = result[0].next_val;
    const currentYear = new Date().getFullYear();
    
    return `APT-${currentYear}-${String(sequenceValue).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating appointment reference:', error);
    
    // If sequence doesn't exist, use fallback
    if (error.original && error.original.code === '42P01') {
      return await generateAppointmentReferenceFallback();
    }
    
    throw error;
  }
}

/**
 * Fallback method if sequence doesn't exist
 */
async function generateAppointmentReferenceFallback() {
  try {
    const currentYear = new Date().getFullYear();
    const pattern = `APT-${currentYear}-%`;
    
    const appointments = await sequelize.query(
      `SELECT reference FROM appointments 
       WHERE reference LIKE :pattern 
       ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { pattern },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    let nextSequence = 1;
    if (appointments.length > 0) {
      const lastRef = appointments[0].reference;
      const lastSequence = parseInt(lastRef.split('-')[2]) || 0;
      nextSequence = lastSequence + 1;
    }
    
    return `APT-${currentYear}-${String(nextSequence).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error in fallback reference generation:', error);
    // Ultimate fallback - timestamp based
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `APT-${timestamp}-${random}`;
  }
}

module.exports = {
  generateAppointmentReference,
  generateAppointmentReferenceFallback
};