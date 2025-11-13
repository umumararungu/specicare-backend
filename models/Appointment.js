module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    hospital_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    test_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'appointment_date',
    },
    time_slot: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'time_slot',
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled'),
      defaultValue: 'pending',
    },
    reference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    // Note: Do NOT declare created_at/updated_at here when using Sequelize timestamps.
    // Let Sequelize manage them (with underscored: true they map to created_at/updated_at).
  }, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['reference'],
      },
      { fields: ['patient_id'] },
      { fields: ['hospital_id'] },
      { fields: ['appointment_date', 'status'] },
    ],
  });

  return Appointment;
};