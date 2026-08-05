const { Tariff } = require('../models');

const calculateCost = async (kwh, provinceId) => {
  const tariffs = await Tariff.findAll({
    where: {
      province_id: provinceId,
      is_current: true,
    },
    order: [['tier_from', 'ASC']],
  });

  if (!tariffs.length) {
    return { total_cost: 0, breakdown: [] };
  }

  let remaining = kwh;
  let total_cost = 0;
  const breakdown = [];

  for (const tariff of tariffs) {
    if (remaining <= 0) break;

    const tierFrom = tariff.tier_from;
    const tierTo = tariff.tier_to || Infinity;
    const tierSize = tierTo - tierFrom;
    const kwhInTier = Math.min(remaining, tierSize);
    const subtotal = kwhInTier * tariff.price_per_kwh;

    breakdown.push({
      tier_from: tierFrom,
      tier_to: tariff.tier_to,
      kwh_in_tier: kwhInTier,
      price: tariff.price_per_kwh,
      subtotal,
    });

    total_cost += subtotal;
    remaining -= kwhInTier;
  }

  return { total_cost, breakdown };
};

module.exports = { calculateCost };
