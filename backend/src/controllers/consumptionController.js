const { Op } = require('sequelize');
const { ConsumptionReading, Device, Tariff, sequelize } = require('../models');
const { computeCostFromTariffs } = require('../services/tariffService');

exports.addReading = async (req, res) => {
  try {
    const { device_id, instant_watts, accumulated_kwh_day, source } = req.body;

    if (device_id) {
      const device = await Device.findOne({
        where: { id: device_id, user_id: req.user.id },
      });
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
    }

    const reading = await ConsumptionReading.create({
      user_id: req.user.id,
      device_id: device_id || null,
      instant_watts,
      accumulated_kwh_day,
      source,
    });

    res.status(201).json({ reading });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getReadings = async (req, res) => {
  try {
    const { from, to } = req.query;

    const where = { user_id: req.user.id };

    if (from || to) {
      where.reading_timestamp = {};
      if (from) where.reading_timestamp[Op.gte] = new Date(from);
      if (to) where.reading_timestamp[Op.lte] = new Date(to);
    }

    const readings = await ConsumptionReading.findAll({
      where,
      include: [{ model: Device, attributes: ['id', 'name'] }],
      order: [['reading_timestamp', 'DESC']],
    });

    res.json({ readings });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRealtime = async (req, res) => {
  try {
    const reading = await ConsumptionReading.findOne({
      where: { user_id: req.user.id },
      order: [['reading_timestamp', 'DESC']],
      include: [{ model: Device, attributes: ['id', 'name'] }],
    });

    if (!reading) {
      return res.status(404).json({ error: 'No readings found' });
    }

    res.json({ reading });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
    }

    const result = await sequelize.query(
      `
      SELECT
        COALESCE(SUM(accumulated_kwh_day), 0) AS total_kwh
      FROM consumption_readings
      WHERE user_id = :userId
        AND reading_timestamp >= :startDate
        AND reading_timestamp <= :now
      `,
      {
        replacements: { userId: req.user.id, startDate, now },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalKwh = parseFloat(result[0].total_kwh) || 0;

    let totalCost = 0;
    if (req.user.province_id) {
      const tariffs = await Tariff.findAll({
        where: { province_id: req.user.province_id, is_current: true },
        order: [['tier_from', 'ASC']],
      });

      totalCost = computeCostFromTariffs(tariffs, totalKwh).total_cost;
    }

    res.json({
      total_kwh: totalKwh,
      total_cost: Math.round(totalCost * 100) / 100,
      period,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getConsumptionByDevice = async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        device_id: { [Op.not]: null },
        reading_timestamp: { [Op.gte]: startDate, [Op.lte]: now },
      },
      attributes: [
        'device_id',
        [sequelize.fn('SUM', sequelize.col('accumulated_kwh_day')), 'total_kwh'],
      ],
      include: [{ model: Device, attributes: ['id', 'name'] }],
      group: ['device_id', 'Device.id', 'Device.name'],
      order: [[sequelize.fn('SUM', sequelize.col('accumulated_kwh_day')), 'DESC']],
      raw: true,
      nest: true,
    });

    res.json({ consumption_by_device: readings });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
