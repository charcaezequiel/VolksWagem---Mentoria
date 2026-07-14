const { Op } = require('sequelize');
const { ConsumptionReading, Prediction } = require('../models');

const SEASONAL_FACTORS = {
  1: 1.3, 2: 1.25, 3: 1.1, 4: 0.9, 5: 0.85, 6: 0.8,
  7: 0.8, 8: 0.85, 9: 0.9, 10: 1.0, 11: 1.15, 12: 1.3,
};

const generatePredictions = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const readings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.gte]: thirtyDaysAgo },
    },
    order: [['reading_timestamp', 'ASC']],
  });

  const dailyTotals = {};
  for (const reading of readings) {
    const day = reading.reading_timestamp.toISOString().split('T')[0];
    if (!dailyTotals[day]) dailyTotals[day] = 0;
    dailyTotals[day] += reading.instant_watts / 1000;
  }

  const dailyValues = Object.values(dailyTotals);
  const avgDaily = dailyValues.length > 0
    ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
    : 0;

  const currentMonth = new Date().getMonth() + 1;
  const seasonalFactor = SEASONAL_FACTORS[currentMonth] || 1;

  const predictions = [];
  const today = new Date();

  for (let i = 1; i <= 7; i++) {
    const predDate = new Date(today);
    predDate.setDate(predDate.getDate() + i);

    const predictedKwh = avgDaily * seasonalFactor;
    const dayOfWeek = predDate.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0;
    const finalPredicted = predictedKwh * weekendFactor;

    const confidenceScore = dailyValues.length >= 7 ? 0.85 : dailyValues.length >= 3 ? 0.65 : 0.4;

    predictions.push({
      prediction_date: predDate.toISOString().split('T')[0],
      predicted_kwh: Math.round(finalPredicted * 1000) / 1000,
      confidence_score: confidenceScore,
    });
  }

  for (const pred of predictions) {
    await Prediction.upsert({
      user_id: userId,
      prediction_date: pred.prediction_date,
      predicted_kwh: pred.predicted_kwh,
      confidence_score: pred.confidence_score,
      model_version: 'v1.0',
    });
  }

  return predictions;
};

const detectAnomalies = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const todayReadings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.gte]: today },
    },
  });

  const historicalReadings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.and]: [{ [Op.gte]: thirtyDaysAgo }, { [Op.lt]: today }] },
    },
  });

  if (!todayReadings.length) return [];

  const dailyTotals = {};
  for (const reading of historicalReadings) {
    const day = reading.reading_timestamp.toISOString().split('T')[0];
    if (!dailyTotals[day]) dailyTotals[day] = 0;
    dailyTotals[day] += reading.instant_watts / 1000;
  }

  const dailyValues = Object.values(dailyTotals);
  if (dailyValues.length < 3) return [];

  const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
  const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
  const stdDev = Math.sqrt(variance);

  const todayTotal = todayReadings.reduce((sum, r) => sum + r.instant_watts / 1000, 0);
  const anomalies = [];

  if (Math.abs(todayTotal - mean) > 2 * stdDev && stdDev > 0) {
    anomalies.push({
      type: 'anomaly',
      title: 'Consumption Anomaly Detected',
      message: `Today's consumption (${todayTotal.toFixed(2)} kWh) deviates significantly from the 30-day average (${mean.toFixed(2)} kWh).`,
      severity: todayTotal > mean ? 'warning' : 'info',
      metadata: {
        today_total: todayTotal,
        average: mean,
        std_dev: stdDev,
        deviation: Math.abs(todayTotal - mean) / stdDev,
      },
    });
  }

  return anomalies;
};

module.exports = { generatePredictions, detectAnomalies };
