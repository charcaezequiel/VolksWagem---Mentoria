require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const crypto = require('crypto');
const {
  sequelize,
  User,
  Province,
  DeviceCategory,
  Appliance,
  Device,
  ConsumptionReading,
  Invoice,
  Alert,
  Tariff,
  Prediction,
  Recommendation,
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

    const appliancesCatalog = [
      // Refrigeración
      { name: 'Heladera No Frost 250L', watts: 180, min: 150, max: 220, hours: 24 },
      { name: 'Heladera No Frost 350L', watts: 200, min: 160, max: 250, hours: 24 },
      { name: 'Heladera con freezer 200L', watts: 150, min: 120, max: 190, hours: 24 },
      { name: 'Heladera con freezer 300L', watts: 220, min: 170, max: 280, hours: 24 },
      { name: 'Heladera con dispenser de agua', watts: 280, min: 220, max: 330, hours: 24 },
      { name: 'Heladera minibar', watts: 80, min: 60, max: 100, hours: 24 },
      { name: 'Freezer horizontal', watts: 250, min: 200, max: 300, hours: 24 },
      { name: 'Freezer vertical', watts: 300, min: 240, max: 360, hours: 24 },
      // Climatización
      { name: 'Aire acondicionado Split 2200 frig', watts: 1100, min: 900, max: 1300, hours: 8 },
      { name: 'Aire acondicionado Split 3000 frig', watts: 1300, min: 1050, max: 1550, hours: 8 },
      { name: 'Aire acondicionado Split 3500 frig', watts: 1500, min: 1200, max: 1800, hours: 8 },
      { name: 'Aire acondicionado Split 4500 frig', watts: 1900, min: 1500, max: 2300, hours: 8 },
      { name: 'Aire acondicionado Inverter 2500 frig', watts: 900, min: 600, max: 1100, hours: 8 },
      { name: 'Calefactor eléctrico', watts: 2000, min: 1500, max: 2500, hours: 4 },
      { name: 'Panel calefactor', watts: 1500, min: 1200, max: 1800, hours: 4 },
      { name: 'Caloventor', watts: 2000, min: 1600, max: 2400, hours: 3 },
      { name: 'Radiador eléctrico', watts: 1500, min: 1000, max: 2000, hours: 4 },
      { name: 'Estufa halógena', watts: 800, min: 400, max: 1200, hours: 3 },
      { name: 'Termofan eléctrico', watts: 1200, min: 800, max: 1600, hours: 3 },
      { name: 'Ventilador de pie', watts: 60, min: 40, max: 80, hours: 6 },
      { name: 'Ventilador de techo', watts: 75, min: 50, max: 100, hours: 6 },
      { name: 'Ventilador de pared', watts: 50, min: 35, max: 70, hours: 6 },
      { name: 'Purificador de aire', watts: 60, min: 40, max: 80, hours: 8 },
      { name: 'Deshumidificador', watts: 250, min: 200, max: 300, hours: 6 },
      { name: 'Humidificador', watts: 40, min: 25, max: 60, hours: 6 },
      // Iluminación
      { name: 'Lámpara LED 9W', watts: 9, min: 8, max: 10, hours: 4 },
      { name: 'Lámpara LED 12W', watts: 12, min: 10, max: 14, hours: 4 },
      { name: 'Lámpara LED 15W', watts: 15, min: 13, max: 17, hours: 4 },
      { name: 'Lámpara LED 18W', watts: 18, min: 15, max: 21, hours: 4 },
      { name: 'Lámpara de bajo consumo 20W', watts: 20, min: 18, max: 22, hours: 4 },
      { name: 'Lámpara incandescente 60W', watts: 60, min: 55, max: 65, hours: 3 },
      { name: 'Foco reflector LED 30W', watts: 30, min: 25, max: 35, hours: 3 },
      { name: 'Tira LED', watts: 24, min: 18, max: 30, hours: 4 },
      { name: 'Lámpara de mesa', watts: 20, min: 15, max: 25, hours: 2 },
      { name: 'Lámpara de pie', watts: 25, min: 20, max: 30, hours: 3 },
      { name: 'Velador', watts: 15, min: 10, max: 20, hours: 3 },
      { name: 'Luz de jardín exterior', watts: 10, min: 7, max: 13, hours: 8 },
      // Entretenimiento
      { name: 'TV LED 32"', watts: 60, min: 45, max: 80, hours: 5 },
      { name: 'TV LED 40"', watts: 100, min: 80, max: 120, hours: 6 },
      { name: 'TV Smart 43"', watts: 120, min: 95, max: 150, hours: 6 },
      { name: 'TV LED 50"', watts: 150, min: 120, max: 190, hours: 6 },
      { name: 'TV LED 55"', watts: 180, min: 140, max: 220, hours: 6 },
      { name: 'TV OLED 55"', watts: 200, min: 160, max: 250, hours: 6 },
      { name: 'Consola de videojuegos', watts: 200, min: 150, max: 250, hours: 3 },
      { name: 'Consola retro', watts: 40, min: 30, max: 50, hours: 2 },
      { name: 'Home theater / Soundbar', watts: 100, min: 80, max: 150, hours: 3 },
      { name: 'Parlante Bluetooth', watts: 20, min: 10, max: 30, hours: 3 },
      { name: 'Computadora de escritorio', watts: 300, min: 200, max: 400, hours: 8 },
      { name: 'Notebook', watts: 60, min: 40, max: 90, hours: 6 },
      { name: 'Tablet', watts: 10, min: 5, max: 15, hours: 3 },
      { name: 'Monitor LCD 24"', watts: 25, min: 18, max: 35, hours: 8 },
      { name: 'Impresora', watts: 60, min: 30, max: 100, hours: 1 },
      { name: 'Router / Modem', watts: 15, min: 10, max: 20, hours: 24 },
      { name: 'Decodificador de TV', watts: 25, min: 20, max: 30, hours: 24 },
      { name: 'Proyector', watts: 300, min: 250, max: 350, hours: 3 },
      { name: 'Consola de streaming', watts: 10, min: 5, max: 15, hours: 4 },
      { name: 'Teléfono inalámbrico', watts: 3, min: 2, max: 5, hours: 24 },
      { name: 'Cargador de celular', watts: 5, min: 3, max: 10, hours: 4 },
      // Cocina
      { name: 'Microondas 20L', watts: 1200, min: 1000, max: 1400, hours: 0.5 },
      { name: 'Microondas 30L', watts: 1500, min: 1300, max: 1700, hours: 0.5 },
      { name: 'Horno eléctrico', watts: 2500, min: 2000, max: 3000, hours: 1.5 },
      { name: 'Horno combinado microondas', watts: 2000, min: 1600, max: 2400, hours: 1.5 },
      { name: 'Anafe eléctrico 2 hornallas', watts: 2000, min: 1800, max: 2200, hours: 2 },
      { name: 'Anafe eléctrico 4 hornallas', watts: 4000, min: 3500, max: 4500, hours: 2 },
      { name: 'Anafe a inducción', watts: 2000, min: 1500, max: 2500, hours: 2 },
      { name: 'Cocina eléctrica', watts: 3000, min: 2500, max: 3500, hours: 2 },
      { name: 'Freidora de aire (Air Fryer)', watts: 1500, min: 1200, max: 1800, hours: 0.7 },
      { name: 'Pava eléctrica', watts: 1500, min: 1200, max: 1800, hours: 0.3 },
      { name: 'Cafetera eléctrica', watts: 800, min: 700, max: 900, hours: 0.5 },
      { name: 'Cafetera espresso', watts: 1200, min: 1000, max: 1400, hours: 0.3 },
      { name: 'Tostadora', watts: 900, min: 700, max: 1100, hours: 0.2 },
      { name: 'Sandwichera', watts: 800, min: 650, max: 950, hours: 0.2 },
      { name: 'Grill eléctrico', watts: 1600, min: 1300, max: 1900, hours: 0.5 },
      { name: 'Licuadora', watts: 400, min: 300, max: 500, hours: 0.2 },
      { name: 'Batidora', watts: 300, min: 250, max: 350, hours: 0.2 },
      { name: 'Procesadora de alimentos', watts: 600, min: 500, max: 700, hours: 0.2 },
      { name: 'Olla de cocción lenta', watts: 200, min: 150, max: 250, hours: 4 },
      { name: 'Olla a presión eléctrica', watts: 1000, min: 800, max: 1200, hours: 1 },
      { name: 'Arrocera eléctrica', watts: 500, min: 400, max: 600, hours: 0.5 },
      { name: 'Panificadora', watts: 600, min: 500, max: 700, hours: 0.3 },
      { name: 'Exprimidor de jugos', watts: 300, min: 250, max: 350, hours: 0.2 },
      { name: 'Extractora de jugos', watts: 800, min: 600, max: 1000, hours: 0.2 },
      { name: 'Molinillo de café', watts: 150, min: 100, max: 200, hours: 0.1 },
      // Lavado
      { name: 'Lavarropas automático 6kg', watts: 400, min: 350, max: 450, hours: 1 },
      { name: 'Lavarropas automático 8kg', watts: 500, min: 420, max: 580, hours: 1 },
      { name: 'Lavarropas automático 10kg', watts: 600, min: 500, max: 700, hours: 1.2 },
      { name: 'Lavarropas automático 12kg', watts: 700, min: 600, max: 800, hours: 1.5 },
      { name: 'Lavarropas carga frontal', watts: 500, min: 420, max: 580, hours: 1 },
      { name: 'Lavarropas carga superior', watts: 450, min: 380, max: 520, hours: 1 },
      { name: 'Lavarropas semiautomático', watts: 300, min: 250, max: 350, hours: 1 },
      { name: 'Secarropas', watts: 2000, min: 1600, max: 2400, hours: 1.5 },
      { name: 'Lavavajillas', watts: 1800, min: 1500, max: 2100, hours: 1.5 },
      { name: 'Plancha de vapor', watts: 1000, min: 800, max: 1200, hours: 0.5 },
      { name: 'Centro de planchado', watts: 1600, min: 1300, max: 1900, hours: 0.5 },
      { name: 'Enjuagadora de ropa', watts: 300, min: 250, max: 350, hours: 0.5 },
      // Otros
      { name: 'Aspiradora', watts: 1200, min: 1000, max: 1400, hours: 0.5 },
      { name: 'Aspiradora robot', watts: 60, min: 40, max: 80, hours: 2 },
      { name: 'Aspiradora de mano', watts: 400, min: 300, max: 500, hours: 0.3 },
      { name: 'Secador de pelo', watts: 1800, min: 1500, max: 2100, hours: 0.3 },
      { name: 'Plancha de pelo', watts: 50, min: 40, max: 60, hours: 0.3 },
      { name: 'Termotanque eléctrico 50L', watts: 2000, min: 1800, max: 2200, hours: 2 },
      { name: 'Termotanque eléctrico 80L', watts: 2500, min: 2200, max: 2800, hours: 2 },
      { name: 'Calefón eléctrico', watts: 3000, min: 2500, max: 3500, hours: 2 },
      { name: 'Bomba de agua', watts: 500, min: 400, max: 600, hours: 1 },
      { name: 'Cargador de auto eléctrico', watts: 3000, min: 2500, max: 3500, hours: 2 },
      { name: 'Campana extractora', watts: 200, min: 150, max: 250, hours: 1 },
      { name: 'Ventilador de extracción', watts: 40, min: 30, max: 50, hours: 2 },
    ];

    const categoryByName = (catName) => {
      const cat = categories.find((c) => c.name === catName);
      if (!cat) throw new Error(`Category not found: ${catName}`);
      return cat.id;
    };

    const categoryOrder = [
      ['Refrigeración', 0, 8],
      ['Climatización', 8, 25],
      ['Iluminación', 25, 37],
      ['Entretenimiento', 37, 58],
      ['Cocina', 58, 83],
      ['Lavado', 83, 95],
      ['Otros', 95, 107],
    ];

    const appliances = [];
    for (const [catName, from, to] of categoryOrder) {
      const categoryId = categoryByName(catName);
      for (const item of appliancesCatalog.slice(from, to)) {
        appliances.push({
          category_id: categoryId,
          name: item.name,
          nominal_watts: item.watts,
          min_watts: item.min,
          max_watts: item.max,
          hours_daily_usage: item.hours,
          is_active: true,
        });
      }
    }

    await Appliance.bulkCreate(appliances);
    console.log(`${appliances.length} appliances created.`);

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
        device_token: crypto.randomBytes(24).toString('hex'),
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
        device_token: crypto.randomBytes(24).toString('hex'),
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
        device_token: crypto.randomBytes(24).toString('hex'),
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
        device_token: crypto.randomBytes(24).toString('hex'),
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
        device_token: crypto.randomBytes(24).toString('hex'),
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
        device_token: crypto.randomBytes(24).toString('hex'),
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

    const predictions = await Prediction.bulkCreate([
      {
        user_id: demoUser.id,
        prediction_date: '2026-08-01',
        predicted_kwh: 14.2,
        confidence_score: 0.85,
        model_version: 'v2.1-bill-ai',
      },
      {
        user_id: demoUser.id,
        prediction_date: '2026-08-02',
        predicted_kwh: 13.8,
        confidence_score: 0.85,
        model_version: 'v2.1-bill-ai',
      },
      {
        user_id: demoUser.id,
        prediction_date: '2026-08-03',
        predicted_kwh: 15.1,
        confidence_score: 0.85,
        model_version: 'v2.1-bill-ai',
      },
      {
        user_id: demoUser.id,
        prediction_date: '2026-08-04',
        predicted_kwh: 13.5,
        confidence_score: 0.85,
        model_version: 'v2.1-bill-ai',
      },
    ]);
    console.log(`${predictions.length} predictions created.`);

    const recommendations = await Recommendation.bulkCreate([
      {
        user_id: demoUser.id,
        device_id: devices[2].id,
        title: 'Optimizá el uso del aire acondicionado',
        description: 'El aire acondicionado es el dispositivo que más consume en tu hogar. Configurá el termostato a 24°C y usá el modo eco: por cada grado de menos, el consumo aumenta hasta un 8%.',
        category: 'eficiencia',
        priority: 'high',
        potential_savings_kwh: 28,
        potential_savings_cost: 2380,
        source: 'local',
        status: 'pending',
      },
      {
        user_id: demoUser.id,
        device_id: devices[0].id,
        title: 'Revisá las gomas de tu heladera',
        description: 'Si la puerta de la heladera no cierra bien, el compresor trabaja de más. Verificá los burletes y mantené 10 cm de separación con la pared.',
        category: 'mantenimiento',
        priority: 'medium',
        source: 'local',
        status: 'pending',
      },
      {
        user_id: demoUser.id,
        title: 'Desconectá los consumos en stand-by',
        description: 'Televisores, decodificadores y cargadores consumen energía en stand-by. Usá zapatillas con interruptor y apagalas de noche.',
        category: 'comportamiento',
        priority: 'medium',
        potential_savings_kwh: 300,
        potential_savings_cost: 25500,
        source: 'local',
        status: 'pending',
      },
    ]);
    console.log(`${recommendations.length} recommendations created.`);

    console.log('\n--- Seed completed successfully ---');
    console.log('Provinces:', provinces.length);
    console.log('Categories:', categories.length);
    console.log('Appliances:', appliances.length);
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
