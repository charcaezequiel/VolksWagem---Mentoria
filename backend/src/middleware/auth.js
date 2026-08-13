const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Device } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }

  next();
};

const generateDeviceToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

const authenticateSensor = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const deviceToken = token || req.headers['x-device-token'] || req.body.device_token;

  if (!deviceToken) {
    return res.status(401).json({ error: 'Device token required' });
  }

  try {
    const device = await Device.findOne({ where: { device_token: deviceToken } });
    if (!device || !device.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive device token' });
    }

    const user = await User.findByPk(device.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.device = device;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid device token' });
  }
};

module.exports = { authenticateToken, optionalAuth, authenticateSensor, generateDeviceToken };
