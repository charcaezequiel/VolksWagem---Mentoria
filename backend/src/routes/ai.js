const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

router.get('/status', authenticateToken, aiController.status);
router.get('/insights', authenticateToken, aiController.insights);
router.get('/recommendations', authenticateToken, aiController.getRecommendations);
router.post('/recommendations/generate', authenticateToken, aiController.generateRecommendations);
router.put('/recommendations/:id', authenticateToken, aiController.updateRecommendation);
router.delete('/recommendations/:id', authenticateToken, aiController.deleteRecommendation);
router.post('/chat', authenticateToken, aiController.chat);

module.exports = router;
