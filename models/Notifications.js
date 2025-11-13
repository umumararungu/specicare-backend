const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
module.exports = (sequelize, DataTypes) => {
  return Notification = sequelize.define('Notification', {
    // Keep attribute name `patientId` in JS but map to DB column `patient_id`
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'patient_id',
    },
  type: {
    type: DataTypes.ENUM(
      'appointment_confirmation',
      'appointment_reminder',
      'result_ready',
      'payment_success',
      'payment_failure',
      'cancellation',
      'rescheduling',
      'system_alert',
      'promotional'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  channels: {
    type: DataTypes.JSONB, // e.g. ["sms", "email", "push"]
    defaultValue: [],
  },
    delivery_status: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  read_at: {
    type: DataTypes.DATE,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
  },
  expires_at: {
    type: DataTypes.DATE,
  },
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
  });
};

