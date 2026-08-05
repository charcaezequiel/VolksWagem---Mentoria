const { body } = require('express-validator');

const createInvoice = [
  body('period_month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('period_year').isInt({ min: 2020 }).withMessage('Year must be 2020 or later'),
  body('kwh_consumed').isFloat({ min: 0 }).withMessage('kWh consumed must be a positive number'),
  body('amount_paid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
];

module.exports = { createInvoice };
