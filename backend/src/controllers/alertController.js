const { Alert, sequelize } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const where = { user_id: req.user.id };

    if (req.query.unread_only === 'true') {
      where.is_read = false;
    }

    const alerts = await Alert.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update({ is_read: true });

    res.json({ alert });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const [updated] = await Alert.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );

    res.json({ message: 'All alerts marked as read', count: updated });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { user_id, type, title, message, severity, metadata } = req.body;

    const alert = await Alert.create({
      user_id,
      type,
      title,
      message,
      severity,
      metadata,
    });

    res.status(201).json({ alert });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Alert.count({
      where: { user_id: req.user.id, is_read: false },
    });

    res.json({ unread_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.destroy();

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
