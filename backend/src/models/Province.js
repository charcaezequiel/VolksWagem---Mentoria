const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Province = sequelize.define('Province', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Province name is required' },
      len: { args: [2, 150], msg: 'Province name must be between 2 and 150 characters' },
    },
  },
  distributor_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  regulator_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'provinces',
});

module.exports = Province;
