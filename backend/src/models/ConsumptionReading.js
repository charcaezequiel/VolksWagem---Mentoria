const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConsumptionReading = sequelize.define('ConsumptionReading', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  device_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'devices',
      key: 'id',
    },
  },
  instant_watts: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Instant watts must be positive' },
    },
  },
  accumulated_kwh_day: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Accumulated kWh must be positive' },
    },
  },
  reading_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  source: {
    type: DataTypes.ENUM('sensor', 'manual', 'estimated'),
    defaultValue: 'sensor',
    allowNull: false,
  },
}, {
  tableName: 'consumption_readings',
});

module.exports = ConsumptionReading;
