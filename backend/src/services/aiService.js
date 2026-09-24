const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Op } = require('sequelize');
const {
  User,
  Device,
  DeviceCategory,
  ConsumptionReading,
  Invoice,
  Alert,
  Recommendation,
  Province,
} = require('../models');
const { generateBillForecast } = require('./predictionService');
const { t, localizeAlert } = require('../utils/i18n');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (e) {
    console.warn('Error initializing Gemini:', e.message);
  }
}

const isConfigured = () => !!genAI;

const getModel = () => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.9,
    },
  });
};

const generateText = async (prompt) => {
  const model = getModel();
  if (!model) return null;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.warn('Gemini request failed:', error.message);
    return null;
  }
};

const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const pad2 = (n) => String(n).padStart(2, '0');

const buildUserContext = async (userId, lang) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Province, as: 'province' }],
    attributes: { exclude: ['password_hash'] },
  });

  const devices = await Device.findAll({
    where: { user_id: userId, is_active: true },
    include: [{ model: DeviceCategory, as: 'category', attributes: ['id', 'name'] }],
    order: [['created_at', 'ASC']],
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthReadings = await ConsumptionReading.findAll({
    where: { user_id: userId, reading_timestamp: { [Op.gte]: monthStart } },
    attributes: ['device_id', 'instant_watts', 'accumulated_kwh_day', 'reading_timestamp'],
    raw: true,
  });

  const invoices = await Invoice.findAll({
    where: { user_id: userId },
    order: [['period_year', 'DESC'], ['period_month', 'DESC']],
    limit: 6,
  });

  const alerts = await Alert.findAll({
    where: { user_id: userId, is_read: false },
    order: [['created_at', 'DESC']],
    limit: 5,
  });

  const byDevice = {};
  for (const r of monthReadings) {
    const id = r.device_id || 'unassigned';
    byDevice[id] = (byDevice[id] || 0) + (r.accumulated_kwh_day || r.instant_watts / 1000);
  }

  const devicesWithConsumption = devices.map((d) => ({
    name: d.name,
    category: d.category ? d.category.name : 'Otros',
    nominal_watts: d.nominal_watts,
    hours_daily_usage: d.hours_daily_usage,
    month_kwh: Math.round((byDevice[d.id] || 0) * 1000) / 1000,
    connected_to_sensor: !!d.device_token,
  }));

  let forecast = null;
  try {
    forecast = await generateBillForecast(userId, lang);
  } catch (e) {
    forecast = null;
  }

  const monthKwh = Math.round((Object.values(byDevice).reduce((a, b) => a + b, 0)) * 1000) / 1000;

  return {
    user: {
      name: user.name,
      user_type: user.user_type,
      province: user.province ? user.province.name : null,
      distributor: user.province ? user.province.distributor_name : null,
      alert_threshold_kwh: user.alert_threshold_kwh,
    },
    summary: {
      month_kwh: monthKwh,
      device_count: devices.length,
      invoices_count: invoices.length,
      unread_alerts: alerts.length,
    },
    devices: devicesWithConsumption,
    recent_invoices: invoices.map((i) => ({
      period: `${i.period_month}/${i.period_year}`,
      kwh: i.kwh_consumed,
      amount: i.amount_paid,
    })),
    unread_alerts: alerts.map((a) => {
      const loc = localizeAlert(a.toJSON ? a.toJSON() : a, lang);
      return { title: loc.title, message: loc.message, severity: loc.severity || a.severity };
    }),
    forecast: forecast
      ? {
          month: forecast.month_name,
          total_predicted_kwh: forecast.total_predicted_kwh,
          predicted_cost: forecast.predicted_cost,
          confidence: forecast.confidence_score,
          peak_day_kwh: forecast.peak_day_kwh,
        }
      : null,
  };
};

/* ----------------------- RECOMENDACIONES ----------------------- */

const fallbackRecommendations = async (userId, lang) => {
  const devices = await Device.findAll({
    where: { user_id: userId, is_active: true },
    include: [{ model: DeviceCategory, as: 'category' }],
  });

  const recs = [];

  if (devices.length === 0) {
    return [{
      title: t(lang, 'rec.add_devices.title'),
      description: t(lang, 'rec.add_devices.desc'),
      category: 'general',
      priority: 'medium',
      source: 'local',
      potential_savings_kwh: null,
      potential_savings_cost: null,
    }];
  }

  const sorted = [...devices].sort((a, b) => (b.nominal_watts * b.hours_daily_usage) - (a.nominal_watts * a.hours_daily_usage));
  const top = sorted[0];

  const hourlyCost = (device) => ((device.nominal_watts * device.hours_daily_usage) / 1000) * 0.085;

  recs.push({
    title: t(lang, 'rec.top_consumer.title', { name: top.name }),
    description: t(lang, 'rec.top_consumer.desc', {
      watts: top.nominal_watts,
      hours: top.hours_daily_usage,
    }),
    category: 'consumo',
    priority: 'high',
    source: 'local',
    potential_savings_kwh: Math.round(top.nominal_watts * top.hours_daily_usage * 0.1 * 30 / 1000),
    potential_savings_cost: Math.round(hourlyCost(top) * 0.1 * 30 * 100) / 100,
    metadata: { device_id: top.id, device_name: top.name },
  });

  const airConditioners = devices.filter((d) => (d.category && d.category.name === 'Climatización'));
  if (airConditioners.length > 0) {
    recs.push({
      title: t(lang, 'rec.ac.title'),
      description: t(lang, 'rec.ac.desc'),
      category: 'eficiencia',
      priority: 'high',
      source: 'local',
      potential_savings_kwh: null,
      potential_savings_cost: null,
    });
  }

  const refrigerators = devices.filter((d) => (d.category && d.category.name === 'Refrigeración'));
  if (refrigerators.length > 0) {
    recs.push({
      title: t(lang, 'rec.fridge.title'),
      description: t(lang, 'rec.fridge.desc'),
      category: 'mantenimiento',
      priority: 'medium',
      source: 'local',
      potential_savings_kwh: null,
      potential_savings_cost: null,
    });
  }

  recs.push({
    title: t(lang, 'rec.led.title'),
    description: t(lang, 'rec.led.desc'),
    category: 'eficiencia',
    priority: 'low',
    source: 'local',
    potential_savings_kwh: null,
    potential_savings_cost: null,
  });

  recs.push({
    title: t(lang, 'rec.standby.title'),
    description: t(lang, 'rec.standby.desc'),
    category: 'comportamiento',
    priority: 'medium',
    source: 'local',
    potential_savings_kwh: Math.round(10 * 30),
    potential_savings_cost: Math.round(10 * 30 * 0.085 * 100) / 100,
  });

  return recs;
};

const generateRecommendations = async (userId, force = false, lang) => {
  if (force) {
    await Recommendation.destroy({ where: { user_id: userId } });
  }

  const existing = await Recommendation.findAll({ where: { user_id: userId } });
  if (existing.length > 0) return existing;

  const context = await buildUserContext(userId, lang);

  if (isConfigured()) {
    const respondIn = lang === 'en'
      ? 'Write the recommendations in English.'
      : 'Escribí las recomendaciones en español rioplatense.';
    const prompt = `
Eres un asesor energético experto en Argentina. Analizá los datos de consumo de este hogar y generá recomendaciones concretas para ahorrar energía y dinero.

Datos del hogar (JSON):
${JSON.stringify(context)}

${respondIn}

Respondé SOLO con un array JSON válido de objetos con esta forma exacta (sin markdown, sin texto adicional):
[
  {
    "title": "Título corto y accionable",
    "description": "Explicación clara con el contexto del usuario",
    "category": "consumo|eficiencia|mantenimiento|comportamiento|general",
    "priority": "high|medium|low",
    "potential_savings_kwh": 0,
    "potential_savings_cost": 0
  }
]

Generá entre 4 y 6 recomendaciones personalizadas usando los datos reales del usuario (dispositivos, consumo mensual, facturas, pronóstico). Si el usuario no tiene datos, generá recomendaciones generales de ahorro de energía para Argentina.
`;
    const text = await generateText(prompt);
    if (text) {
      const parsed = parseRecommendations(text);
      if (parsed && parsed.length > 0) {
        const rows = parsed.map((r) => ({
          user_id: userId,
          title: r.title,
          description: r.description,
          category: r.category || 'general',
          priority: r.priority || 'medium',
          potential_savings_kwh: r.potential_savings_kwh != null ? r.potential_savings_kwh : null,
          potential_savings_cost: r.potential_savings_cost != null ? r.potential_savings_cost : null,
          source: 'ai',
          metadata: r,
        }));
        const created = await Recommendation.bulkCreate(rows);
        return created;
      }
    }
  }

  const fallback = await fallbackRecommendations(userId, lang);
  const rows = fallback.map((r) => ({ ...r, user_id: userId }));
  return Recommendation.bulkCreate(rows);
};

const parseRecommendations = (text) => {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    const array = JSON.parse(cleaned.slice(start, end + 1));
    if (Array.isArray(array)) return array;
    return null;
  } catch (e) {
    return null;
  }
};

