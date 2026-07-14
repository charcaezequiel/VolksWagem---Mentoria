const express = require('express');
const router = express.Router();
const { Alert } = require('../models');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { is_read, alert_type } = req.query;
    const where = { user_id: req.user.id };
    if (is_read !== undefined) where.is_read = is_read === 'true';
    if (alert_type) where.alert_type = alert_type;

    const alerts = await Alert.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', authenticateToken, async (req, res, next) => {
  try {
    const count = await Alert.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', authenticateToken, async (req, res, next) => {
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
    next(error);
  }
});

router.put('/read-all', authenticateToken, async (req, res, next) => {
  try {
    await Alert.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { alert_type, title, message, severity, device_id, metadata } = req.body;

    const alert = await Alert.create({
      user_id: req.user.id,
      alert_type,
      title,
      message,
      severity: severity || 'info',
      device_id,
      metadata,
    });

    res.status(201).json({ alert });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
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
    next(error);
  }
});

module.exports = router;
