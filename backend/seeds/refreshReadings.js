/**
 * Refresca SOLO las lecturas de consumo de los ultimos 30 dias.
 *
 * Por que existe esto y no "correr el seed otra vez": el seed arranca con un
 * sync({ force: true }) que borra la base entera. Para renovar el historico de
 * consumo no se puede correr.
 *
 * El problema que resuelve: el seed genera las lecturas contando desde HOY, en
 * un bucle de 30 dias hacia atras. Si se corrio hace dos semanas, la ventana
 * que mira el dashboard ("ultimos 7 dias") queda casi vacia y los graficos se
 * ven en blanco aunque todo lo demas funcione. Se reemplazan unicamente las
 * lecturas generadas, no las que el usuario cargo a mano.
 *
 * Idempotente: se puede correr las veces que haga falta.
 *
 *   node seeds/refreshReadings.js
 */

require('dotenv').config();
const { sequelize, ConsumptionReading, Device, User } = require('../src/models');

/**
 * Cuantos dias hacia atras se generan.
 *
 * No son 30. El dashboard compara el mes actual contra el anterior
 * ("vs mes anterior") y grafica 12 meses: con 30 dias de datos, el mes
 * anterior queda-represented por UN dia y la comparacion sale en null o en
 * cero, que es peor que no mostrarla. Con 62 dias siempre entra el mes
 * anterior completo, porque 31 (mes previo) + 31 (del mes en curso) = 62 es
 * el peor caso.
 */
const DIAS = 62;

/** Genera las lecturas de un dispositivo para un dia dado. */
function lecturasDelDia(device, date, ahora) {
  const out = [];
  const month = date.getMonth();
  const dayOfWeek = date.getDay();

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isSummer = month >= 10 || month <= 2;

  const temperatureFactor = isSummer ? 1.3 : 0.8;
  const weekendFactor = isWeekend ? 1.15 : 1.0;

  // Las heladeras se leen 4 veces por dia; el resto, segun sus horas de uso.
  const numReadingsPerDay = device.name === 'Heladera No Frost' || device.name === 'Heladera Freezer'
    ? 4
    : Math.min(Math.ceil(device.hours_daily_usage), 8);

  const hoursBetween = Math.floor(24 / numReadingsPerDay);

  for (let r = 0; r < numReadingsPerDay; r++) {
    const hour = r * hoursBetween;
    const readingDate = new Date(date);
    readingDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    // El seed original no corta el dia de hoy y guarda lecturas con hora
    // futura (si son las 16:00, mete una de las 18:00). Esas lecturas ensucian
    // los graficos y cualquier "consumo futuro". Se descartan.
    if (readingDate > ahora) continue;

    let wattMultiplier = 1.0;
    if (device.name === 'Aire Acondicionado') {
      if (hour >= 12 && hour <= 20) wattMultiplier = temperatureFactor * 1.2;
      else if (hour >= 21 || hour <= 6) wattMultiplier = temperatureFactor * 0.6;
      else wattMultiplier = temperatureFactor;
    } else if (device.name === 'TV LED 40"') {
      if (hour >= 19 && hour <= 23) wattMultiplier = 1.2;
      else if (hour >= 8 && hour <= 12) wattMultiplier = 0.6;
      else wattMultiplier = 0.3;
    } else if (device.name === 'Computadora de Escritorio') {
      if (hour >= 9 && hour <= 18) wattMultiplier = isWeekend ? 0.5 : 1.1;
      else wattMultiplier = isWeekend ? 0.8 : 0.3;
    } else if (device.name === 'Lavarropas') {
      wattMultiplier = (hour >= 8 && hour <= 14 && !isWeekend) ? 1.0 : 0.0;
    }

    wattMultiplier *= weekendFactor;

    const range = device.max_watts - device.min_watts;
    const baseWatts = device.min_watts + range * wattMultiplier;
    const noise = (Math.random() - 0.5) * range * 0.15;
    const instantWatts = Math.round(
      Math.max(device.min_watts, Math.min(device.max_watts, baseWatts + noise)),
    );

    const hoursUsed = device.hours_daily_usage > 0
      ? device.hours_daily_usage / numReadingsPerDay
      : 0;
    const accumulated = (instantWatts * hoursUsed * temperatureFactor) / 1000;

    out.push({
      // user_id NO es una FK derivada del device: la columna es NOT NULL y el
      // seed original la pasaba explicita en cada fila.
      user_id: device.user_id,
      device_id: device.id,
      instant_watts: instantWatts,
      accumulated_kwh_day: parseFloat(accumulated.toFixed(4)),
      reading_timestamp: readingDate,
      source: 'sensor',
    });
  }
  return out;
}

(async () => {
  try {
    const ahora = new Date();

    const dispositivos = await Device.findAll({ order: [['name', 'ASC']] });
    if (!dispositivos.length) {
      console.error('  No hay dispositivos. Correr el seed primero.');
      process.exit(1);
    }

    // Solo se borran las lecturas GENERADAS (source 'sensor'). Las que alguien
    // cargo con "Agregar Lectura" (source 'manual') son datos del usuario y se
    // respetan: no es este script el que debe decidir borrarlas.
    const { Op } = require('sequelize');
    const conDispositivos = [...new Set(dispositivos.map((d) => d.user_id))];
    const borradas = await ConsumptionReading.destroy({
      where: { user_id: { [Op.in]: conDispositivos }, source: 'sensor' },
    });
    const manuales = await ConsumptionReading.count({ where: { source: 'manual' } });
    console.log(`  Borradas ${borradas} lectura(s) generada(s). Se conservan ${manuales} manual(es).`);

    const lecturas = [];
    for (let offset = DIAS - 1; offset >= 0; offset -= 1) {
      const date = new Date(ahora);
      date.setDate(date.getDate() - offset);
      for (const device of dispositivos) {
        lecturas.push(...lecturasDelDia(device, date, ahora));
      }
    }

    await ConsumptionReading.bulkCreate(lecturas, { chunkSize: 500 });
    console.log(`  Creadas ${lecturas.length} lecturas para ${DIAS} dias.`);

    // Verificacion: si la ventana de 7 dias quedo con pocos dias, el problema
    // sigue y conviene avisarlo en vez de fingir que se resolvio.
    const dias = await ConsumptionReading.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('reading_timestamp')), 'dia'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'n'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('reading_timestamp'))],
      order: [[sequelize.literal('dia'), 'DESC']],
      raw: true,
    });
    const ultimos7 = dias.filter((d) => new Date(d.dia) >= new Date(ahora.getTime() - 7 * 864e5));

    console.log(`\n  Dias con datos: ${dias.length} | dias en la ventana de 7: ${ultimos7.length}`);
    dias.slice(0, 8).forEach((d) => console.log(`    ${d.dia}   ${d.n} lecturas`));

    if (ultimos7.length < 5) {
      console.warn('\n  AVISO: la ventana de 7 dias quedo con pocos dias. El grafico va a seguir viéndose sparse.');
    } else {
      console.log('\n  La ventana de 7 dias quedo poblada.');
    }

    await sequelize.close();
  } catch (e) {
    console.error('  ERROR: ' + e.message);
    await sequelize.close();
    process.exit(1);
  }
})();
