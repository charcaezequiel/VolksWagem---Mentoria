const { body } = require('express-validator');

const createDevice = [
  body('name').notEmpty().withMessage('Device name is required'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('nominal_watts').isFloat({ min: 0 }).withMessage('Nominal watts must be a positive number'),
];

const updateDevice = [
  body('name').optional().notEmpty().withMessage('Device name cannot be empty'),
  body('nominal_watts').optional().isFloat({ min: 0 }).withMessage('Nominal watts must be a positive number'),
];

module.exports = { createDevice, updateDevice };
