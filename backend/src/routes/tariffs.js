const express = require('express');
const router = express.Router();
const { Tariff, Province } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { calculateCost } = require('../services/tariffService');

router.get('/estimate', authenticateToken, async (req, res, next) => {
  try {
    const { province_id, kwh, subsidy } = req.query;
    const provinceId = Number(province_id);
    const consumption = Number(kwh);

    if (!provinceId || isNaN(consumption) || consumption < 0) {
      return res.status(400).json({ error: 'province_id y kwh son requeridos' });
    }

    const result = await calculateCost(consumption, provinceId, subsidy || 'N1');
    res.json({ province_id: provinceId, kwh: consumption, subsidy: subsidy || 'N1', result });
  } catch (error) {
    next(error);
  }
});

router.get('/province/:provinceId', authenticateToken, async (req, res, next) => {
  try {
    const tariffs = await Tariff.findAll({
      where: { province_id: req.params.provinceId, is_current: true },
      include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
      order: [['tier_from', 'ASC']],
    });
    res.json({ tariffs });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const tariffs = await Tariff.findAll({
      include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
      order: [['province_id', 'ASC'], ['tier_from', 'ASC']],
    });
    res.json({ tariffs });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { province_id, tariff_name, tier_from, tier_to, price_per_kwh, effective_from, effective_to } = req.body;

    const tariff = await Tariff.create({
      province_id,
      tariff_name,
      tier_from,
      tier_to,
      price_per_kwh,
      effective_from,
      effective_to,
    });

    res.status(201).json({ tariff });
  } catch (error) {
    next(error);
  }
});

router.get('/provinces', async (req, res, next) => {
  try {
    const provinces = await Province.findAll({ order: [['name', 'ASC']] });
    res.json({ provinces });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
