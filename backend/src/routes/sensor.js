const express = require('express');
const router = express.Router();
const { authenticateSensor } = require('../middleware/auth');
const sensorController = require('../controllers/sensorController');

router.post('/readings', authenticateSensor, sensorController.addReading);

module.exports = router;
