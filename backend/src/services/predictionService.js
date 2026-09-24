const { Op } = require('sequelize');
const { ConsumptionReading, Prediction, User, Province } = require('../models');
const { calculateCost } = require('./tariffService');
const { t, MONTHS } = require('../utils/i18n');

const SEASONAL_FACTORS = {
  1: 1.3, 2: 1.25, 3: 1.1, 4: 0.9, 5: 0.85, 6: 0.8,
  7: 0.8, 8: 0.85, 9: 0.9, 10: 1.0, 11: 1.15, 12: 1.3,
};

const MODEL_VERSION = 'v2.1-bill-ai';

const linearRegression = (values) => {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

const standardDeviation = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const pad2 = (n) => String(n).padStart(2, '0');

const localDateKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

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
    const day = localDateKey(new Date(reading.reading_timestamp));
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
      prediction_date: localDateKey(predDate),
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

const detectAnomalies = async (userId, lang) => {
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
    const day = localDateKey(new Date(reading.reading_timestamp));
    if (!dailyTotals[day]) dailyTotals[day] = 0;
    dailyTotals[day] += reading.instant_watts / 1000;
  }

  const dailyValues = Object.values(dailyTotals);
  if (dailyValues.length < 3) return [];

  const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
  const stdDev = standardDeviation(dailyValues);

  const todayTotal = todayReadings.reduce((sum, r) => sum + r.instant_watts / 1000, 0);
  const anomalies = [];

  if (Math.abs(todayTotal - mean) > 2 * stdDev && stdDev > 0) {
    anomalies.push({
      type: 'anomaly',
      title: t(lang, 'anomaly.consumption.title'),
      message: t(lang, 'anomaly.consumption.desc', {
        value: todayTotal.toFixed(2),
        avg: mean.toFixed(2),
      }),
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

const generateBillForecast = async (userId, lang) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Province, as: 'province' }],
  });

  if (!user || !user.province_id) {
    const error = new Error(t(lang, 'pred.no_province'));
    error.statusCode = 400;
    throw error;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  startDate.setHours(0, 0, 0, 0);

  const readings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.gte]: startDate },
    },
    attributes: ['reading_timestamp', 'accumulated_kwh_day', 'instant_watts'],
    order: [['reading_timestamp', 'ASC']],
    raw: true,
  });

  if (readings.length === 0) {
    const error = new Error(t(lang, 'pred.no_data'));
    error.statusCode = 400;
    throw error;
  }

  const dailyMap = {};
  for (const reading of readings) {
    const d = new Date(reading.reading_timestamp);
    const key = localDateKey(d);
    const kwh = reading.accumulated_kwh_day != null
      ? reading.accumulated_kwh_day
      : (reading.instant_watts || 0) / 1000;
    dailyMap[key] = (dailyMap[key] || 0) + kwh;
  }

  const dailySeries = Object.keys(dailyMap)
    .sort()
    .map((key) => ({ date: key, kwh: parseFloat(dailyMap[key].toFixed(3)) }));

  const recent = dailySeries.slice(-30);
  const recentValues = recent.map((item) => item.kwh);
  const avgRecent = recentValues.length > 0
    ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    : 0;

  const { slope } = linearRegression(recentValues);

  const targetDate = new Date();
  targetDate.setDate(1);
  targetDate.setMonth(targetDate.getMonth() + 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1;
  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const seasonalFactor = SEASONAL_FACTORS[targetMonth] || 1;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(targetYear, targetMonth - 1, 1);
  const daysAheadStart = Math.max(0, Math.round((startOfTarget - todayStart) / 86400000));

  const dailyForecast = [];
  let totalPredicted = 0;
  let peak = 0;
  let peakDate = null;

  for (let d = 1; d <= daysInTargetMonth; d++) {
    const date = new Date(targetYear, targetMonth - 1, d);
    const daysAhead = daysAheadStart + d;
    const trendAdjusted = avgRecent + slope * daysAhead;
    const base = Math.max(0.5, trendAdjusted);
    const dayOfWeek = date.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.08 : 1.0;
    const kwh = Math.round(base * seasonalFactor * weekendFactor * 1000) / 1000;

    totalPredicted += kwh;
    if (kwh > peak) {
      peak = kwh;
      peakDate = localDateKey(date);
    }

    dailyForecast.push({
      date: localDateKey(date),
      kwh,
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  totalPredicted = Math.round(totalPredicted * 1000) / 1000;

  const { total_cost, breakdown } = await calculateCost(totalPredicted, user.province_id);

  const monthMap = {};
  for (const item of dailySeries) {
    const key = item.date.slice(0, 7);
    monthMap[key] = (monthMap[key] || 0) + item.kwh;
  }

  const monthComparison = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${pad2(m)}`;
    const totalKwh = monthMap[key] || 0;
    const cost = totalKwh > 0
      ? (await calculateCost(totalKwh, user.province_id)).total_cost
      : 0;
    monthComparison.push({
      label: MONTHS[lang][m - 1],
      month: m,
      year: y,
      total_kwh: Math.round(totalKwh * 1000) / 1000,
      cost: Math.round(cost * 100) / 100,
    });
  }

  const stdDev = standardDeviation(recentValues);
  const cv = avgRecent > 0 ? stdDev / avgRecent : 0.5;

  let confidence = dailySeries.length >= 60 ? 0.92
    : dailySeries.length >= 30 ? 0.85
      : dailySeries.length >= 14 ? 0.7
        : dailySeries.length >= 7 ? 0.55
          : 0.4;
  if (cv > 0.5) confidence -= 0.1;
  confidence = Math.round(Math.max(0.2, Math.min(0.98, confidence)) * 100) / 100;

  await Prediction.destroy({
    where: { user_id: userId, model_version: MODEL_VERSION },
  });

  const predictionRows = dailyForecast.map((day) => ({
    user_id: userId,
    prediction_date: day.date,
    predicted_kwh: day.kwh,
    confidence_score: confidence,
    model_version: MODEL_VERSION,
  }));
  await Prediction.bulkCreate(predictionRows);

  return {
    month: targetMonth,
    month_name: MONTHS[lang][targetMonth - 1],
    year: targetYear,
    total_predicted_kwh: totalPredicted,
    predicted_cost: Math.round(total_cost * 100) / 100,
    avg_daily_kwh: Math.round((totalPredicted / daysInTargetMonth) * 1000) / 1000,
    peak_day_kwh: peak,
    peak_day_date: peakDate,
    confidence_score: confidence,
    model_version: MODEL_VERSION,
    seasonal_factor: seasonalFactor,
    days_in_month: daysInTargetMonth,
    price_per_kwh_avg: totalPredicted > 0
      ? Math.round((total_cost / totalPredicted) * 100) / 100
      : 0,
    province: user.province ? user.province.name : null,
    distributor: user.province ? user.province.distributor_name : null,
    daily_forecast: dailyForecast,
    cost_breakdown: breakdown,
    month_comparison: monthComparison,
  };
};

module.exports = { generatePredictions, detectAnomalies, generateBillForecast };
