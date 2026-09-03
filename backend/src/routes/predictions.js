const express = require('express');
const router = express.Router();
const { Prediction } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { generatePredictions, detectAnomalies, generateBillForecast } = require('../services/predictionService');

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const predictions = await Prediction.findAll({
      where: { user_id: req.user.id },
      order: [['prediction_date', 'ASC']],
    });
    res.json({ predictions });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', authenticateToken, async (req, res, next) => {
  try {
    const predictions = await generatePredictions(req.user.id);
    res.json({ predictions });
  } catch (error) {
    next(error);
  }
});

router.get('/bill-forecast', authenticateToken, async (req, res, next) => {
  try {
    const forecast = await generateBillForecast(req.user.id);
    res.json({ forecast });
  } catch (error) {
    next(error);
  }
});

router.get('/accuracy', authenticateToken, async (req, res, next) => {
  try {
    const predictions = await Prediction.findAll({
      where: {
        user_id: req.user.id,
        actual_kwh: { [require('sequelize').Op.not]: null },
      },
    });

    if (predictions.length === 0) {
      return res.json({ accuracy: null, message: 'No predictions with actual data yet' });
    }

    let totalError = 0;
    for (const pred of predictions) {
      totalError += Math.abs(pred.predicted_kwh - pred.actual_kwh) / pred.actual_kwh;
    }

    const mape = (totalError / predictions.length) * 100;
    const accuracy = Math.max(0, 100 - mape);

    res.json({
      accuracy: Math.round(accuracy * 100) / 100,
      mape: Math.round(mape * 100) / 100,
      samples: predictions.length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/anomalies', authenticateToken, async (req, res, next) => {
  try {
    const anomalies = await detectAnomalies(req.user.id);
    const mapped = anomalies.map((a) => ({
      ...a,
      description: a.title || a.message,
      value: a.metadata?.today_total,
      expected: a.metadata?.average,
      date: new Date().toISOString().slice(0, 10),
    }));
    res.json({ anomalies: mapped, data: mapped });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
