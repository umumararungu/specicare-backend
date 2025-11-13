const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: console.log,
});

// Import models
const User = require('./User')(sequelize, DataTypes);
const Hospital = require('./Hospital')(sequelize, DataTypes);
const Appointment = require('./Appointment')(sequelize, DataTypes);
const MedicalTest = require('./MedicalTest')(sequelize, DataTypes);
const Notification = require('./Notifications')(sequelize, DataTypes);
const TestResult = require('./TestResults')(sequelize, DataTypes);

// ------------------------
// Associations
// ------------------------

// Users
User.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.belongsTo(User, { foreignKey: 'patient_id', as: 'user' });

User.hasMany(TestResult, { foreignKey: 'patient_id' });
TestResult.belongsTo(User, { foreignKey: 'patient_id' });

User.hasMany(Notification, { foreignKey: 'patient_id' });
Notification.belongsTo(User, { foreignKey: 'patient_id' });

// Hospitals
Hospital.hasMany(Appointment, { foreignKey: 'hospital_id', as: 'appointments' });
Appointment.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Hospital.hasMany(TestResult, { foreignKey: 'hospital_id' });
TestResult.belongsTo(Hospital, { foreignKey: 'hospital_id' });

// MedicalTests
MedicalTest.hasMany(Appointment, { foreignKey: 'test_id', as: 'appointments' });
Appointment.belongsTo(MedicalTest, { foreignKey: 'test_id', as: 'medicalTest' });

MedicalTest.hasMany(TestResult, { foreignKey: 'test_id' });
TestResult.belongsTo(MedicalTest, { foreignKey: 'test_id' });

// Appointments ↔ TestResults
Appointment.hasMany(TestResult, { foreignKey: 'appointment_id' });
TestResult.belongsTo(Appointment, { foreignKey: 'appointment_id' });


// Export models & sequelize
module.exports = {
  sequelize,
  Sequelize,
  User,
  Hospital,
  Appointment,
  MedicalTest,
  Notification,
  TestResult,
};