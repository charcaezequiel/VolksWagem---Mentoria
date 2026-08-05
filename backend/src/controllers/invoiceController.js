const { Invoice } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      where: { user_id: req.user.id },
      order: [['period_year', 'DESC'], ['period_month', 'DESC']],
    });

    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { period_month, period_year, kwh_consumed, amount_paid, tariff_applied } = req.body;

    const existing = await Invoice.findOne({
      where: {
        user_id: req.user.id,
        period_month,
        period_year,
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Invoice already exists for this period' });
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
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getComparison = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;

    const invoices = await Invoice.findAll({
      where: { user_id: req.user.id },
      order: [['period_year', 'DESC'], ['period_month', 'DESC']],
      limit: months,
    });

    const comparison = invoices.map((inv) => ({
      month: inv.period_month,
      year: inv.period_year,
      kwh: inv.kwh_consumed,
      cost: inv.amount_paid,
    }));

    res.json({ comparison });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
