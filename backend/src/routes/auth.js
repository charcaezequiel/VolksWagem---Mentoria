const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { register, login } = require('../validators/authValidators');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

router.post('/register', validate(register), async (req, res, next) => {
  try {
    const { name, email, password, province_id, user_type } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password_hash: password,
      province_id,
      user_type,
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        province_id: user.province_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await user.validPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        province_id: user.province_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { name, province_id, user_type, alert_threshold_kwh, notification_preferences } = req.body;

    await req.user.update({
      ...(name !== undefined && { name }),
      ...(province_id !== undefined && { province_id }),
      ...(user_type !== undefined && { user_type }),
      ...(alert_threshold_kwh !== undefined && { alert_threshold_kwh }),
      ...(notification_preferences !== undefined && { notification_preferences }),
    });

    const updated = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });

    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
