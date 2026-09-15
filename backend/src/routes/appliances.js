const express = require('express');
const router = express.Router();
const { Appliance, DeviceCategory } = require('../models');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const appliances = await Appliance.findAll({
      where: { is_active: true },
      include: [{ model: DeviceCategory, as: 'category', attributes: ['id', 'name', 'icon'] }],
      order: [['category_id', 'ASC'], ['name', 'ASC']],
    });

    res.json({ appliances });
  } catch (error) {
    next(error);
  }
});

router.get('/by-category', authenticateToken, async (req, res, next) => {
  try {
    const categories = await DeviceCategory.findAll({
      include: [{
        model: Appliance,
        as: 'appliances',
        attributes: ['id', 'name', 'nominal_watts', 'min_watts', 'max_watts', 'hours_daily_usage'],
      }],
      order: [['name', 'ASC']],
    });

    categories.forEach((c) => {
      if (Array.isArray(c.appliances)) {
        c.appliances.sort((a, b) => a.nominal_watts - b.nominal_watts);
      }
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
