const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Parametros configurables del motor de prediccion y del LLM.
 *
 * Antes vivian como constantes dentro de predictionService.js / aiService.js.
 * Ahora viven en una fila singleton: el admin los edita desde el panel y el
 * motor los lee en cada corrida, sin recompilar ni reiniciar.
 *
 * Solo hay una fila (singleton_id = 1). Ver aiConfigService.js.
 */
const AiConfig = sequelize.define('AiConfig', {
  singleton_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1,
  },
  // ---- Motor de prediccion ----
  model_version: {
    type: DataTypes.STRING(50),
    defaultValue: 'v2.1-bill-ai',
  },
  // Factores estacionales por mes (1..12). JSONB con 12 claves "1".."12".
  // Argentina: verano en dic-ene-feb, invierno en jun-jul.
  seasonal_factors: {
    type: DataTypes.JSONB,
    defaultValue: {
      1: 1.3, 2: 1.25, 3: 1.1, 4: 0.9, 5: 0.85, 6: 0.8,
      7: 0.8, 8: 0.85, 9: 0.9, 10: 1.0, 11: 1.15, 12: 1.3,
    },
  },
  // Ventana historica en dias que alimenta la regresion.
  history_window_days: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    validate: { min: { args: [7], msg: 'History window must be at least 7 days' },
      max: { args: [365], msg: 'History window cannot exceed 365 days' } },
  },
  // Ventana historica del pronostico de factura.
  bill_forecast_window_days: {
    type: DataTypes.INTEGER,
    defaultValue: 90,
    validate: { min: { args: [7], msg: 'Bill forecast window must be at least 7 days' },
      max: { args: [365], msg: 'Bill forecast window cannot exceed 365 days' } },
  },
  weekend_factor: {
    type: DataTypes.FLOAT,
    defaultValue: 1.1,
    validate: { min: { args: [0.1], msg: 'Weekend factor must be positive' },
      max: { args: [5], msg: 'Weekend factor must be at most 5' } },
  },
  bill_weekend_factor: {
    type: DataTypes.FLOAT,
    defaultValue: 1.08,
    validate: { min: { args: [0.1], msg: 'Bill weekend factor must be positive' },
      max: { args: [5], msg: 'Bill weekend factor must be at most 5' } },
  },
  // Z-score para marcar anomalias: 2 = 2 desvios.
  anomaly_sigma: {
    type: DataTypes.FLOAT,
    defaultValue: 2.0,
    validate: { min: { args: [0.5], msg: 'Anomaly sigma must be at least 0.5' },
      max: { args: [5], msg: 'Anomaly sigma must be at most 5' } },
  },
  // Dias minimos de historial antes de intentar detectar anomalias.
  min_days_for_anomalies: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: { min: { args: [1], msg: 'Minimum days must be at least 1' },
      max: { args: [90], msg: 'Minimum days cannot exceed 90' } },
  },
  // Escalera de confianza: dias de datos -> confianza. JSONB [[dias, valor], ...]
  confidence_thresholds: {
    type: DataTypes.JSONB,
    defaultValue: [[60, 0.92], [30, 0.85], [14, 0.7], [7, 0.55], [0, 0.4]],
  },
  min_confidence: {
    type: DataTypes.FLOAT,
    defaultValue: 0.2,
    validate: { min: { args: [0], msg: 'Min confidence must be between 0 and 1' },
      max: { args: [1], msg: 'Min confidence must be between 0 and 1' } },
  },
  max_confidence: {
    type: DataTypes.FLOAT,
    defaultValue: 0.98,
    validate: { min: { args: [0], msg: 'Max confidence must be between 0 and 1' },
      max: { args: [1], msg: 'Max confidence must be between 0 and 1' } },
  },

  // ---- LLM (Gemini) ----
  gemini_model: {
    type: DataTypes.STRING(80),
    defaultValue: 'gemini-3.6-flash',
  },
  temperature: {
    type: DataTypes.FLOAT,
    defaultValue: 0.7,
    validate: { min: { args: [0], msg: 'Temperature must be between 0 and 2' },
      max: { args: [2], msg: 'Temperature must be between 0 and 2' } },
  },
  top_p: {
    type: DataTypes.FLOAT,
    defaultValue: 0.9,
    validate: { min: { args: [0], msg: 'Top P must be between 0 and 1' },
      max: { args: [1], msg: 'Top P must be between 0 and 1' } },
  },
  max_output_tokens: {
    type: DataTypes.INTEGER,
    defaultValue: 2048,
    validate: { min: { args: [128], msg: 'Max output tokens must be at least 128' },
      max: { args: [32768], msg: 'Max output tokens must be at most 32768' } },
  },
  // Turnos de historial que se mantienen en el chat.
  chat_history_turns: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
    validate: { min: { args: [0], msg: 'Chat history turns must be at least 0' },
      max: { args: [50], msg: 'Chat history turns must be at most 50' } },
  },

  // ---- Facturacion ----
  // IVA + tasas aplicados al subtotal. 1.31 = 21% IVA + tasas municipales.
  tax_factor: {
    type: DataTypes.FLOAT,
    defaultValue: 1.31,
    validate: { min: { args: [1], msg: 'Tax factor must be at least 1' },
      max: { args: [3], msg: 'Tax factor must be at most 3' } },
  },
  // Precio de referencia $/kWh que usa el fallback sin LLM.
  fallback_price_per_kwh: {
    type: DataTypes.FLOAT,
    defaultValue: 0.085,
    validate: { min: { args: [0], msg: 'Fallback price must be non-negative' } },
  },

  // ---- Auditoria ----
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName: 'ai_configs',
});

module.exports = AiConfig;