/* ----------------------- CHAT ----------------------- */

const getSystemPrompt = (lang) => `
Sos "ControlAR", el asistente energético de ControlAR Energía, una aplicación argentina de monitoreo de consumo eléctrico.

${lang === 'en'
    ? 'Respond in clear, concise English. You may use **bold** and lists.'
    : 'Respondé en español rioplatense, de forma clara y concisa. Podés usar **negritas** y listas.'}

Tenés acceso al contexto del usuario (entre marcas <CONTEXTO>). Usalo para responder preguntas sobre su consumo, y cuando te pregunten sobre su propio hogar, basate en esos datos.

<CONTEXTO>
{context}
</CONTEXTO>

Reglas:
- Si no conocés la respuesta, sé honesto y ofrecé consultar más datos.
- Para preguntas de "cuánto voy a pagar", usá el pronóstico si existe.
- Podés recomendar consejos de ahorro de energía adaptados al contexto.
- Si te preguntan por tarifas, mencioná los rangos y que pueden verlos en la sección Tarifas.
`;

const fallbackChat = async (message, context, lang) => {
  const msg = message.toLowerCase();
  const monthKwh = context.summary ? context.summary.month_kwh : 0;

  if (/(hola|buenas|hey|hello|hi)/i.test(msg)) {
    return t(lang, 'chat.hello', { name: context.user.name });
  }
  if (/(cu[áa]nto.*pagar|boleta|pron[óo]stico|predicci[óo]n|mes.*viene|bill|forecast|predict)/i.test(msg)) {
    if (context.forecast) {
      return t(lang, 'chat.bill_forecast', {
        month: context.forecast.month,
        cost: context.forecast.predicted_cost.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR'),
        kwh: context.forecast.total_predicted_kwh,
        confidence: Math.round(context.forecast.confidence * 100),
      });
    }
    return t(lang, 'chat.bill_no_data');
  }
  if (/(consumo|cu[áa]nta.*energ[ií]a|kwh|consumption)/i.test(msg)) {
    return t(lang, 'chat.consumption', { kwh: monthKwh.toFixed(1) });
  }
  if (/(ahorrar|reducir|consejo|recomendac|tip|save|saving|advice)/i.test(msg)) {
    const top = context.devices && context.devices.length > 0
      ? context.devices.sort((a, b) => (b.month_kwh || 0) - (a.month_kwh || 0))[0]
      : null;
    let reply = t(lang, 'chat.tips_header');
    reply += t(lang, 'chat.tip_ac');
    reply += t(lang, 'chat.tip_standby');
    reply += t(lang, 'chat.tip_laundry');
    if (top) reply += t(lang, 'chat.tip_top', { name: top.name, kwh: top.month_kwh || 0 });
    reply += t(lang, 'chat.tips_footer');
    return reply;
  }
  if (/(dispositivo|equipo|electrodom[ée]stico|device|appliance)/i.test(msg)) {
    if (!context.devices || context.devices.length === 0) {
      return t(lang, 'chat.devices_none');
    }
    const lines = context.devices.map((d) => `- **${d.name}** (${d.category}): ${d.nominal_watts} W, ${d.month_kwh || 0} kWh ${lang === 'en' ? 'this month' : 'este mes'}`).join('\n');
    return `${t(lang, 'chat.devices_list')}${lines}`;
  }
  if (/(factura|pagar|tarifa|invoice|bill.*history)/i.test(msg)) {
    if (!context.recent_invoices || context.recent_invoices.length === 0) {
      return t(lang, 'chat.invoices_none');
    }
    const last = context.recent_invoices[0];
    return t(lang, 'chat.last_invoice', {
      period: last.period,
      kwh: last.kwh,
      amount: last.amount.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR'),
    });
  }
  if (/(alerta|anomal[íi]a|problema|alert|anomal)/i.test(msg)) {
    if (!context.unread_alerts || context.unread_alerts.length === 0) {
      return t(lang, 'chat.alerts_none');
    }
    const lines = context.unread_alerts.map((a) => `- **${a.title}** (${a.severity}): ${a.message}`).join('\n');
    return `${t(lang, 'chat.alerts_list', { count: context.unread_alerts.length })}\n${lines}`;
  }
  if (/(ayuda|qu[ée] pod[ée]s|qu[ée] hac[eé]s|help|what can you)/i.test(msg)) {
    return t(lang, 'chat.help_intro');
  }
  return t(lang, 'chat.default');
};

