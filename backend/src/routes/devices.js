const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Device, DeviceCategory, ConsumptionReading } = require('../models');
const { authenticateToken, generateDeviceToken } = require('../middleware/auth');
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

router.get('/:id/readings', authenticateToken, async (req, res, next) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { start_date, end_date, limit = 100 } = req.query;
    const where = { device_id: device.id, user_id: req.user.id };
    if (start_date || end_date) {
      where.reading_timestamp = {};
      if (start_date) where.reading_timestamp[Op.gte] = new Date(start_date);
      if (end_date) where.reading_timestamp[Op.lte] = new Date(end_date);
    }

    const [readings, lastReading, monthReading] = await Promise.all([
      ConsumptionReading.findAll({
        where,
        order: [['reading_timestamp', 'DESC']],
        limit: parseInt(limit),
      }),
      ConsumptionReading.findOne({
        where: { device_id: device.id, user_id: req.user.id },
        order: [['reading_timestamp', 'DESC']],
      }),
      ConsumptionReading.findAll({
        where: {
          device_id: device.id,
          user_id: req.user.id,
          reading_timestamp: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    const monthKwh = monthReading.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);

    res.json({
      device,
      readings,
      stats: {
        last_reading_at: lastReading ? lastReading.reading_timestamp : null,
        last_watts: lastReading ? lastReading.instant_watts : null,
        month_kwh: Math.round(monthKwh * 1000) / 1000,
        readings_count: readings.length,
        is_online: lastReading ? (new Date() - new Date(lastReading.reading_timestamp)) < 5 * 60 * 1000 : false,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/regenerate-token', authenticateToken, async (req, res, next) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const device_token = generateDeviceToken();
    await device.update({ device_token });
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
      device_token: generateDeviceToken(),
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
