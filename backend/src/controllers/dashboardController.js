const { Op } = require('sequelize');
const { ConsumptionReading, Device, DeviceCategory, Invoice, Alert, Tariff, sequelize } = require('../models');
const { computeCostFromTariffs } = require('../services/tariffService');

exports.getOverview = async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonth = await sequelize.query(
      `
      SELECT
        COALESCE(SUM(accumulated_kwh_day), 0) AS total_kwh
      FROM consumption_readings
      WHERE user_id = :userId
        AND reading_timestamp >= :start
        AND reading_timestamp <= :now
      `,
      {
        replacements: { userId: req.user.id, start: currentMonthStart, now },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const lastMonth = await sequelize.query(
      `
      SELECT
        COALESCE(SUM(accumulated_kwh_day), 0) AS total_kwh
      FROM consumption_readings
      WHERE user_id = :userId
        AND reading_timestamp >= :start
        AND reading_timestamp <= :end
      `,
      {
        replacements: { userId: req.user.id, start: lastMonthStart, end: lastMonthEnd },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const currentKwh = parseFloat(currentMonth[0].total_kwh) || 0;
    const lastKwh = parseFloat(lastMonth[0].total_kwh) || 0;

    let currentCost = 0;
    let lastCost = 0;

    if (req.user.province_id) {
      const tariffs = await Tariff.findAll({
        where: { province_id: req.user.province_id, is_current: true },
        order: [['tier_from', 'ASC']],
      });

      currentCost = computeCostFromTariffs(tariffs, currentKwh).total_cost;
      lastCost = computeCostFromTariffs(tariffs, lastKwh).total_cost;
    }

    const totalDevices = await Device.count({
      where: { user_id: req.user.id, is_active: true },
    });

    const unreadAlerts = await Alert.count({
      where: { user_id: req.user.id, is_read: false },
    });

    const daysInMonth = now.getDate();
    const dailyAverage = daysInMonth > 0 ? Math.round((currentKwh / daysInMonth) * 1000) / 1000 : 0;

    const comparisonPercentage = lastKwh > 0
      ? Math.round(((currentKwh - lastKwh) / lastKwh) * 100 * 100) / 100
      : null;

    res.json({
      current_month_kwh: Math.round(currentKwh * 1000) / 1000,
      current_month_cost: Math.round(currentCost * 100) / 100,
      last_month_kwh: Math.round(lastKwh * 1000) / 1000,
      last_month_cost: Math.round(lastCost * 100) / 100,
      total_devices: totalDevices,
      unread_alerts: unreadAlerts,
      daily_average_kwh: dailyAverage,
      comparison_percentage: comparisonPercentage,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDailyConsumption = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const daily = await sequelize.query(
      `
      SELECT
        DATE(reading_timestamp) AS date,
        COALESCE(SUM(accumulated_kwh_day), 0) AS total_kwh
      FROM consumption_readings
      WHERE user_id = :userId
        AND reading_timestamp >= :start
        AND reading_timestamp <= :now
      GROUP BY DATE(reading_timestamp)
      ORDER BY date ASC
      `,
      {
        replacements: { userId: req.user.id, start: sevenDaysAgo, now },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({ daily_consumption: daily });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMonthlyConsumption = async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    const monthly = await sequelize.query(
      `
      SELECT
        EXTRACT(YEAR FROM reading_timestamp) AS year,
        EXTRACT(MONTH FROM reading_timestamp) AS month,
        COALESCE(SUM(accumulated_kwh_day), 0) AS total_kwh
      FROM consumption_readings
      WHERE user_id = :userId
        AND reading_timestamp >= :start
        AND reading_timestamp <= :now
      GROUP BY EXTRACT(YEAR FROM reading_timestamp), EXTRACT(MONTH FROM reading_timestamp)
      ORDER BY year ASC, month ASC
      `,
      {
        replacements: { userId: req.user.id, start: twelveMonthsAgo, now },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({ monthly_consumption: monthly });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDeviceBreakdown = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const breakdown = await sequelize.query(
      `
      SELECT
        dc.id AS category_id,
        dc.name AS category_name,
        dc.icon AS category_icon,
        COALESCE(SUM(cr.accumulated_kwh_day), 0) AS total_kwh,
        COUNT(DISTINCT d.id) AS device_count
      FROM device_categories dc
      LEFT JOIN devices d ON d.category_id = dc.id AND d.user_id = :userId AND d.is_active = true
      LEFT JOIN consumption_readings cr ON cr.device_id = d.id
        AND cr.reading_timestamp >= :start
        AND cr.reading_timestamp <= :now
      WHERE d.id IS NOT NULL
      GROUP BY dc.id, dc.name, dc.icon
      ORDER BY total_kwh DESC
      `,
      {
        replacements: { userId: req.user.id, start: monthStart, now },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({ device_breakdown: breakdown });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