const chat = async (userId, message, history = [], lang) => {
  const context = await buildUserContext(userId, lang);

  if (!isConfigured()) {
    return { reply: await fallbackChat(message, context, lang), provider: 'local' };
  }

  const model = getModel();
  try {
    const formattedHistory = (history || []).slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || m.text }],
    }));

    const chatSession = model.startChat({
      history: formattedHistory,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    });

    const prompt = `${getSystemPrompt(lang).replace('{context}', JSON.stringify(context))}\n\nUsuario: ${message}`;
    const result = await chatSession.sendMessage(prompt);
    const reply = result.response.text();
    return { reply, provider: 'gemini' };
  } catch (error) {
    console.warn('Gemini chat failed:', error.message);
    return { reply: await fallbackChat(message, context, lang), provider: 'local' };
  }
};

/* ----------------------- INSIGHTS ----------------------- */

const generateInsights = async (userId, lang) => {
  const context = await buildUserContext(userId, lang);
  const monthKwh = context.summary ? context.summary.month_kwh : 0;
  const deviceCount = context.summary ? context.summary.device_count : 0;
  const topDevice = context.devices && context.devices.length > 0
    ? context.devices.sort((a, b) => (b.month_kwh || 0) - (a.month_kwh || 0))[0]
    : null;

  const localInsight = t(lang, 'insight.local', {
    kwh: monthKwh.toFixed(1),
    count: deviceCount,
    top: topDevice
      ? t(lang, 'insight.top', { name: topDevice.name, kwh: topDevice.month_kwh || 0 })
      : '',
    forecast: context.forecast
      ? t(lang, 'insight.forecast', {
          cost: context.forecast.predicted_cost.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR'),
          confidence: Math.round(context.forecast.confidence * 100),
        })
      : '',
  });

  if (!isConfigured()) {
    return { insight: localInsight, provider: 'local' };
  }

  const respondIn = lang === 'en'
    ? 'Write your analysis in English.'
    : 'Escribí el análisis en español rioplatense.';
  const prompt = `
Analizá el consumo energético de este hogar argentino y resumí en un párrafo de 3-4 oraciones los puntos más importantes (qué significa su consumo, qué se viene el próximo mes, y una acción concreta para ahorrar).

${respondIn}

Datos (JSON):
${JSON.stringify(context)}
`;
  const text = await generateText(prompt);
  if (text) {
    return { insight: text.trim(), provider: 'gemini' };
  }
  return { insight: localInsight, provider: 'local' };
};

module.exports = {
  isConfigured,
  generateRecommendations,
  chat,
  generateInsights,
  buildUserContext,
};
