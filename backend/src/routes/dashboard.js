const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { ConsumptionReading, Device, Invoice } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { calculatePercentageChange } = require('../utils/helpers');

router.get('/overview', authenticateToken, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const todayReadings = await ConsumptionReading.findAll({
      where: { user_id: req.user.id, reading_timestamp: { [Op.gte]: todayStart } },
    });

    const monthReadings = await ConsumptionReading.findAll({
      where: { user_id: req.user.id, reading_timestamp: { [Op.gte]: monthStart } },
    });

    const lastMonthReadings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: lastMonthStart, [Op.lte]: lastMonthEnd },
      },
    });

    const todayKwh = todayReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);
    const monthKwh = monthReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);
    const lastMonthKwh = lastMonthReadings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);

    const currentWatts = todayReadings.length > 0 ? todayReadings[0].instant_watts : 0;

    const lastInvoice = await Invoice.findOne({
      where: { user_id: req.user.id },
      order: [['period_year', 'DESC'], ['period_month', 'DESC']],
    });

    res.json({
      current_watts: currentWatts,
      today_kwh: Math.round(todayKwh * 1000) / 1000,
      month_kwh: Math.round(monthKwh * 1000) / 1000,
      month_change_pct: Math.round(calculatePercentageChange(monthKwh, lastMonthKwh) * 100) / 100,
      last_invoice_amount: lastInvoice ? lastInvoice.amount_paid : null,
      last_invoice_kwh: lastInvoice ? lastInvoice.kwh_consumed : null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/daily', authenticateToken, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: startDate },
      },
      order: [['reading_timestamp', 'ASC']],
    });

    const dailyData = {};
    for (const reading of readings) {
      const day = reading.reading_timestamp.toISOString().split('T')[0];
      if (!dailyData[day]) dailyData[day] = { date: day, total_kwh: 0, readings_count: 0 };
      dailyData[day].total_kwh += reading.accumulated_kwh_day || reading.instant_watts / 1000;
      dailyData[day].readings_count += 1;
    }

    res.json({ daily: Object.values(dailyData) });
  } catch (error) {
    next(error);
  }
});

router.get('/monthly', authenticateToken, async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: startDate },
      },
      order: [['reading_timestamp', 'ASC']],
    });

    const monthlyData = {};
    for (const reading of readings) {
      const d = reading.reading_timestamp;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { month: key, total_kwh: 0, readings_count: 0 };
      monthlyData[key].total_kwh += reading.accumulated_kwh_day || reading.instant_watts / 1000;
      monthlyData[key].readings_count += 1;
    }

    res.json({ monthly: Object.values(monthlyData) });
  } catch (error) {
    next(error);
  }
});

router.get('/device-breakdown', authenticateToken, async (req, res, next) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: monthStart },
      },
      include: [
        { model: Device, as: 'device', attributes: ['id', 'name', 'nominal_watts', 'category_id'] },
      ],
    });

    const breakdown = {};
    for (const reading of readings) {
      const deviceId = reading.device_id || 'unassigned';
      const deviceName = reading.device ? reading.device.name : 'Unassigned';
      if (!breakdown[deviceId]) {
        breakdown[deviceId] = {
          device_id: deviceId,
          device_name: deviceName,
          total_kwh: 0,
          readings_count: 0,
          avg_watts: 0,
          total_watts: 0,
        };
      }
      breakdown[deviceId].total_kwh += reading.accumulated_kwh_day || reading.instant_watts / 1000;
      breakdown[deviceId].total_watts += reading.instant_watts;
      breakdown[deviceId].readings_count += 1;
    }

    for (const key of Object.keys(breakdown)) {
      const b = breakdown[key];
      b.avg_watts = b.readings_count > 0 ? Math.round(b.total_watts / b.readings_count) : 0;
      b.total_kwh = Math.round(b.total_kwh * 1000) / 1000;
      delete b.total_watts;
    }

    res.json({ breakdown: Object.values(breakdown) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
