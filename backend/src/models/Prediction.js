const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prediction = sequelize.define('Prediction', {
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
  prediction_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  predicted_kwh: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Predicted kWh must be positive' },
    },
  },
  actual_kwh: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Actual kWh must be positive' },
    },
  },
  confidence_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Confidence score must be between 0 and 1' },
      max: { args: [1], msg: 'Confidence score must be between 0 and 1' },
    },
  },
  model_version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Model version is required' },
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'predictions',
});

module.exports = Prediction;
