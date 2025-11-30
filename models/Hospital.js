// models/Hospital.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


module.exports = (sequelize, DataTypes) =>{
return Hospital = sequelize.define('hospital', {
id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
},
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
    province: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    district: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sector: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    street: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  facilities: {
    type: DataTypes.JSONB, // e.g. ["X-ray", "CT Scan", "Emergency"]
    defaultValue: [],
  },
  registration_number: {
    type: DataTypes.STRING(100),
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'hospitals',
  timestamps: true,
  underscored: true,
});
}
// module.exports = Hospital;
