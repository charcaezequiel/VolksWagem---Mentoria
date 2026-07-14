const { Tariff, Province } = require('../models');

exports.getByProvince = async (req, res) => {
  try {
    const { province_id } = req.params;

    const tariffs = await Tariff.findAll({
      where: { province_id, is_current: true },
      order: [['tier_from', 'ASC']],
    });

    res.json({ tariffs });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const tariffs = await Tariff.findAll({
      include: [{ model: Province, attributes: ['id', 'name'] }],
      order: [['province_id', 'ASC'], ['tier_from', 'ASC']],
    });

    res.json({ tariffs });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { province_id, tier_from, tier_to, price_per_kwh, effective_date, is_current } = req.body;

    if (is_current) {
      await Tariff.update(
        { is_current: false },
        { where: { province_id, is_current: true } }
      );
    }

    const tariff = await Tariff.create({
      province_id,
      tier_from,
      tier_to,
      price_per_kwh,
      effective_date,
      is_current: is_current !== undefined ? is_current : true,
    });

    res.status(201).json({ tariff });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProvinces = async (req, res) => {
  try {
    const provinces = await Province.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });

    res.json({ provinces });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
