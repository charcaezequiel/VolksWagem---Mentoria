const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { register, login } = require('../validators/authValidators');
const { authRateLimiter, authStrictLimiter } = require('../middleware/rateLimit');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// El front necesita el rol para decidir si muestra el panel de admin,
// asi que va explicito en las dos respuestas de sesion.
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  user_type: user.user_type,
  province_id: user.province_id,
  role: user.role,
});

router.post('/register', authStrictLimiter, validate(register), async (req, res, next) => {
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
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authRateLimiter, validate(login), async (req, res, next) => {
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
      user: publicUser(user),
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

    /* Los campos de dominio del cliente (provincia, rubro, umbral de alerta)
       no aplican a un administrador: no es un cliente y no se le factura.
       Se ignoran en vez de rechazarse para que el guardado del perfil no
       rompa por un campo que la propia UI de admin ni muestra. Un admin solo
       gestiona su nombre, su correo y su contrasena. */
    const esAdmin = req.user.role === 'admin';
    const ignorados = [];
    const patch = {};

    if (name !== undefined) patch.name = name;

    if (esAdmin) {
      for (const [campo, valor] of Object.entries({ province_id, user_type, alert_threshold_kwh })) {
        if (valor !== undefined) ignorados.push(campo);
      }
    } else {
      if (province_id !== undefined) patch.province_id = province_id;
      if (user_type !== undefined) patch.user_type = user_type;
      if (alert_threshold_kwh !== undefined) patch.alert_threshold_kwh = alert_threshold_kwh;
    }

    // Los canales de notificacion son de la cuenta, no del cliente: se
    // pueden tocar en los dos casos.
    if (notification_preferences !== undefined) {
      patch.notification_preferences = notification_preferences;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No hay nada para actualizar' });
    }

    await req.user.update(patch);

    const updated = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });

    res.json({ user: updated, ...(ignorados.length ? { ignored: ignorados } : {}) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
