const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

router.get('/overview', authenticateToken, dashboardController.getOverview);
router.get('/daily', authenticateToken, dashboardController.getDailyConsumption);
router.get('/monthly', authenticateToken, dashboardController.getMonthlyConsumption);
router.get('/device-breakdown', authenticateToken, dashboardController.getDeviceBreakdown);

module.exports = router;
