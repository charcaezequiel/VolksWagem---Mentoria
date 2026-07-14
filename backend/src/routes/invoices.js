const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { Invoice, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createInvoice } = require('../validators/invoiceValidators');
const { calculateCost } = require('../services/tariffService');

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const invoices = await Invoice.findAll({
      where: { user_id: req.user.id },
      order: [['period_year', 'DESC'], ['period_month', 'DESC']],
    });
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, validate(createInvoice), async (req, res, next) => {
  try {
    const { period_month, period_year, kwh_consumed, amount_paid } = req.body;

    let tariff_applied = 0;
    if (req.user.province_id) {
      const costResult = await calculateCost(kwh_consumed, req.user.province_id);
      tariff_applied = costResult.total_cost;
    }

    const invoice = await Invoice.create({
      user_id: req.user.id,
      period_month,
      period_year,
      kwh_consumed,
      amount_paid,
      tariff_applied,
    });

    res.status(201).json({ invoice });
  } catch (error) {
    next(error);
  }
});

router.get('/comparison', authenticateToken, async (req, res, next) => {
  try {
    const invoices = await Invoice.findAll({
      where: { user_id: req.user.id },
      order: [['period_year', 'ASC'], ['period_month', 'ASC']],
    });

    const currentYear = new Date().getFullYear();
    const thisYear = invoices.filter((inv) => inv.period_year === currentYear);
    const lastYear = invoices.filter((inv) => inv.period_year === currentYear - 1);

    const monthlyComparison = [];
    for (let m = 1; m <= 12; m++) {
      const current = thisYear.find((inv) => inv.period_month === m);
      const previous = lastYear.find((inv) => inv.period_month === m);
      monthlyComparison.push({
        month: m,
        current_kwh: current ? current.kwh_consumed : null,
        previous_kwh: previous ? previous.kwh_consumed : null,
        current_amount: current ? current.amount_paid : null,
        previous_amount: previous ? previous.amount_paid : null,
      });
    }

    res.json({
      current_year: currentYear,
      comparison: monthlyComparison,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
