// models/User.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'user',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING(255),
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

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      insurance_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
      },

      district: DataTypes.STRING,
      sector: DataTypes.STRING,

      role: {
        type: DataTypes.ENUM('patient', 'admin', 'hospital_staff'),
        defaultValue: 'patient',
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'users',
      timestamps: false,
      underscored: true,

      hooks: {
        // Hash password before saving
        beforeSave: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(user.password, salt);
          }

          user.updated_at = new Date();
        },
      },
    }
  );

  // ----------------------------
  // INSTANCE METHODS
  // ----------------------------

  // Compare password
  User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // Remove password from JSON
  User.prototype.toJSON = function () {
    const user = { ...this.get() };
    delete user.password;
    return user;
  };

  return User;
};
