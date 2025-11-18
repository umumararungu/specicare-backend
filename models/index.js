require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

/* -------------------------------------------
   DATABASE CONNECTION (Railway + Local)
-------------------------------------------- */

let sequelize;

// Prefer DATABASE_URL for Railway & hosted PostgreSQL
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false,
    dialectOptions: process.env.NODE_ENV === "production"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });

  console.log("Using DATABASE_URL for PostgreSQL connection");
} else {
  // Local development fallback
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      dialect: "postgres",
      logging: false,
    }
  );

  console.log("Using local PostgreSQL env variables");
}

/* -------------------------------------------
   IMPORT MODELS
-------------------------------------------- */

const User = require("./User")(sequelize, DataTypes);
const Hospital = require("./Hospital")(sequelize, DataTypes);
const Appointment = require("./Appointment")(sequelize, DataTypes);
const MedicalTest = require("./MedicalTest")(sequelize, DataTypes);
const Notification = require("./Notifications")(sequelize, DataTypes);
const TestResult = require("./TestResults")(sequelize, DataTypes);

/* -------------------------------------------
   MODEL ASSOCIATIONS
-------------------------------------------- */

// User → Appointments
User.hasMany(Appointment, { foreignKey: "patient_id", as: "appointments" });
Appointment.belongsTo(User, { foreignKey: "patient_id", as: "user" });

// User → Test Results
User.hasMany(TestResult, { foreignKey: "patient_id" });
TestResult.belongsTo(User, { foreignKey: "patient_id" });

// User → Notifications
User.hasMany(Notification, { foreignKey: "patient_id" });
Notification.belongsTo(User, { foreignKey: "patient_id" });

// Hospital → Appointments
Hospital.hasMany(Appointment, { foreignKey: "hospital_id", as: "appointments" });
Appointment.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });

// Hospital → Test Results
Hospital.hasMany(TestResult, { foreignKey: "hospital_id" });
TestResult.belongsTo(Hospital, { foreignKey: "hospital_id" });

// MedicalTest → Appointments
MedicalTest.hasMany(Appointment, { foreignKey: "test_id", as: "appointments" });
Appointment.belongsTo(MedicalTest, { foreignKey: "test_id", as: "medicalTest" });

// MedicalTest → Test Results
MedicalTest.hasMany(TestResult, { foreignKey: "test_id" });
TestResult.belongsTo(MedicalTest, { foreignKey: "test_id" });

// Appointment → Test Results
Appointment.hasMany(TestResult, { foreignKey: "appointment_id" });
TestResult.belongsTo(Appointment, { foreignKey: "appointment_id" });

/* -------------------------------------------
   EXPORT MODULE
-------------------------------------------- */

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
