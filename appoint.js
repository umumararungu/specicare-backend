// debug-appointment.js
const { Sequelize, DataTypes } = require('sequelize');

// Create a test sequelize instance
const testSequelize = new Sequelize('test', 'test', 'test', {
  dialect: 'postgres',
  logging: false
});

try {
  console.log('=== Testing Appointment Model ===');
  const appointmentModel = require('./models/Appointment');
  console.log(' Appointment model function loaded');
  
  const Appointment = appointmentModel(testSequelize, DataTypes);
  console.log(' Appointment model instantiated');
  console.log('Appointment model attributes:', Object.keys(Appointment.rawAttributes));
  
} catch (error) {
  console.error(' Appointment model error:', error.message);
  console.error('Full error:', error);
}
