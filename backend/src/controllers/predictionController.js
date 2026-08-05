const { Op } = require('sequelize');
const { Prediction, ConsumptionReading, Invoice, sequelize } = require('../models');

exports.getPredictions = async (req, res) => {
  try {
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(now.getDate() + 7);

    const predictions = await Prediction.findAll({
      where: {
        user_id: req.user.id,
        prediction_date: { [Op.gte]: now, [Op.lte]: weekFromNow },
      },
      order: [['prediction_date', 'ASC']],
    });

    res.json({ predictions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.generatePrediction = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const readings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: thirtyDaysAgo },
        accumulated_kwh_day: { [Op.not]: null },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('reading_timestamp')), 'date'],
        [sequelize.fn('MAX', sequelize.col('accumulated_kwh_day')), 'daily_kwh'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('reading_timestamp'))],
      raw: true,
    });

    if (readings.length === 0) {
      return res.status(400).json({ error: 'Insufficient data for prediction' });
    }

    const avgDaily = readings.reduce((sum, r) => sum + parseFloat(r.daily_kwh), 0) / readings.length;

    const month = new Date().getMonth();
    const seasonalFactor = month >= 5 && month <= 8 ? 1.15 : 1.0;

    const predictions = [];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const predictionDate = new Date(now);
      predictionDate.setDate(now.getDate() + i);

      const predictedKwh = Math.round(avgDaily * seasonalFactor * 1000) / 1000;
      const dayOfWeek = predictionDate.getDay();
      const weekdayFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1.05;
      const adjustedKwh = Math.round(predictedKwh * weekdayFactor * 1000) / 1000;

      const confidenceScore = readings.length >= 7 ? 0.85 : readings.length >= 3 ? 0.65 : 0.4;

      const prediction = await Prediction.create({
        user_id: req.user.id,
        prediction_date: predictionDate,
        predicted_kwh: adjustedKwh,
        confidence_score: confidenceScore,
        model_version: 'v1.0',
      });

      predictions.push(prediction);
    }

    res.status(201).json({ predictions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAccuracy = async (req, res) => {
  try {
    const pastPredictions = await Prediction.findAll({
      where: {
        user_id: req.user.id,
        prediction_date: { [Op.lt]: new Date() },
        predicted_kwh: { [Op.not]: null },
      },
    });

    if (pastPredictions.length === 0) {
      return res.json({ accuracy: null, message: 'No past predictions to compare' });
    }

    let totalAccuracy = 0;
    let count = 0;

    for (const pred of pastPredictions) {
      const invoice = await Invoice.findOne({
        where: {
          user_id: req.user.id,
          period_month: pred.prediction_date.getMonth() + 1,
          period_year: pred.prediction_date.getFullYear(),
        },
      });

      if (invoice) {
        const daysInMonth = new Date(
          pred.prediction_date.getFullYear(),
          pred.prediction_date.getMonth() + 1,
          0
        ).getDate();
        const actualDaily = invoice.kwh_consumed / daysInMonth;
        const error = Math.abs(pred.predicted_kwh - actualDaily) / actualDaily;
        totalAccuracy += (1 - error) * 100;
        count++;
      }
    }

    const accuracy = count > 0 ? Math.round((totalAccuracy / count) * 100) / 100 : null;

    res.json({
      accuracy,
      samples: count,
      message: accuracy ? `${accuracy}% accuracy based on ${count} comparisons` : 'No comparisons available',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.detectAnomalies = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const historicalReadings = await ConsumptionReading.findAll({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: thirtyDaysAgo, [Op.lt]: todayStart },
        accumulated_kwh_day: { [Op.not]: null },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('reading_timestamp')), 'date'],
        [sequelize.fn('MAX', sequelize.col('accumulated_kwh_day')), 'daily_kwh'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('reading_timestamp'))],
      raw: true,
    });

    if (historicalReadings.length < 2) {
      return res.json({
        is_anomaly: false,
        message: 'Insufficient historical data for anomaly detection',
      });
    }

    const values = historicalReadings.map((r) => parseFloat(r.daily_kwh));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, v) => sq + (v - mean) ** 2, 0) / values.length);

    const todayReading = await ConsumptionReading.findOne({
      where: {
        user_id: req.user.id,
        reading_timestamp: { [Op.gte]: todayStart },
        accumulated_kwh_day: { [Op.not]: null },
      },
      order: [['accumulated_kwh_day', 'DESC']],
    });

    if (!todayReading) {
      return res.json({
        is_anomaly: false,
        message: 'No readings for today yet',
        mean: Math.round(mean * 1000) / 1000,
        std_dev: Math.round(stdDev * 1000) / 1000,
      });
    }

    const todayKwh = todayReading.accumulated_kwh_day;
    const threshold = mean + 2 * stdDev;
    const isAnomaly = todayKwh > threshold;

    res.json({
      is_anomaly: isAnomaly,
      today_kwh: todayKwh,
      mean: Math.round(mean * 1000) / 1000,
      std_dev: Math.round(stdDev * 1000) / 1000,
      threshold: Math.round(threshold * 1000) / 1000,
      message: isAnomaly
        ? `Consumption is ${Math.round(((todayKwh - mean) / stdDev) * 100) / 100} standard deviations above average`
        : 'Consumption within normal range',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
