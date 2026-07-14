const sequelize = require('../config/database');
const User = require('./User');
const Province = require('./Province');
const DeviceCategory = require('./DeviceCategory');
const Device = require('./Device');
const ConsumptionReading = require('./ConsumptionReading');
const Invoice = require('./Invoice');
const Alert = require('./Alert');
const Tariff = require('./Tariff');
const Prediction = require('./Prediction');

User.hasMany(Device, { foreignKey: 'user_id', as: 'devices' });
User.hasMany(Alert, { foreignKey: 'user_id', as: 'alerts' });
User.belongsTo(Province, { foreignKey: 'province_id', as: 'province' });

Device.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Device.belongsTo(DeviceCategory, { foreignKey: 'category_id', as: 'category' });
DeviceCategory.hasMany(Device, { foreignKey: 'category_id', as: 'devices' });

ConsumptionReading.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ConsumptionReading.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

Invoice.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Alert.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Alert.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

Province.hasMany(User, { foreignKey: 'province_id', as: 'users' });
Province.hasMany(Tariff, { foreignKey: 'province_id', as: 'tariffs' });
Tariff.belongsTo(Province, { foreignKey: 'province_id', as: 'province' });

Prediction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Province,
  DeviceCategory,
  Device,
  ConsumptionReading,
  Invoice,
  Alert,
  Tariff,
  Prediction,
};
