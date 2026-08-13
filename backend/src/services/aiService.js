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

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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

const buildUserContext = async (userId) => {
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
    forecast = await generateBillForecast(userId);
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
    unread_alerts: alerts.map((a) => ({ title: a.title, message: a.message, severity: a.severity })),
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

const fallbackRecommendations = async (userId) => {
  const devices = await Device.findAll({
    where: { user_id: userId, is_active: true },
    include: [{ model: DeviceCategory, as: 'category' }],
  });

  const recs = [];

  if (devices.length === 0) {
    return [{
      title: 'Agregá tus dispositivos',
      description: 'Registrá tus electrodomésticos para poder analizar tu consumo y recibir recomendaciones personalizadas.',
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
    title: `${top.name} es tu mayor consumidor`,
    description: `Con ${top.nominal_watts} W y ${top.hours_daily_usage} hs de uso diario, es el dispositivo que más aporta a tu boleta. Revisá si podés reducir sus horas de uso o reemplazarlo por uno más eficiente.`,
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
      title: 'Optimizá el aire acondicionado',
      description: 'Configurá el termostato a 24°C y usá el modo eco. Cada grado por debajo de 24°C aumenta el consumo hasta un 8%.',
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
      title: 'Chequeá las gomas de tu heladera',
      description: 'Si la puerta no cierra bien, el compresor trabaja de más. Verificá los burletes y mantené una distancia de 10 cm de la pared para ventilación.',
      category: 'mantenimiento',
      priority: 'medium',
      source: 'local',
      potential_savings_kwh: null,
      potential_savings_cost: null,
    });
  }

  recs.push({
    title: 'Aprovechá la luz natural y LED',
    description: 'Reemplazá lámparas incandescentes por LED de bajo consumo. Una lámpara LED de 9W consume 85% menos que una de 60W con la misma luminosidad.',
    category: 'eficiencia',
    priority: 'low',
    source: 'local',
    potential_savings_kwh: null,
    potential_savings_cost: null,
  });

  recs.push({
    title: 'Desconectá los consumos en stand-by',
    description: 'Televisores, decodificadores y cargadores siguen consumiendo en stand-by. Usá zapatillas con interruptor y desconectalos de noche.',
    category: 'comportamiento',
    priority: 'medium',
    source: 'local',
    potential_savings_kwh: Math.round(10 * 30),
    potential_savings_cost: Math.round(10 * 30 * 0.085 * 100) / 100,
  });

  return recs;
};

const generateRecommendations = async (userId, force = false) => {
  if (force) {
    await Recommendation.destroy({ where: { user_id: userId } });
  }

  const existing = await Recommendation.findAll({ where: { user_id: userId } });
  if (existing.length > 0) return existing;

  const context = await buildUserContext(userId);

  if (isConfigured()) {
    const prompt = `
Eres un asesor energético experto en Argentina. Analizá los datos de consumo de este hogar y generá recomendaciones concretas para ahorrar energía y dinero.

Datos del hogar (JSON):
${JSON.stringify(context)}

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

  const fallback = await fallbackRecommendations(userId);
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

const SYSTEM_PROMPT = `
Sos "ControlAR", el asistente energético de ControlAR Energía, una aplicación argentina de monitoreo de consumo eléctrico.

Respondé en español rioplatense, de forma clara y concisa. Podés usar **negritas** y listas.

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

const fallbackChat = async (message, context) => {
  const msg = message.toLowerCase();
  const monthKwh = context.summary ? context.summary.month_kwh : 0;

  if (/(hola|buenas|hey)/i.test(msg)) {
    return `¡Hola ${context.user.name}! 👋 Soy tu asistente energético. Podés preguntarme sobre tu consumo, cómo ahorrar energía, tus facturas o el pronóstico del mes que viene.`;
  }
  if (/(cu[áa]nto.*pagar|boleta|pron[óo]stico|predicci[óo]n|mes.*viene)/i.test(msg)) {
    if (context.forecast) {
      return `Según mi análisis, tu boleta estimada para **${context.forecast.month}** sería de aproximadamente **$${context.forecast.predicted_cost.toLocaleString('es-AR')}** por **${context.forecast.total_predicted_kwh} kWh** consumidos (confianza del ${Math.round(context.forecast.confidence * 100)}%).\n\nDetalle en la sección **Predicciones**.`;
    }
    return 'Todavía no tengo datos suficientes para estimar tu boleta. Cargá tu provincia y algunos consumos en la app y volvé a preguntarme. 📊';
  }
  if (/(consumo|cu[áa]nta.*energ[ií]a|kwh)/i.test(msg)) {
    return `En lo que va del mes registrás **${monthKwh.toFixed(1)} kWh**. Podés ver el detalle diario y por dispositivo en la sección **Consumo**.\n\nTip: identificá el dispositivo que más consume y tratá de reducir sus horas de uso.`;
  }
  if (/(ahorrar|reducir|consejo|recomendac|tip)/i.test(msg)) {
    const top = context.devices && context.devices.length > 0
      ? context.devices.sort((a, b) => (b.month_kwh || 0) - (a.month_kwh || 0))[0]
      : null;
    let reply = 'Algunos consejos para ahorrar energía en Argentina:\n\n';
    reply += '1. **Aire acondicionado a 24°C** en verano, con el modo eco activado.\n';
    reply += '2. **Desconectá los stand-by** de TV y decodificadores por la noche.\n';
    reply += '3. **Lavarropas con agua fría** y carga completa.\n';
    if (top) reply += `4. **${top.name}** es el que más consume en tu hogar (${top.month_kwh} kWh este mes) — priorizá reducir su uso.\n`;
    reply += '\nTambién podés ver recomendaciones personalizadas en la sección **Recomendaciones**.';
    return reply;
  }
  if (/(dispositivo|equipo|electrodom[ée]stico)/i.test(msg)) {
    if (!context.devices || context.devices.length === 0) {
      return 'Todavía no tenés dispositivos registrados. Andá a **Mis Dispositivos** y agregalos para empezar a monitorear tu consumo.';
    }
    const lines = context.devices.map((d) => `- **${d.name}** (${d.category}): ${d.nominal_watts} W, ${d.month_kwh || 0} kWh este mes`).join('\n');
    return `Tus dispositivos registrados:\n\n${lines}`;
  }
  if (/(factura|pagar|tarifa)/i.test(msg)) {
    if (!context.recent_invoices || context.recent_invoices.length === 0) {
      return 'Todavía no registraste facturas. Cargalas en la sección **Facturas** para analizar tu historial.';
    }
    const last = context.recent_invoices[0];
    return `Tu última factura fue **${last.period}**: ${last.kwh} kWh por **$${last.amount.toLocaleString('es-AR')}**.\n\nPodés comparar mes a mes en la sección **Facturas**.`;
  }
  if (/(alerta|anomal[íi]a|problema)/i.test(msg)) {
    if (!context.unread_alerts || context.unread_alerts.length === 0) {
      return 'No tenés alertas sin leer. Todo tranquilo por acá ✅';
    }
    const lines = context.unread_alerts.map((a) => `- **${a.title}** (${a.severity}): ${a.message}`).join('\n');
    return `Tenés ${context.unread_alerts.length} alerta(s) sin leer:\n\n${lines}`;
  }
  if (/(ayuda|qu[ée] pod[ée]s|qu[ée] hac[eé]s)/i.test(msg)) {
    return 'Puedo ayudarte con:\n\n- **Tu consumo**: resúmenes y análisis.\n- **Tu boleta**: estimación del próximo mes.\n- **Ahorro**: consejos y recomendaciones.\n- **Dispositivos**: cuál consume más.\n- **Facturas y alertas**: historial y estado.\n\n¿Sobre qué querés hablar?';
  }
  return 'Interesante pregunta 🤔. Mi conocimiento se enfoca en tu consumo energético, ahorro de energía, tarifas argentinas y el monitoreo de tus dispositivos. ¿Querés que te cuente sobre tu consumo o cómo ahorrar energía?';
};

const chat = async (userId, message, history = []) => {
  const context = await buildUserContext(userId);

  if (!isConfigured()) {
    return { reply: await fallbackChat(message, context), provider: 'local' };
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

    const prompt = `${SYSTEM_PROMPT.replace('{context}', JSON.stringify(context))}\n\nUsuario: ${message}`;
    const result = await chatSession.sendMessage(prompt);
    const reply = result.response.text();
    return { reply, provider: 'gemini' };
  } catch (error) {
    console.warn('Gemini chat failed:', error.message);
    return { reply: await fallbackChat(message, context), provider: 'local' };
  }
};

/* ----------------------- INSIGHTS ----------------------- */

const generateInsights = async (userId) => {
  const context = await buildUserContext(userId);
  const monthKwh = context.summary ? context.summary.month_kwh : 0;
  const deviceCount = context.summary ? context.summary.device_count : 0;
  const topDevice = context.devices && context.devices.length > 0
    ? context.devices.sort((a, b) => (b.month_kwh || 0) - (a.month_kwh || 0))[0]
    : null;

  const localInsight = `Consumís ${monthKwh.toFixed(1)} kWh este mes con ${deviceCount} dispositivos.${topDevice ? ` Tu mayor consumo viene de **${topDevice.name}** (${topDevice.month_kwh || 0} kWh).` : ''}${context.forecast ? ` Para el mes que viene se estima una boleta de **$${context.forecast.predicted_cost.toLocaleString('es-AR')}** con una confianza del ${Math.round(context.forecast.confidence * 100)}%.` : ''}`;

  if (!isConfigured()) {
    return { insight: localInsight, provider: 'local' };
  }

  const prompt = `
Analizá el consumo energético de este hogar argentino y resumí en un párrafo de 3-4 oraciones los puntos más importantes (qué significa su consumo, qué se viene el próximo mes, y una acción concreta para ahorrar).

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
