const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { ConsumptionReading, Device } = require('../models');
const sequelize = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addReading } = require('../validators/consumptionValidators');

router.post('/readings', authenticateToken, validate(addReading), async (req, res, next) => {
  try {
    const { instant_watts, accumulated_kwh_day, device_id, source, voltage, current, frequency, power_factor } = req.body;

    const reading = await ConsumptionReading.create({
      user_id: req.user.id,
      instant_watts,
      accumulated_kwh_day,
      device_id,
      source,
      voltage: voltage != null ? voltage : null,
      current: current != null ? current : null,
      frequency: frequency != null ? frequency : null,
      power_factor: power_factor != null ? power_factor : null,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('reading:new', { reading });
    }

    res.status(201).json({ reading });
  } catch (error) {
    next(error);
  }
});

router.get('/readings', authenticateToken, async (req, res, next) => {
  try {
    const { startDate, endDate, start_date, end_date, device_id, limit = 100 } = req.query;
    const sd = startDate || start_date;
    const ed = endDate || end_date;

    const where = { user_id: req.user.id };
    if (device_id) where.device_id = device_id;
    if (sd || ed) {
      where.reading_timestamp = {};
      if (sd) where.reading_timestamp[Op.gte] = new Date(sd);
      if (ed) where.reading_timestamp[Op.lte] = new Date(ed);
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

router.get('/live', authenticateToken, async (req, res, next) => {
  try {
    // Última lectura de cada dispositivo (base para las tarjetas en vivo).
    const rows = await sequelize.query(
      `SELECT r.device_id, r.instant_watts, r.accumulated_kwh_day,
              r.voltage, r.current, r.frequency, r.power_factor,
              r.reading_timestamp, d.name AS device_name
       FROM consumption_readings r
       INNER JOIN (
         SELECT device_id, MAX(reading_timestamp) AS max_ts
         FROM consumption_readings
         WHERE user_id = :userId AND device_id IS NOT NULL
         GROUP BY device_id
       ) latest ON latest.device_id = r.device_id AND latest.max_ts = r.reading_timestamp
       LEFT JOIN devices d ON d.id = r.device_id
       ORDER BY r.reading_timestamp DESC`,
      {
        replacements: { userId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.json({ live: rows });
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
      instant_watts: totalWatts,
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
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayReadings = await ConsumptionReading.findAll({
      where: { user_id: req.user.id, reading_timestamp: { [Op.gte]: todayStart } },
    });

    const weekReadings = await ConsumptionReading.findAll({
      where: { user_id: req.user.id, reading_timestamp: { [Op.gte]: weekStart } },
    });

    const monthReadings = await ConsumptionReading.findAll({
      where: { user_id: req.user.id, reading_timestamp: { [Op.gte]: monthStart } },
    });

    const todayKwh = todayReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);
    const weekKwh = weekReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);
    const monthKwh = monthReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);

    res.json({
      daily: Math.round(todayKwh * 1000) / 1000,
      weekly: Math.round(weekKwh * 1000) / 1000,
      monthly: Math.round(monthKwh * 1000) / 1000,
      today_kwh: Math.round(todayKwh * 1000) / 1000,
      month_kwh: Math.round(monthKwh * 1000) / 1000,
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
      where: { user_id: req.user.id, reading_timestamp: { [Op.gte]: monthStart } },
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

    const result = Object.values(deviceTotals).map(d => ({
      ...d,
      name: d.device_name,
      consumption: Math.round(d.total_kwh * 1000) / 1000,
    }));

    res.json({ by_device: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
