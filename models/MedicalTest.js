const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // from your psql connect file

module.exports = (sequelize, DataTypes) =>{
return MedicalTest = sequelize.define('medicalTest', {
id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
},
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      'radiology',
      'laboratory',
      'cardiology',
      'neurology',
      'pathology',
      'endoscopy',
      'pulmonology',
      'other'
    ),
    allowNull: false,
  },
  subcategory: {
    type: DataTypes.STRING,
  },
  hospital_id: {
    type: DataTypes.UUID,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'RWF',
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., "30 minutes"
  },
  preparation_instructions: {
    type: DataTypes.STRING(2000),
  },
  is_insurance_covered: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  insurance_co_pay: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  requirements: {
    type: DataTypes.JSONB, // store array of strings
    defaultValue: [],
  },
  tags: {
    type: DataTypes.JSONB, // store array of strings
    defaultValue: [],
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
  tableName: 'medical_tests',
  timestamps: true,
  underscored: true,
});
}
// module.exports = MedicalTest;
