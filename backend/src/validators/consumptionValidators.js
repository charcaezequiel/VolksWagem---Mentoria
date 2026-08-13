const { body } = require('express-validator');

const addReading = [
  body('instant_watts').isFloat({ min: 0 }).withMessage('Instant watts must be a positive number'),
  body('accumulated_kwh_day').optional().isFloat({ min: 0 }).withMessage('Accumulated kWh must be a positive number'),
  body('device_id').optional().isUUID().withMessage('Device ID must be a valid UUID'),
  body('source').optional().isIn(['sensor', 'manual', 'estimated']).withMessage('Source must be sensor, manual, or estimated'),
  body('voltage').optional().isFloat({ min: 0 }).withMessage('Voltage must be a positive number'),
  body('current').optional().isFloat({ min: 0 }).withMessage('Current must be a positive number'),
  body('frequency').optional().isFloat({ min: 0 }).withMessage('Frequency must be a positive number'),
  body('power_factor').optional().isFloat({ min: -1, max: 1 }).withMessage('Power factor must be between -1 and 1'),
];

module.exports = { addReading };
