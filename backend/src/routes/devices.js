const express = require('express');
const router = express.Router();
const { Device, DeviceCategory } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDevice, updateDevice } = require('../validators/deviceValidators');

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const devices = await Device.findAll({
      where: { user_id: req.user.id },
      include: [{ model: DeviceCategory, as: 'category' }],
      order: [['created_at', 'DESC']],
    });
    res.json({ devices });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', authenticateToken, async (req, res, next) => {
  try {
    const categories = await DeviceCategory.findAll({ order: [['name', 'ASC']] });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{ model: DeviceCategory, as: 'category' }],
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, validate(createDevice), async (req, res, next) => {
  try {
    const { name, category_id, nominal_watts, min_watts, max_watts, hours_daily_usage } = req.body;

    const device = await Device.create({
      user_id: req.user.id,
      name,
      category_id,
      nominal_watts,
      min_watts,
      max_watts,
      hours_daily_usage,
    });

    const deviceWithCategory = await Device.findByPk(device.id, {
      include: [{ model: DeviceCategory, as: 'category' }],
    });

    res.status(201).json({ device: deviceWithCategory });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, validate(updateDevice), async (req, res, next) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { name, category_id, nominal_watts, min_watts, max_watts, hours_daily_usage, is_active } = req.body;

    await device.update({
      ...(name !== undefined && { name }),
      ...(category_id !== undefined && { category_id }),
      ...(nominal_watts !== undefined && { nominal_watts }),
      ...(min_watts !== undefined && { min_watts }),
      ...(max_watts !== undefined && { max_watts }),
      ...(hours_daily_usage !== undefined && { hours_daily_usage }),
      ...(is_active !== undefined && { is_active }),
    });

    const updated = await Device.findByPk(device.id, {
      include: [{ model: DeviceCategory, as: 'category' }],
    });

    res.json({ device: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await device.destroy();
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
