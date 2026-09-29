const { AiConfig } = require('../models');

/**
 * Valores por defecto. Son los mismos que estaban hardcodeados en
 * predictionService.js y aiService.js antes de que existiera esta tabla.
 * Se usan cuando la fila singleton todavia no fue creada, para que el motor
 * funcione igual en una base recien migrada.
 */
const DEFAULTS = {
  model_version: 'v2.1-bill-ai',
  seasonal_factors: {
    1: 1.3, 2: 1.25, 3: 1.1, 4: 0.9, 5: 0.85, 6: 0.8,
    7: 0.8, 8: 0.85, 9: 0.9, 10: 1.0, 11: 1.15, 12: 1.3,
  },
  history_window_days: 30,
  bill_forecast_window_days: 90,
  weekend_factor: 1.1,
  bill_weekend_factor: 1.08,
  anomaly_sigma: 2.0,
  min_days_for_anomalies: 3,
  confidence_thresholds: [[60, 0.92], [30, 0.85], [14, 0.7], [7, 0.55], [0, 0.4]],
  min_confidence: 0.2,
  max_confidence: 0.98,
  gemini_model: 'gemini-3.6-flash',
  temperature: 0.7,
  top_p: 0.9,
  max_output_tokens: 2048,
  chat_history_turns: 8,
  tax_factor: 1.31,
  fallback_price_per_kwh: 0.085,
};

/** Campos que el admin puede editar, con su tipo para validar. */
const EDITABLE = {
  model_version: 'string',
  seasonal_factors: 'seasonal',
  history_window_days: 'int',
  bill_forecast_window_days: 'int',
  weekend_factor: 'float',
  bill_weekend_factor: 'float',
  anomaly_sigma: 'float',
  min_days_for_anomalies: 'int',
  confidence_thresholds: 'ladder',
  min_confidence: 'float',
  max_confidence: 'float',
  gemini_model: 'string',
  temperature: 'float',
  top_p: 'float',
  max_output_tokens: 'int',
  chat_history_turns: 'int',
  tax_factor: 'float',
  fallback_price_per_kwh: 'float',
};

/**
 * Devuelve la configuracion activa. Crea la fila singleton la primera vez.
 * Nunca lanza: si la tabla no existe todavia (base sin migrar) devuelve
 * DEFAULTS, para que el motor de prediccion siga funcionando.
 */
const getConfig = async () => {
  try {
    const row = await AiConfig.findByPk(1);
    if (!row) {
      return { ...DEFAULTS };
    }
    return row;
  } catch (error) {
    return { ...DEFAULTS };
  }
};

const getWithMeta = async () => {
  const config = await getConfig();
  return {
    config: config.toJSON ? config.toJSON() : config,
    defaults: DEFAULTS,
    editable: Object.keys(EDITABLE),
  };
};

/** Valida y guarda un patch parcial. Devuelve { config } o { error }. */
const updateConfig = async (patch, adminId) => {
  const errors = [];
  const clean = {};

  for (const [key, kind] of Object.entries(EDITABLE)) {
    if (patch[key] === undefined) continue;
    const value = patch[key];

    if (kind === 'string') {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${key} must be a non-empty string`);
        continue;
      }
      clean[key] = value.trim();
    } else if (kind === 'int') {
      const n = Number(value);
      if (!Number.isInteger(n)) {
        errors.push(`${key} must be an integer`);
        continue;
      }
      clean[key] = n;
    } else if (kind === 'float') {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors.push(`${key} must be a number`);
        continue;
      }
      clean[key] = n;
    } else if (kind === 'seasonal') {
      // Debe traer los 12 meses con factor > 0.
      if (!value || typeof value !== 'object') {
        errors.push('seasonal_factors must be an object with months 1-12');
        continue;
      }
      const factors = {};
      let ok = true;
      for (let m = 1; m <= 12; m++) {
        const f = Number(value[m] ?? value[String(m)]);
        if (!Number.isFinite(f) || f <= 0) {
          ok = false;
          errors.push(`seasonal_factors.${m} must be a positive number`);
          break;
        }
        factors[m] = f;
      }
      if (!ok) continue;
      clean[key] = factors;
    } else if (kind === 'ladder') {
      // Lista [dias, confianza] ordenada de mas dias a menos.
      if (!Array.isArray(value) || value.length === 0) {
        errors.push('confidence_thresholds must be a non-empty list');
        continue;
      }
      const ladder = value.map((pair, i) => {
        if (!Array.isArray(pair) || pair.length !== 2) {
          errors.push(`confidence_thresholds[${i}] must be [days, confidence]`);
          return null;
        }
        const days = Number(pair[0]);
        const conf = Number(pair[1]);
        if (!Number.isFinite(days) || days < 0) {
          errors.push(`confidence_thresholds[${i}][0] must be a non-negative integer`);
          return null;
        }
        if (!Number.isFinite(conf) || conf < 0 || conf > 1) {
          errors.push(`confidence_thresholds[${i}][1] must be between 0 and 1`);
          return null;
        }
        return [days, conf];
      });
      if (errors.length) continue;
      ladder.sort((a, b) => b[0] - a[0]);
      clean[key] = ladder;
    }
  }

  if (errors.length) {
    return { error: errors };
  }

  const [row] = await AiConfig.findOrCreate({
    where: { singleton_id: 1 },
    defaults: { ...DEFAULTS, ...clean, updated_by: adminId },
  });
  await row.update({ ...clean, updated_by: adminId });
  return { config: row };
};

const resetConfig = async (adminId) => {
  const [row] = await AiConfig.findOrCreate({
    where: { singleton_id: 1 },
    defaults: { ...DEFAULTS, updated_by: adminId },
  });
  await row.update({ ...DEFAULTS, updated_by: adminId });
  return { config: row };
};

module.exports = { DEFAULTS, EDITABLE, getConfig, getWithMeta, updateConfig, resetConfig };
