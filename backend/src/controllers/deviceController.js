const { Device, DeviceCategory } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { user_id: req.user.id, is_active: true },
      include: [{ model: DeviceCategory, attributes: ['id', 'name', 'icon'] }],
      order: [['name', 'ASC']],
    });

    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{ model: DeviceCategory, attributes: ['id', 'name', 'icon', 'description'] }],
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, category_id, nominal_watts, min_watts, max_watts, hours_daily_usage, is_custom } = req.body;

    const category = await DeviceCategory.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ error: 'Device category not found' });
    }

    const device = await Device.create({
      user_id: req.user.id,
      name,
      category_id,
      nominal_watts,
      min_watts,
      max_watts,
      hours_daily_usage,
      is_custom,
    });

    const result = await Device.findByPk(device.id, {
      include: [{ model: DeviceCategory, attributes: ['id', 'name', 'icon'] }],
    });

    res.status(201).json({ device: result });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { name, category_id, nominal_watts, min_watts, max_watts, hours_daily_usage, is_custom } = req.body;

    await device.update({
      ...(name !== undefined && { name }),
      ...(category_id !== undefined && { category_id }),
      ...(nominal_watts !== undefined && { nominal_watts }),
      ...(min_watts !== undefined && { min_watts }),
      ...(max_watts !== undefined && { max_watts }),
      ...(hours_daily_usage !== undefined && { hours_daily_usage }),
      ...(is_custom !== undefined && { is_custom }),
    });

    const result = await Device.findByPk(device.id, {
      include: [{ model: DeviceCategory, attributes: ['id', 'name', 'icon'] }],
    });

    res.json({ device: result });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await device.update({ is_active: false });

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await DeviceCategory.findAll({
      order: [['name', 'ASC']],
    });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
