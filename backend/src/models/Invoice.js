const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
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
  period_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Month must be between 1 and 12' },
      max: { args: [12], msg: 'Month must be between 1 and 12' },
    },
  },
  period_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [2000], msg: 'Year must be valid' },
    },
  },
  kwh_consumed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'kWh consumed must be positive' },
    },
  },
  amount_paid: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Amount paid must be positive' },
    },
  },
  tariff_applied: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Tariff applied must be positive' },
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'invoices',
});

module.exports = Invoice;
