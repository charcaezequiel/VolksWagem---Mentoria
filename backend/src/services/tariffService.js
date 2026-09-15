const { Tariff } = require('../models');

const SUBSIDY_PRICES = {
  N1: 'price_per_kwh',
  N2: 'price_per_kwh_n2',
  N3: 'price_per_kwh_n3',
};

const TAX_FACTOR = 1.31;

const computeCostFromTariffs = (tariffs, kwh, subsidy = 'N1') => {
  if (!tariffs || !tariffs.length) {
    return { total_cost: 0, fixed_charge: 0, variable_cost: 0, estimated_total: 0, category: null, breakdown: [] };
  }

  const priceKey = SUBSIDY_PRICES[subsidy] || 'price_per_kwh';
  let category = tariffs[tariffs.length - 1];
  for (const t of tariffs) {
    const min = t.tier_from || 0;
    if (kwh >= min) category = t;
    else break;
  }

  const price = category[priceKey] != null ? category[priceKey] : category.price_per_kwh;
  const variable = kwh * price;
  const fixed = category.fixed_charge || 0;
  const base = fixed + variable;

  return {
    total_cost: Math.round(base * 100) / 100,
    fixed_charge: Math.round(fixed * 100) / 100,
    variable_cost: Math.round(variable * 100) / 100,
    estimated_total: Math.round(base * TAX_FACTOR * 100) / 100,
    category: {
      category: category.category,
      tier_from: category.tier_from,
      tier_to: category.tier_to,
      price_per_kwh: price,
    },
    breakdown: [
      {
        category: category.category,
        tier_from: category.tier_from,
        tier_to: category.tier_to,
        kwh_in_tier: Math.round(kwh * 100) / 100,
        price,
        subtotal: Math.round(variable * 100) / 100,
      },
    ],
  };
};

const calculateCost = async (kwh, provinceId, subsidy = 'N1') => {
  const tariffs = await Tariff.findAll({
    where: {
      province_id: provinceId,
      is_current: true,
    },
    order: [['tier_from', 'ASC']],
  });

  return computeCostFromTariffs(tariffs, kwh, subsidy);
};

module.exports = { calculateCost, computeCostFromTariffs };