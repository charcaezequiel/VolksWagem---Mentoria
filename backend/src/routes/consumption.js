const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { ConsumptionReading, Device } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addReading } = require('../validators/consumptionValidators');

router.post('/readings', authenticateToken, validate(addReading), async (req, res, next) => {
  try {
    const { instant_watts, accumulated_kwh_day, device_id, source } = req.body;

    const reading = await ConsumptionReading.create({
      user_id: req.user.id,
      instant_watts,
      accumulated_kwh_day,
      device_id,
      source,
    });

    res.status(201).json({ reading });
  } catch (error) {
    next(error);
  }
});

router.get('/readings', authenticateToken, async (req, res, next) => {
  try {
    const { start_date, end_date, device_id, limit = 100 } = req.query;

    const where = { user_id: req.user.id };
    if (device_id) where.device_id = device_id;
    if (start_date || end_date) {
      where.reading_timestamp = {};
      if (start_date) where.reading_timestamp[Op.gte] = new Date(start_date);
      if (end_date) where.reading_timestamp[Op.lte] = new Date(end_date);
    }

    const readings = await ConsumptionReading.findAll({
      where,
      include: [{ model: Device, as: 'device', attributes: ['id', 'name'] }],
      order: [['reading_timestamp', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({ readings });
  } catch (error) {
    next(error);
  }
});

router.get('/realtime', authenticateToken, async (req, res, next) => {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: oneHourAgo },
      },
      include: [{ model: Device, as: 'device', attributes: ['id', 'name'] }],
      order: [['reading_timestamp', 'DESC']],
    });

    const totalWatts = readings.reduce((sum, r) => sum + r.instant_watts, 0);

    res.json({
      current_watts: totalWatts,
      readings,
      timestamp: new Date(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', authenticateToken, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayReadings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: todayStart },
      },
    });

    const monthReadings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: monthStart },
      },
    });

    const todayKwh = todayReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);
    const monthKwh = monthReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);

    const avgWatts = todayReadings.length > 0
      ? todayReadings.reduce((sum, r) => sum + r.instant_watts, 0) / todayReadings.length
      : 0;

    res.json({
      today_kwh: Math.round(todayKwh * 1000) / 1000,
      month_kwh: Math.round(monthKwh * 1000) / 1000,
      current_watts: todayReadings.length > 0 ? todayReadings[0].instant_watts : 0,
      avg_watts: Math.round(avgWatts * 100) / 100,
      readings_count_today: todayReadings.length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/by-device', authenticateToken, async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: monthStart },
      },
      include: [{ model: Device, as: 'device', attributes: ['id', 'name'] }],
    });

    const deviceTotals = {};
    for (const reading of readings) {
      const deviceId = reading.device_id || 'unassigned';
      const deviceName = reading.device ? reading.device.name : 'Unassigned';
      if (!deviceTotals[deviceId]) {
        deviceTotals[deviceId] = { device_id: deviceId, device_name: deviceName, total_kwh: 0, readings_count: 0 };
      }
      deviceTotals[deviceId].total_kwh += reading.accumulated_kwh_day || reading.instant_watts / 1000;
      deviceTotals[deviceId].readings_count += 1;
    }

    res.json({ by_device: Object.values(deviceTotals) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
