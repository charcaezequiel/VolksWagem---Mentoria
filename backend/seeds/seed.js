require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const {
  sequelize,
  User,
  Province,
  DeviceCategory,
  Device,
  ConsumptionReading,
  Invoice,
  Alert,
  Tariff,
} = require('../src/models');

async function seed() {
  try {
    console.log('Syncing database...');
    await sequelize.sync({ force: true });
    console.log('Database synced.');

    const provinces = await Province.bulkCreate([
      { name: 'Buenos Aires', distributor_name: 'EDENOR / EDERSA', regulator_name: 'OCEBA', is_active: true },
      { name: 'San Juan', distributor_name: 'Empresa Provincial de Energía de San Juan', regulator_name: 'EPRE', is_active: true },
      { name: 'Córdoba', distributor_name: 'Empresa Provincial de Energía de Córdoba', regulator_name: 'ENRE', is_active: true },
      { name: 'Mendoza', distributor_name: 'Empresa Provincial de Energía de Mendoza', regulator_name: 'ENRE', is_active: true },
      { name: 'Santa Fe', distributor_name: 'Empresa Distribuidora de Energía de Santa Fe', regulator_name: 'ENRE', is_active: true },
      { name: 'Entre Ríos', distributor_name: 'Empresa Distribuidora de Energía de Entre Ríos', regulator_name: 'ENRE', is_active: true },
    ]);
    console.log(`${provinces.length} provinces created.`);

    const categories = await DeviceCategory.bulkCreate([
      { name: 'Refrigeración', icon: 'snowflake', description: 'Heladeras, freezers yequipamiento de refrigeración' },
      { name: 'Climatización', icon: 'thermometer', description: 'Aires acondicionados, calefactores y ventilación' },
      { name: 'Iluminación', icon: 'lightbulb', description: 'Luminarias y sistemas de iluminación' },
      { name: 'Entretenimiento', icon: 'tv', description: 'Televisores, consolas yequipamiento audiovisual' },
      { name: 'Cocina', icon: 'cooking-pot', description: 'Electrodomésticos de cocina' },
      { name: 'Lavado', icon: 'washing-machine', description: 'Lavarropas y secarropas' },
      { name: 'Otros', icon: 'plug', description: 'Otros dispositivos yequipamiento variado' },
    ]);
    console.log(`${categories.length} device categories created.`);

    const tariffsBuenosAires = await Tariff.bulkCreate([
      { province_id: 1, tariff_name: 'Residencial - Rango 1', tier_from: 0, tier_to: 300, price_per_kwh: 85.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
      { province_id: 1, tariff_name: 'Residencial - Rango 2', tier_from: 301, tier_to: 700, price_per_kwh: 100.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
      { province_id: 1, tariff_name: 'Residencial - Rango 3', tier_from: 701, tier_to: 1400, price_per_kwh: 120.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
      { province_id: 1, tariff_name: 'Residencial - Rango 4', tier_from: 1400, tier_to: null, price_per_kwh: 150.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
    ]);
    console.log(`${tariffsBuenosAires.length} tariffs for Buenos Aires (OCEBA) created.`);

    const tariffsSanJuan = await Tariff.bulkCreate([
      { province_id: 2, tariff_name: 'Residencial - Rango 1', tier_from: 0, tier_to: 300, price_per_kwh: 75.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
      { province_id: 2, tariff_name: 'Residencial - Rango 2', tier_from: 301, tier_to: 700, price_per_kwh: 90.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
      { province_id: 2, tariff_name: 'Residencial - Rango 3', tier_from: 701, tier_to: 1400, price_per_kwh: 110.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
      { province_id: 2, tariff_name: 'Residencial - Rango 4', tier_from: 1400, tier_to: null, price_per_kwh: 140.00, effective_from: '2025-01-01', effective_to: null, is_current: true },
    ]);
    console.log(`${tariffsSanJuan.length} tariffs for San Juan (EPRE) created.`);

    const demoUser = await User.create({
      name: 'Usuario Demo',
      email: 'demo@controlar.com',
      password_hash: '123456',
      province_id: 1,
      user_type: 'residencial',
      alert_threshold_kwh: 15.0,
      is_active: true,
    });
    console.log(`Demo user created: ${demoUser.email}`);

    const devices = await Device.bulkCreate([
      {
        user_id: demoUser.id,
        category_id: categories[0].id,
        name: 'Heladera No Frost',
        nominal_watts: 200,
        min_watts: 150,
        max_watts: 250,
        hours_daily_usage: 24,
        is_custom: false,
        is_active: true,
      },
      {
        user_id: demoUser.id,
        category_id: categories[3].id,
        name: 'TV LED 40"',
        nominal_watts: 100,
        min_watts: 80,
        max_watts: 120,
        hours_daily_usage: 6,
        is_custom: false,
        is_active: true,
      },
      {
        user_id: demoUser.id,
        category_id: categories[1].id,
        name: 'Aire Acondicionado',
        nominal_watts: 1100,
        min_watts: 900,
        max_watts: 1200,
        hours_daily_usage: 8,
        is_custom: false,
        is_active: true,
      },
      {
        user_id: demoUser.id,
        category_id: categories[5].id,
        name: 'Lavarropas',
        nominal_watts: 500,
        min_watts: 450,
        max_watts: 550,
        hours_daily_usage: 1,
        is_custom: false,
        is_active: true,
      },
      {
        user_id: demoUser.id,
        category_id: categories[0].id,
        name: 'Heladera Freezer',
        nominal_watts: 180,
        min_watts: 140,
        max_watts: 220,
        hours_daily_usage: 24,
        is_custom: false,
        is_active: true,
      },
      {
        user_id: demoUser.id,
        category_id: categories[6].id,
        name: 'Computadora de Escritorio',
        nominal_watts: 300,
        min_watts: 200,
        max_watts: 350,
        hours_daily_usage: 8,
        is_custom: false,
        is_active: true,
      },
    ]);
    console.log(`${devices.length} devices created for demo user.`);

    console.log('Generating consumption readings for the last 30 days...');
    const readings = [];
    const now = new Date();

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const month = date.getMonth();
      const dayOfWeek = date.getDay();

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSummer = month >= 10 || month <= 2;

      const temperatureFactor = isSummer ? 1.3 : 0.8;
      const weekendFactor = isWeekend ? 1.15 : 1.0;

      for (const device of devices) {
        const numReadingsPerDay = device.name === 'Heladera No Frost' || device.name === 'Heladera Freezer'
          ? 4
          : Math.min(Math.ceil(device.hours_daily_usage), 8);

        const hoursBetween = Math.floor(24 / numReadingsPerDay);

        for (let r = 0; r < numReadingsPerDay; r++) {
          const hour = r * hoursBetween;
          const readingDate = new Date(date);
          readingDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

          let wattMultiplier = 1.0;
          if (device.name === 'Aire Acondicionado') {
            if (hour >= 12 && hour <= 20) {
              wattMultiplier = temperatureFactor * 1.2;
            } else if (hour >= 21 || hour <= 6) {
              wattMultiplier = temperatureFactor * 0.6;
            } else {
              wattMultiplier = temperatureFactor;
            }
          } else if (device.name === 'TV LED 40"') {
            if (hour >= 19 && hour <= 23) {
              wattMultiplier = 1.2;
            } else if (hour >= 8 && hour <= 12) {
              wattMultiplier = 0.6;
            } else {
              wattMultiplier = 0.3;
            }
          } else if (device.name === 'Computadora de Escritorio') {
            if (hour >= 9 && hour <= 18) {
              wattMultiplier = isWeekend ? 0.5 : 1.1;
            } else {
              wattMultiplier = isWeekend ? 0.8 : 0.3;
            }
          } else if (device.name === 'Lavarropas') {
            if (hour >= 8 && hour <= 14 && !isWeekend) {
              wattMultiplier = 1.0;
            } else {
              wattMultiplier = 0.0;
            }
          }

          wattMultiplier *= weekendFactor;

          const range = device.max_watts - device.min_watts;
          const baseWatts = device.min_watts + range * wattMultiplier;
          const noise = (Math.random() - 0.5) * range * 0.15;
          const instantWatts = Math.round(Math.max(device.min_watts, Math.min(device.max_watts, baseWatts + noise)));

          const hoursUsed = device.hours_daily_usage > 0 ? device.hours_daily_usage / numReadingsPerDay : 0;
          const kwhReading = parseFloat(((instantWatts * hoursUsed * temperatureFactor) / 1000).toFixed(4));

          readings.push({
            user_id: demoUser.id,
            device_id: device.id,
            instant_watts: instantWatts,
            accumulated_kwh_day: kwhReading,
            reading_timestamp: readingDate.toISOString(),
            source: 'sensor',
          });
        }
      }
    }

    await ConsumptionReading.bulkCreate(readings);
    console.log(`${readings.length} consumption readings created.`);

    const monthlyKwhMay = parseFloat((readings
      .filter(r => {
        const d = new Date(r.reading_timestamp);
        return d.getMonth() === 5 && d.getFullYear() === 2026;
      })
      .reduce((sum, r) => sum + (r.accumulated_kwh_day || 0), 0)).toFixed(2));

    const monthlyKwhJune = parseFloat((readings
      .filter(r => {
        const d = new Date(r.reading_timestamp);
        return d.getMonth() === 4 && d.getFullYear() === 2026;
      })
      .reduce((sum, r) => sum + (r.accumulated_kwh_day || 0), 0)).toFixed(2));

    function calculateInvoiceAmount(kwh) {
      let amount = 0;
      if (kwh <= 300) {
        amount = kwh * 85;
      } else if (kwh <= 700) {
        amount = 300 * 85 + (kwh - 300) * 100;
      } else if (kwh <= 1400) {
        amount = 300 * 85 + 400 * 100 + (kwh - 700) * 120;
      } else {
        amount = 300 * 85 + 400 * 100 + 700 * 120 + (kwh - 1400) * 150;
      }
      return parseFloat(amount.toFixed(2));
    }

    const invoices = await Invoice.bulkCreate([
      {
        user_id: demoUser.id,
        period_month: 5,
        period_year: 2026,
        kwh_consumed: monthlyKwhMay || 420.5,
        amount_paid: calculateInvoiceAmount(monthlyKwhMay || 420.5),
        tariff_applied: 85.00,
      },
      {
        user_id: demoUser.id,
        period_month: 6,
        period_year: 2026,
        kwh_consumed: monthlyKwhJune || 385.2,
        amount_paid: calculateInvoiceAmount(monthlyKwhJune || 385.2),
        tariff_applied: 85.00,
      },
    ]);
    console.log(`${invoices.length} invoices created.`);

    const alerts = await Alert.bulkCreate([
      {
        user_id: demoUser.id,
        device_id: devices[2].id,
        alert_type: 'peak_consumption',
        title: 'Pico de consumo detectado',
        message: 'El aire acondicionado registra un consumo superior al esperado durante las horas pico de la tarde.',
        severity: 'warning',
        is_read: false,
        metadata: { peak_watts: 1250, expected_watts: 1100, hour: 15 },
      },
      {
        user_id: demoUser.id,
        device_id: devices[0].id,
        alert_type: 'anomaly',
        title: 'Anomalía en heladera No Frost',
        message: 'Se detectó un incremento inusual en el patrón de consumo de la heladera No Frost. Posible falla en el compresor.',
        severity: 'critical',
        is_read: false,
        metadata: { avg_watts: 280, normal_avg: 200, deviation_percent: 40 },
      },
      {
        user_id: demoUser.id,
        device_id: null,
        alert_type: 'threshold_exceeded',
        title: 'Umbral de consumo mensual superado',
        message: 'El consumo acumulado del mes supera el umbral configurado de 15.0 kWh diarios promedio.',
        severity: 'info',
        is_read: true,
        metadata: { threshold_kwh: 15.0, actual_kwh: 18.3, period: 'Junio 2026' },
      },
    ]);
    console.log(`${alerts.length} alerts created.`);

    console.log('\n--- Seed completed successfully ---');
    console.log('Provinces:', provinces.length);
    console.log('Categories:', categories.length);
    console.log('Tariffs (OCEBA):', tariffsBuenosAires.length);
    console.log('Tariffs (EPRE):', tariffsSanJuan.length);
    console.log('User: demo@controlar.com / 123456');
    console.log('Devices:', devices.length);
    console.log('Consumption readings:', readings.length);
    console.log('Invoices:', invoices.length);
    console.log('Alerts:', alerts.length);

    await sequelize.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Seed failed:', error);
    await sequelize.close();
    process.exit(1);
  }
}

seed();
