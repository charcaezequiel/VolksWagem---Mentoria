const { Op } = require('sequelize');
const { User, Alert, ConsumptionReading } = require('../models');

const checkThreshold = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user || !user.alert_threshold_kwh) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const readings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.gte]: monthStart },
    },
  });

  const totalKwh = readings.reduce((sum, r) => sum + (r.accumulated_kwh_day || r.instant_watts / 1000), 0);

  if (totalKwh > user.alert_threshold_kwh) {
    const existing = await Alert.findOne({
      where: {
        user_id: userId,
        alert_type: 'threshold_exceeded',
        is_read: false,
        created_at: { [Op.gte]: monthStart },
      },
    });

    if (!existing) {
      return Alert.create({
        user_id: userId,
        alert_type: 'threshold_exceeded',
        title: 'Monthly Threshold Exceeded',
        message: `Your monthly consumption (${totalKwh.toFixed(2)} kWh) has exceeded your threshold of ${user.alert_threshold_kwh} kWh.`,
        severity: 'critical',
        metadata: {
          current_kwh: totalKwh,
          threshold_kwh: user.alert_threshold_kwh,
        },
      });
    }
  }

  return null;
};

const checkPeakDetection = async (userId) => {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentReadings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.gte]: oneHourAgo },
    },
  });

  if (!recentReadings.length) return null;

  const historicalReadings = await ConsumptionReading.findAll({
    where: {
      user_id: userId,
      reading_timestamp: { [Op.and]: [{ [Op.gte]: thirtyDaysAgo }, { [Op.lt]: oneHourAgo }] },
    },
  });

  const dailyTotals = {};
  for (const reading of historicalReadings) {
    const day = reading.reading_timestamp.toISOString().split('T')[0];
    if (!dailyTotals[day]) dailyTotals[day] = 0;
    dailyTotals[day] += reading.instant_watts / 1000;
  }

  const dailyValues = Object.values(dailyTotals);
  if (dailyValues.length < 3) return null;

  const avgDaily = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
  const recentTotal = recentReadings.reduce((sum, r) => sum + r.instant_watts / 1000, 0);

  if (recentTotal > 2 * avgDaily) {
    return Alert.create({
      user_id: userId,
      alert_type: 'peak_consumption',
      title: 'Peak Consumption Detected',
      message: `A consumption peak of ${recentTotal.toFixed(2)} kWh was detected in the last hour, exceeding 2x the daily average (${avgDaily.toFixed(2)} kWh).`,
      severity: 'warning',
      metadata: {
        recent_kwh: recentTotal,
        avg_daily_kwh: avgDaily,
      },
    });
  }

  return null;
};

module.exports = { checkThreshold, checkPeakDetection };
