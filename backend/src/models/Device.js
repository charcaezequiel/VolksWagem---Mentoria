const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define('Device', {
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
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'device_categories',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Device name is required' },
    },
  },
  nominal_watts: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Nominal watts must be positive' },
    },
  },
  min_watts: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Min watts must be positive' },
    },
  },
  max_watts: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Max watts must be positive' },
    },
  },
  hours_daily_usage: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Hours daily usage must be positive' },
      max: { args: [24], msg: 'Hours daily usage cannot exceed 24' },
    },
  },
  is_custom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'devices',
  getterMethods: {
    daily_kwh() {
      return (this.nominal_watts * this.hours_daily_usage) / 1000;
    },
  },
});

module.exports = Device;
