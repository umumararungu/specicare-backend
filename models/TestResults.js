const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
module.exports = (sequelize, DataTypes) =>{
return TestResult = sequelize.define('testResult', {
id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
},
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  test_id:{
      type:DataTypes.UUID,
      allowNull:false,
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  hospital_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  files: {
    type: DataTypes.JSONB, 
    defaultValue: [],
  },
  numeric_results: {  
    type: DataTypes.JSONB,  
    defaultValue: [],  
  },
  text_results: {
    type: DataTypes.JSONB, 
    defaultValue: {},
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'verified', 'amended', 'cancelled'),
    defaultValue: 'pending',
  },

  priority: {
    type: DataTypes.ENUM('routine', 'urgent', 'stat'),
    defaultValue: 'routine',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'test_results',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (result) => {
      result.updated_at = new Date();
    },
  },
});

// Virtual getters
Object.defineProperty(TestResult.prototype, 'isVerified', {
  get() {
    return this.status === 'verified' && !!this.verified_by;
  },
});

Object.defineProperty(TestResult.prototype, 'hasCriticalValues', {
  get() {
    return (this.numeric_results || []).some(r => r.interpretation === 'critical');
  },
});

Object.defineProperty(TestResult.prototype, 'ageInDays', {
  get() {
    const created = this.created_at ? new Date(this.created_at) : new Date();
    return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  },
});

}

