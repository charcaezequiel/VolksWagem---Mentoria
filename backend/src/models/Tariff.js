const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tariff = sequelize.define('Tariff', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  province_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'provinces',
      key: 'id',
    },
  },
  tariff_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Tariff name is required' },
    },
  },
  category: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tier_from: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Tier from must be non-negative' },
    },
  },
  tier_to: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Tier to must be non-negative' },
    },
  },
  price_per_kwh: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Price per kWh must be positive' },
    },
  },
  price_per_kwh_n2: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Price per kWh N2 must be non-negative' },
    },
  },
  price_per_kwh_n3: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Price per kWh N3 must be non-negative' },
    },
  },
  fixed_charge: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Fixed charge must be non-negative' },
    },
  },
  estimated_min_n1: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  estimated_max_n1: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  estimated_min_n2: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  estimated_max_n2: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  estimated_min_n3: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  estimated_max_n3: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  effective_from: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  effective_to: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  is_current: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'tariffs',
});

module.exports = Tariff;
