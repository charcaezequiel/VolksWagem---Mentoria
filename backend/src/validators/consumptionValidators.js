const { body } = require('express-validator');

const addReading = [
  body('instant_watts').isFloat({ min: 0 }).withMessage('Instant watts must be a positive number'),
  body('accumulated_kwh_day').optional().isFloat({ min: 0 }).withMessage('Accumulated kWh must be a positive number'),
  body('device_id').optional().isUUID().withMessage('Device ID must be a valid UUID'),
  body('source').optional().isIn(['sensor', 'manual', 'estimated']).withMessage('Source must be sensor, manual, or estimated'),
];

module.exports = { addReading };
