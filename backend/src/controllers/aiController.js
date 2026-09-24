const { Recommendation } = require('../models');
const aiService = require('../services/aiService');
const { localizeRecommendation } = require('../utils/i18n');

exports.getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await Recommendation.findAll({
      where: { user_id: req.user.id },
      order: [
        ['status', 'ASC'],
        [Recommendation.sequelize.literal("CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END"), 'ASC'],
        ['created_at', 'DESC'],
      ],
    });
    // Las recomendaciones guardadas pueden haberse generado en español: las
    // retraduce a inglés on-the-fly si el usuario está viendo la app en inglés.
    const localized = recommendations.map((rec) => localizeRecommendation(rec.toJSON ? rec.toJSON() : rec, req.lang));
    res.json({ recommendations: localized });
  } catch (error) {
    next(error);
  }
};

exports.generateRecommendations = async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const recommendations = await aiService.generateRecommendations(req.user.id, force, req.lang);
    res.json({ recommendations, provider: aiService.isConfigured() ? 'gemini' : 'local' });
  } catch (error) {
    next(error);
  }
};

exports.updateRecommendation = async (req, res, next) => {
  try {
    const { status } = req.body;
    const recommendation = await Recommendation.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (status !== undefined) recommendation.status = status;
    await recommendation.save();

    res.json({ recommendation });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecommendation = async (req, res, next) => {
  try {
    const recommendation = await Recommendation.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    await recommendation.destroy();
    res.json({ message: 'Recommendation deleted' });
  } catch (error) {
    next(error);
  }
};

exports.chat = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const result = await aiService.chat(req.user.id, message, history, req.lang);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.insights = async (req, res, next) => {
  try {
    const result = await aiService.generateInsights(req.user.id, req.lang);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.status = (req, res) => {
  res.json({
    provider: aiService.isConfigured() ? 'gemini' : 'local',
    configured: aiService.isConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  });
};
