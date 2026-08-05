const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceCategory = sequelize.define('DeviceCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Category name is required' },
      len: { args: [2, 100], msg: 'Category name must be between 2 and 100 characters' },
    },
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'device_categories',
});

module.exports = DeviceCategory;
