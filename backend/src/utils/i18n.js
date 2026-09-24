// Ayudante de idioma para el backend.
// El frontend envía el idioma activo en el header `Accept-Language`.
const MONTHS = {
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const getLang = (req) => {
  const header = (req.headers['accept-language'] || 'es').toLowerCase();
  return header.includes('en') ? 'en' : 'es';
};

// Interpola {param} en un texto.
const fmt = (text, params) => {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
};

const DICT = {
  'pred.no_province': {
    es: 'Configurá tu provincia para poder estimar el costo de tu boleta',
    en: 'Set up your province to be able to estimate your bill cost',
  },
  'pred.no_data': {
    es: 'No hay datos de consumo suficientes para generar la predicción',
    en: 'Not enough consumption data to generate the prediction',
  },
  // Recomendaciones por reglas (fallback local)
  'rec.add_devices.title': {
    es: 'Agregá tus dispositivos',
    en: 'Add your devices',
  },
  'rec.add_devices.desc': {
    es: 'Registrá tus electrodomésticos para poder analizar tu consumo y recibir recomendaciones personalizadas.',
    en: 'Register your appliances so we can analyze your consumption and give you personalized recommendations.',
  },
  'rec.top_consumer.title': {
    es: '{name} es tu mayor consumidor',
    en: '{name} is your biggest consumer',
  },
  'rec.top_consumer.desc': {
    es: 'Con {watts} W y {hours} hs de uso diario, es el dispositivo que más aporta a tu boleta. Revisá si podés reducir sus horas de uso o reemplazarlo por uno más eficiente.',
    en: 'With {watts} W and {hours} hours of daily use, it is the device that contributes the most to your bill. Check if you can reduce its usage hours or replace it with a more efficient one.',
  },
  'rec.ac.title': {
    es: 'Optimizá el aire acondicionado',
    en: 'Optimize your air conditioner',
  },
  'rec.ac.desc': {
    es: 'Configurá el termostato a 24°C y usá el modo eco. Cada grado por debajo de 24°C aumenta el consumo hasta un 8%.',
    en: 'Set the thermostat to 24°C and use eco mode. Each degree below 24°C increases consumption by up to 8%.',
  },
  'rec.fridge.title': {
    es: 'Chequeá las gomas de tu heladera',
    en: 'Check your fridge seals',
  },
  'rec.fridge.desc': {
    es: 'Si la puerta no cierra bien, el compresor trabaja de más. Verificá los burletes y mantené una distancia de 10 cm de la pared para ventilación.',
    en: 'If the door does not close well, the compressor works harder. Check the seals and keep a 10 cm gap from the wall for ventilation.',
  },
  'rec.led.title': {
    es: 'Aprovechá la luz natural y LED',
    en: 'Take advantage of natural light and LED',
  },
  'rec.led.desc': {
    es: 'Reemplazá lámparas incandescentes por LED de bajo consumo. Una lámpara LED de 9W consume 85% menos que una de 60W con la misma luminosidad.',
    en: 'Replace incandescent bulbs with low-consumption LEDs. A 9W LED bulb consumes 85% less than a 60W one with the same brightness.',
  },
  'rec.standby.title': {
    es: 'Desconectá los consumos en stand-by',
    en: 'Unplug stand-by consumption',
  },
  'rec.standby.desc': {
    es: 'Televisores, decodificadores y cargadores siguen consumiendo en stand-by. Usá zapatillas con interruptor y desconectalos de noche.',
    en: 'TVs, set-top boxes and chargers keep consuming in stand-by. Use power strips with a switch and unplug them at night.',
  },
  // Chat local
  'chat.hello': {
    es: '¡Hola {name}! 👋 Soy tu asistente energético. Podés preguntarme sobre tu consumo, cómo ahorrar energía, tus facturas o el pronóstico del mes que viene.',
    en: 'Hi {name}! 👋 I am your energy assistant. You can ask me about your consumption, how to save energy, your bills or next month\'s forecast.',
  },
  'chat.bill_forecast': {
    es: 'Según mi análisis, tu boleta estimada para **{month}** sería de aproximadamente **${cost}** por **{kwh} kWh** consumidos (confianza del {confidence}%).\n\nDetalle en la sección **Predicciones**.',
    en: 'According to my analysis, your estimated bill for **{month}** would be around **${cost}** for **{kwh} kWh** consumed ({confidence}% confidence).\n\nSee details in the **Predictions** section.',
  },
  'chat.bill_no_data': {
    es: 'Todavía no tengo datos suficientes para estimar tu boleta. Cargá tu provincia y algunos consumos en la app y volvé a preguntarme. 📊',
    en: 'I still don\'t have enough data to estimate your bill. Set up your province and add some readings in the app and ask me again. 📊',
  },
  'chat.consumption': {
    es: 'En lo que va del mes registrás **{kwh} kWh**. Podés ver el detalle diario y por dispositivo en la sección **Consumo**.\n\nTip: identificá el dispositivo que más consume y tratá de reducir sus horas de uso.',
    en: 'So far this month you have recorded **{kwh} kWh**. You can see the daily and per-device breakdown in the **Consumption** section.\n\nTip: find the device that consumes the most and try to reduce its usage hours.',
  },
  'chat.tips_header': {
    es: 'Algunos consejos para ahorrar energía en Argentina:\n\n',
    en: 'Some tips to save energy in Argentina:\n\n',
  },
  'chat.tip_ac': {
    es: '1. **Aire acondicionado a 24°C** en verano, con el modo eco activado.\n',
    en: '1. **Air conditioning at 24°C** in summer, with eco mode enabled.\n',
  },
  'chat.tip_standby': {
    es: '2. **Desconectá los stand-by** de TV y decodificadores por la noche.\n',
    en: '2. **Unplug stand-by** devices like TVs and set-top boxes at night.\n',
  },
  'chat.tip_laundry': {
    es: '3. **Lavarropas con agua fría** y carga completa.\n',
    en: '3. **Washing machine with cold water** and full loads.\n',
  },
  'chat.tip_top': {
    es: '4. **{name}** es el que más consume en tu hogar ({kwh} kWh este mes) — priorizá reducir su uso.\n',
    en: '4. **{name}** is the biggest consumer in your home ({kwh} kWh this month) — prioritize reducing its usage.\n',
  },
  'chat.tips_footer': {
    es: '\nTambién podés ver recomendaciones personalizadas en la sección **Recomendaciones**.',
    en: '\nYou can also see personalized recommendations in the **Recommendations** section.',
  },
  'chat.devices_none': {
    es: 'Todavía no tenés dispositivos registrados. Andá a **Mis Dispositivos** y agregalos para empezar a monitorear tu consumo.',
    en: 'You don\'t have any registered devices yet. Go to **My Devices** and add them to start monitoring your consumption.',
  },
  'chat.devices_list': {
    es: 'Tus dispositivos registrados:\n\n',
    en: 'Your registered devices:\n\n',
  },
  'chat.invoices_none': {
    es: 'Todavía no registraste facturas. Cargalas en la sección **Facturas** para analizar tu historial.',
    en: 'You haven\'t registered any bills yet. Add them in the **Invoices** section to analyze your history.',
  },
  'chat.last_invoice': {
    es: 'Tu última factura fue **{period}**: {kwh} kWh por **${amount}**.\n\nPodés comparar mes a mes en la sección **Facturas**.',
    en: 'Your last bill was **{period}**: {kwh} kWh for **${amount}**.\n\nYou can compare month by month in the **Invoices** section.',
  },
  'chat.alerts_none': {
    es: 'No tenés alertas sin leer. Todo tranquilo por acá ✅',
    en: 'You have no unread alerts. All quiet here ✅',
  },
  'chat.alerts_list': {
    es: 'Tenés {count} alerta(s) sin leer:\n\n',
    en: 'You have {count} unread alert(s):\n\n',
  },
  'chat.help_intro': {
    es: 'Puedo ayudarte con:\n\n- **Tu consumo**: resúmenes y análisis.\n- **Tu boleta**: estimación del próximo mes.\n- **Ahorro**: consejos y recomendaciones.\n- **Dispositivos**: cuál consume más.\n- **Facturas y alertas**: historial y estado.\n\n¿Sobre qué querés hablar?',
    en: 'I can help you with:\n\n- **Your consumption**: summaries and analysis.\n- **Your bill**: next month estimation.\n- **Savings**: tips and recommendations.\n- **Devices**: which one consumes the most.\n- **Bills and alerts**: history and status.\n\nWhat would you like to talk about?',
  },
  'chat.default': {
    es: 'Interesante pregunta 🤔. Mi conocimiento se enfoca en tu consumo energético, ahorro de energía, tarifas argentinas y el monitoreo de tus dispositivos. ¿Querés que te cuente sobre tu consumo o cómo ahorrar energía?',
    en: 'Interesting question 🤔. My knowledge focuses on your energy consumption, energy savings, Argentine tariffs and monitoring your devices. Would you like me to tell you about your consumption or how to save energy?',
  },
  // Insights locals
  'insight.local': {
    es: 'Consumís {kwh} kWh este mes con {count} dispositivos.{top}{forecast}',
    en: 'You are consuming {kwh} kWh this month with {count} devices.{top}{forecast}',
  },
  'insight.top': {
    es: ' Tu mayor consumo viene de **{name}** ({kwh} kWh).',
    en: ' Your biggest consumption comes from **{name}** ({kwh} kWh).',
  },
  'insight.forecast': {
    es: ' Para el mes que viene se estima una boleta de **${cost}** con una confianza del {confidence}%.',
    en: ' For next month, an estimated bill of **${cost}** is expected with {confidence}% confidence.',
  },
  'anomaly.consumption.title': {
    es: 'Anomalía de consumo detectada',
    en: 'Consumption Anomaly Detected',
  },
  'anomaly.consumption.desc': {
    es: 'El consumo de hoy ({value} kWh) se desvía significativamente del promedio de 30 días ({avg} kWh).',
    en: 'Today\'s consumption ({value} kWh) deviates significantly from the 30-day average ({avg} kWh).',
  },
  'anomaly.above_avg': {
    es: 'El consumo está {dev} desviaciones estándar por encima del promedio',
    en: 'Consumption is {dev} standard deviations above average',
  },
  'anomaly.in_range': {
    es: 'Consumo dentro del rango normal',
    en: 'Consumption within normal range',
  },
  'anomaly.insufficient': {
    es: 'Datos históricos insuficientes para detectar anomalías',
    en: 'Insufficient historical data for anomaly detection',
  },
  'anomaly.no_today': {
    es: 'Todavía no hay lecturas de hoy',
    en: 'No readings for today yet',
  },
  // Alertas (usadas por el chat local y para localizar títulos de BD)
  'alert.threshold_exceeded.title': {
    es: 'Umbral mensual superado',
    en: 'Monthly Threshold Exceeded',
  },
  'alert.threshold_exceeded.message': {
    es: 'Tu consumo mensual ({kwh} kWh) superó tu umbral de {threshold} kWh.',
    en: 'Your monthly consumption ({kwh} kWh) exceeds your threshold of {threshold} kWh.',
  },
  'alert.peak_consumption.title': {
    es: 'Pico de consumo detectado',
    en: 'Peak Consumption Detected',
  },
  'alert.peak_consumption.message': {
    es: 'Se detectó un pico de {kwh} kWh en la última hora, superando 2x el promedio diario ({avg} kWh).',
    en: 'A consumption peak of {kwh} kWh was detected in the last hour, exceeding 2x the daily average ({avg} kWh).',
  },
  'alert.anomaly.title': {
    es: 'Anomalía detectada',
    en: 'Detected anomaly',
  },
  'alert.anomaly.message': {
    es: 'Consumo anómalo de {avg} W ({dev}% por encima del promedio de {normal} W). Se recomienda revisar el dispositivo.',
    en: 'Anomalous consumption of {avg} W ({dev}% above the {normal} W average). You should check the device.',
  },
};

// Localiza una alerta de la BD por su alert_type + metadata (mirror del alertText del frontend).
const localizeAlert = (alert, lang) => {
  if (!alert) return alert;
  const type = alert.alert_type || alert.type;
  const m = alert.metadata || {};
  switch (type) {
    case 'threshold_exceeded':
      return {
        ...alert,
        title: t(lang, 'alert.threshold_exceeded.title'),
        message: t(lang, 'alert.threshold_exceeded.message', {
          kwh: (m.current_kwh ?? m.actual_kwh ?? alert.current_kwh ?? alert.actual_kwh ?? 0).toFixed(2),
          threshold: (m.threshold_kwh ?? alert.threshold_kwh ?? 0).toFixed(2),
        }),
      };
    case 'peak_consumption':
      return {
        ...alert,
        title: t(lang, 'alert.peak_consumption.title'),
        message: t(lang, 'alert.peak_consumption.message', {
          kwh: (m.recent_kwh ?? m.peak_watts ?? alert.recent_kwh ?? alert.peak_watts ?? 0).toFixed(2),
          avg: (m.avg_daily_kwh ?? m.expected_watts ?? alert.avg_daily_kwh ?? alert.expected_watts ?? 0).toFixed(2),
        }),
      };
    case 'anomaly':
      return {
        ...alert,
        title: t(lang, 'alert.anomaly.title'),
        message: t(lang, 'alert.anomaly.message', {
          avg: (m.avg_watts ?? alert.avg_watts ?? 0).toFixed(2),
          normal: (m.normal_avg ?? alert.normal_avg ?? 0).toFixed(2),
          dev: Math.round(Number(m.deviation_percent ?? 0)),
        }),
      };
    default:
      return alert;
  }
};

const t = (lang, key, params) => {
  const entry = DICT[key];
  if (!entry) return key;
  return fmt(entry[lang] || entry.es, params);
};

// Recomendaciones ya guardadas en la BD (source: 'local'): si fueron generadas en
// español y el usuario está en inglés, las retraduce sobre la marcha.
const localizeRecommendation = (rec, lang) => {
  if (lang !== 'en' || !rec || !rec.title) return rec;
  const en = (key, params) => fmt(DICT[key] ? DICT[key].en : key, params);
  const title = String(rec.title);

  if (/ es tu mayor consumidor$/.test(title) || /is your biggest consumer$/.test(title)) {
    const name = title.replace(/ es tu mayor consumidor$/, '').replace(/ is your biggest consumer$/, '').trim();
    const m = rec.description.match(/Con ([\d.]+) W y ([\d.]+) hs de uso diario/);
    return {
      ...rec,
      title: en('rec.top_consumer.title', { name }),
      description: en('rec.top_consumer.desc', {
        watts: m ? m[1] : '',
        hours: m ? m[2] : '',
      }),
    };
  }

  // Coincidencia por palabras clave (robusta a variantes del texto guardado).
  const groups = [
    { test: /aire acondicionado|climatizaci[óo]n/i, key: 'rec.ac' },
    { test: /heladera|refrigerador|gomas|burletes|nevera/i, key: 'rec.fridge' },
    { test: /stand-?by|stand by/i, key: 'rec.standby' },
    { test: /luz natural|lamparas|l[áa]mparas|led/i, key: 'rec.led' },
    { test: /dispositivo/i, key: 'rec.add_devices' },
  ];
  for (const { test, key } of groups) {
    if (test.test(title)) {
      const enTitle = DICT[`${key}.title`] ? DICT[`${key}.title`].en : '';
      if (enTitle && title.toLowerCase() === enTitle.toLowerCase()) continue; // ya está en inglés
      return {
        ...rec,
        title: en(`${key}.title`),
        description: en(`${key}.desc`),
      };
    }
  }
  return rec;
};

module.exports = { getLang, t, MONTHS, localizeRecommendation, localizeAlert };