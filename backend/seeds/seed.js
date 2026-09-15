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

    const T = (category, from, to, fixed, n1, n2, n3, mn1, xn1, mn2, xn2, mn3, xn3) => ({
      category,
      tier_from: from,
      tier_to: to,
      fixed_charge: fixed,
      price_per_kwh: n1,
      price_per_kwh_n2: n2,
      price_per_kwh_n3: n3,
      estimated_min_n1: mn1,
      estimated_max_n1: xn1,
      estimated_min_n2: mn2,
      estimated_max_n2: xn2,
      estimated_min_n3: mn3,
      estimated_max_n3: xn3,
    });

    const jurisdictions = [
      {
        name: 'Buenos Aires (AMBA)',
        distributor_name: 'Edenor / Edesur',
        regulator_name: 'ENRE',
        tariffs: [
          T('R1', 0, 150, 1520, 112.50, 38.20, 46.80, 12500, 22000, 5500, 10000, 6500, 11500),
          T('R2', 151, 400, 2890, 118.20, 42.10, 51.40, 26000, 58000, 12000, 24000, 14500, 31000),
          T('R3', 401, 500, 5120, 124.80, 48.60, 58.20, 71000, 84000, 32000, 38000, 40000, 50000),
          T('R4', 501, 600, 8450, 129.30, 52.40, 62.90, 90000, 105000, 43000, 50000, 55000, 68000),
          T('R5', 601, 700, 12300, 134.10, 57.20, 68.50, 112000, 130000, 56000, 66000, 72000, 88000),
          T('R6', 701, 800, 16800, 139.50, 62.80, 74.80, 136000, 155000, 70000, 82000, 92000, 110000),
          T('R7', 801, 900, 22100, 144.80, 68.10, 81.20, 160000, 182000, 85000, 98000, 115000, 136000),
          T('R8', 901, 1000, 28500, 150.20, 74.00, 88.00, 188000, 212000, 102000, 118000, 140000, 165000),
          T('R9', 1001, null, 36200, 156.00, 80.50, 95.20, 230000, null, 128000, null, 175000, null),
        ],
      },
      {
        name: 'Buenos Aires (Interior)',
        distributor_name: 'EDEN / EDEA / EDES / EDELAP',
        regulator_name: 'OCEBA',
        tariffs: [
          T('R1', 0, 100, 2100, 135.40, 48.20, 58.10, 18000, 22000, 8000, 10000, 9500, 12000),
          T('R2', 101, 200, 3800, 139.80, 52.60, 63.40, 24000, 42000, 11500, 18000, 13500, 23000),
          T('R3', 201, 300, 5900, 144.20, 57.10, 68.90, 45000, 65000, 21000, 29000, 26000, 38000),
          T('R4', 301, 400, 8700, 149.60, 62.40, 75.20, 70000, 90000, 34000, 43000, 44000, 58000),
          T('R5', 401, 500, 12400, 155.10, 68.00, 82.00, 95000, 118000, 48000, 59000, 64000, 81000),
          T('R6', 501, 600, 17100, 161.20, 74.20, 89.40, 122000, 148000, 64000, 78000, 88000, 108000),
          T('R7', 601, 700, 22800, 167.80, 81.00, 97.50, 152000, 180000, 82000, 98000, 114000, 138000),
          T('R8', 701, 800, 29500, 174.90, 88.30, 106.20, 185000, 215000, 102000, 120000, 144000, 172000),
          T('R9', 801, null, 37800, 182.50, 96.20, 115.80, 225000, null, 128000, null, 180000, null),
        ],
      },
      {
        name: 'Ciudad Autónoma de Buenos Aires',
        distributor_name: 'Edenor / Edesur',
        regulator_name: 'ENRE',
        tariffs: [
          T('R1', 0, 150, 1480, 110.80, 37.50, 45.90, 12000, 21000, 5200, 9800, 6200, 11000),
          T('R2', 151, 400, 2810, 116.50, 41.40, 50.50, 25000, 56000, 11500, 23500, 14000, 30000),
          T('R3', 401, 500, 4980, 122.90, 47.80, 57.30, 69000, 82000, 31000, 37000, 39000, 49000),
          T('R4', 501, 600, 8200, 127.40, 51.60, 61.90, 88000, 102000, 42000, 49000, 53000, 66000),
          T('R5', 601, 700, 11950, 132.10, 56.30, 67.40, 109000, 126000, 54000, 64000, 70000, 85000),
          T('R6', 701, 800, 16300, 137.40, 61.80, 73.60, 132000, 150000, 68000, 79000, 89000, 106000),
          T('R7', 801, 900, 21500, 142.60, 67.00, 79.80, 155000, 176000, 82000, 95000, 111000, 131000),
          T('R8', 901, 1000, 27700, 147.90, 72.80, 86.50, 182000, 205000, 99000, 114000, 135000, 159000),
          T('R9', 1001, null, 35100, 153.50, 79.20, 93.60, 222000, null, 124000, null, 168000, null),
        ],
      },
      {
        name: 'Catamarca',
        distributor_name: 'EC SAPEM',
        regulator_name: 'ENRE Catamarca',
        tariffs: [
          T('R1', 0, 150, 1850, 126.50, 43.10, 52.80, 14000, 24000, 6200, 11000, 7500, 12800),
          T('R2', 151, 300, 3400, 131.20, 47.80, 58.20, 28000, 52000, 13500, 24000, 16000, 30000),
          T('R3', 301, 450, 5900, 136.80, 53.20, 64.90, 58000, 83000, 28000, 39000, 35000, 52000),
          T('R4', 451, 600, 9300, 142.50, 59.10, 72.10, 92000, 120000, 46000, 59000, 60000, 81000),
          T('R5', 601, null, 14200, 149.10, 65.70, 80.20, 130000, null, 68000, null, 92000, null),
        ],
      },
      {
        name: 'Chaco',
        distributor_name: 'SECHEEP',
        regulator_name: 'SECHEEP',
        tariffs: [
          T('R1', 0, 150, 2100, 138.20, 46.50, 56.40, 16000, 27000, 7000, 12000, 8200, 13800),
          T('R2', 151, 350, 4200, 143.50, 51.80, 62.90, 32000, 68000, 15000, 30000, 18500, 38000),
          T('R3', 351, 600, 7800, 149.80, 57.90, 70.50, 78000, 125000, 37000, 58000, 48000, 78000),
          T('R4', 601, null, 13500, 157.20, 65.10, 79.30, 138000, null, 68000, null, 92000, null),
        ],
      },
      {
        name: 'Chubut',
        distributor_name: 'Servicoop / SCPL',
        regulator_name: 'Concesión Municipal',
        tariffs: [
          T('R1', 0, 120, 2800, 152.10, 58.40, 71.20, 18000, 27000, 8500, 12800, 10200, 15200),
          T('R2', 121, 250, 5100, 158.40, 64.20, 78.50, 31000, 58000, 16000, 28000, 19500, 35000),
          T('R3', 251, 400, 8900, 165.20, 71.00, 86.80, 64000, 98000, 32000, 48000, 41000, 62000),
          T('R4', 401, null, 14800, 173.00, 78.80, 96.20, 108000, null, 58000, null, 76000, null),
        ],
      },
      {
        name: 'Córdoba',
        distributor_name: 'EPEC',
        regulator_name: 'ERSEP',
        tariffs: [
          T('R1', 0, 120, 2400, 145.80, 52.10, 63.20, 17000, 26000, 7800, 11800, 9200, 13900),
          T('R2', 121, 240, 4500, 151.20, 57.40, 69.80, 28000, 52000, 14000, 24000, 17000, 29000),
          T('R3', 241, 400, 7800, 157.60, 63.80, 77.50, 58000, 92000, 28000, 43000, 36000, 56000),
          T('R4', 401, null, 12900, 164.80, 71.00, 86.10, 102000, null, 51000, null, 68000, null),
        ],
      },
      {
        name: 'Corrientes',
        distributor_name: 'DPEC',
        regulator_name: 'DPEC',
        tariffs: [
          T('R1', 0, 150, 1950, 131.00, 44.80, 54.20, 15000, 25000, 6800, 11200, 8000, 13000),
          T('R2', 151, 300, 3600, 136.50, 49.50, 60.10, 29000, 55000, 14000, 25000, 17000, 31000),
          T('R3', 301, 500, 6400, 142.80, 55.20, 67.10, 60000, 96000, 29000, 45000, 37000, 59000),
          T('R4', 501, null, 10800, 150.10, 62.00, 75.30, 106000, null, 52000, null, 70000, null),
        ],
      },
      {
        name: 'Entre Ríos',
        distributor_name: 'ENERSA',
        regulator_name: 'EPRE Entre Ríos',
        tariffs: [
          T('R1', 0, 150, 2300, 142.00, 51.00, 61.80, 17000, 28000, 8000, 12500, 9500, 14500),
          T('R2', 151, 300, 4200, 148.00, 56.50, 68.40, 32000, 60000, 16000, 28000, 19000, 34000),
          T('R3', 301, 500, 7500, 154.50, 62.80, 76.10, 66000, 105000, 32000, 50000, 42000, 66000),
          T('R4', 501, null, 12200, 162.00, 70.10, 85.00, 115000, null, 58000, null, 78000, null),
        ],
      },
      {
        name: 'Formosa',
        distributor_name: 'REFSA',
        regulator_name: 'EROSP',
        tariffs: [
          T('R1', 0, 150, 1750, 124.00, 41.50, 50.20, 14000, 23000, 6000, 10200, 7100, 12000),
          T('R2', 151, 300, 3200, 129.50, 46.20, 55.90, 27000, 50000, 12800, 22500, 15200, 28000),
          T('R3', 301, 500, 5800, 135.80, 51.80, 62.80, 56000, 89000, 26500, 41000, 33500, 53000),
          T('R4', 501, null, 9800, 143.00, 58.50, 70.80, 98000, null, 48000, null, 64000, null),
        ],
      },
      {
        name: 'Jujuy',
        distributor_name: 'EJESA',
        regulator_name: 'SUSEPU',
        tariffs: [
          T('R1', 0, 150, 2050, 134.00, 47.00, 56.80, 16000, 26000, 7200, 11800, 8500, 13600),
          T('R2', 151, 300, 3850, 139.80, 52.20, 63.10, 30000, 56000, 14500, 25500, 17800, 32000),
          T('R3', 301, 500, 6800, 146.20, 58.30, 70.50, 62000, 99000, 30000, 46000, 38500, 60000),
          T('R4', 501, null, 11200, 153.80, 65.50, 79.20, 108000, null, 53000, null, 71000, null),
        ],
      },
      {
        name: 'La Pampa',
        distributor_name: 'Cooperativas Eléctricas',
        regulator_name: 'APE',
        tariffs: [
          T('R1', 0, 150, 2200, 139.00, 49.50, 59.80, 16500, 27500, 7500, 12200, 9000, 14000),
          T('R2', 151, 300, 4000, 145.00, 54.80, 66.20, 31000, 58000, 15000, 26500, 18200, 33000),
          T('R3', 301, 500, 7100, 151.80, 61.00, 73.80, 64000, 102000, 31000, 48000, 40000, 63000),
          T('R4', 501, null, 11800, 159.50, 68.20, 82.50, 112000, null, 55000, null, 74000, null),
        ],
      },
      {
        name: 'La Rioja',
        distributor_name: 'EDELAR',
        regulator_name: 'EUCOP',
        tariffs: [
          T('R1', 0, 150, 1800, 128.00, 42.80, 52.00, 14500, 24500, 6300, 10800, 7600, 12600),
          T('R2', 151, 300, 3300, 133.20, 47.50, 57.80, 28000, 52000, 13200, 23500, 15800, 29500),
          T('R3', 301, 500, 5900, 139.00, 53.00, 64.50, 57000, 91000, 27000, 42000, 34500, 55000),
          T('R4', 501, null, 10100, 146.20, 59.80, 72.80, 100000, null, 49000, null, 66000, null),
        ],
      },
      {
        name: 'Mendoza',
        distributor_name: 'Edemsa / Edeeste',
        regulator_name: 'EPRE Mendoza',
        tariffs: [
          T('R1', 0, 150, 1980, 132.50, 45.20, 54.80, 15000, 25500, 6800, 11200, 8000, 13200),
          T('R2', 151, 300, 3700, 138.00, 50.10, 60.80, 29000, 55000, 14000, 24800, 17000, 31500),
          T('R3', 301, 500, 6500, 144.50, 56.00, 68.00, 60000, 97000, 29500, 46000, 37500, 59500),
          T('R4', 501, null, 10900, 152.00, 63.10, 76.50, 107000, null, 53000, null, 71000, null),
        ],
      },
      {
        name: 'Misiones',
        distributor_name: 'EMSA / Cooperativas',
        regulator_name: 'Energía de Misiones',
        tariffs: [
          T('R1', 0, 150, 2150, 137.00, 48.00, 58.20, 16000, 26800, 7300, 12000, 8700, 13900),
          T('R2', 151, 300, 3950, 143.00, 53.20, 64.50, 31000, 57000, 15000, 26000, 18000, 33000),
          T('R3', 301, 500, 7000, 149.50, 59.50, 72.10, 63000, 100000, 31000, 47500, 39500, 62000),
          T('R4', 501, null, 11600, 157.20, 67.00, 81.00, 110000, null, 55000, null, 74000, null),
        ],
      },
      {
        name: 'Neuquén',
        distributor_name: 'EPEN / CALF',
        regulator_name: 'EPEN',
        tariffs: [
          T('R1', 0, 150, 2350, 141.50, 50.50, 61.00, 17000, 28000, 7800, 12500, 9300, 14500),
          T('R2', 151, 300, 4300, 147.80, 56.00, 67.80, 32000, 60000, 16000, 27500, 19200, 34800),
          T('R3', 301, 500, 7600, 154.80, 62.50, 75.60, 66000, 104000, 32500, 50000, 41500, 65500),
          T('R4', 501, null, 12500, 162.80, 70.20, 85.00, 115000, null, 58000, null, 78000, null),
        ],
      },
      {
        name: 'Río Negro',
        distributor_name: 'Edersa',
        regulator_name: 'EPRE Río Negro',
        tariffs: [
          T('R1', 0, 150, 2400, 143.00, 51.80, 62.50, 17200, 28500, 8000, 12800, 9500, 14800),
          T('R2', 151, 300, 4400, 149.20, 57.20, 69.10, 33000, 61000, 16500, 28200, 19800, 35800),
          T('R3', 301, 500, 7800, 156.20, 63.80, 77.00, 67000, 106000, 33500, 51500, 42800, 67500),
          T('R4', 501, null, 12800, 164.50, 71.50, 86.50, 118000, null, 60000, null, 80000, null),
        ],
      },
      {
        name: 'Salta',
        distributor_name: 'Edesa',
        regulator_name: 'EnRESP',
        tariffs: [
          T('R1', 0, 150, 2000, 133.50, 46.00, 55.50, 15200, 25800, 7000, 11500, 8200, 13400),
          T('R2', 151, 300, 3750, 139.00, 51.00, 61.80, 29500, 55800, 14200, 25200, 17200, 32000),
          T('R3', 301, 500, 6600, 145.50, 57.00, 69.20, 61000, 98000, 30000, 47000, 38000, 60800),
          T('R4', 501, null, 11000, 153.00, 64.20, 77.80, 108000, null, 54000, null, 72000, null),
        ],
      },
      {
        name: 'San Juan',
        distributor_name: 'Energía San Juan',
        regulator_name: 'EPRE',
        tariffs: [
          T('R1', 0, 150, 1880, 129.00, 43.80, 53.00, 14800, 24800, 6500, 11000, 7800, 12900),
          T('R2', 151, 300, 3500, 134.50, 48.60, 59.00, 28500, 53500, 13500, 24200, 16200, 30500),
          T('R3', 301, 500, 6100, 140.80, 54.50, 66.00, 58000, 93000, 28500, 44500, 36000, 57500),
          T('R4', 501, null, 10300, 148.00, 61.20, 74.20, 102000, null, 50000, null, 68000, null),
        ],
      },
      {
        name: 'San Luis',
        distributor_name: 'Edesal',
        regulator_name: 'Comisión Reguladora Provincial',
        tariffs: [
          T('R1', 0, 150, 2020, 134.80, 46.80, 56.50, 15500, 26200, 7100, 11800, 8400, 13600),
          T('R2', 151, 300, 3800, 140.50, 51.80, 62.70, 30000, 56500, 14500, 25500, 17500, 32500),
          T('R3', 301, 500, 6700, 147.00, 58.00, 70.20, 62000, 99500, 30500, 47000, 38800, 61500),
          T('R4', 501, null, 11100, 154.50, 65.00, 78.80, 109000, null, 54000, null, 73000, null),
        ],
      },
      {
        name: 'Santa Cruz',
        distributor_name: 'SPSE',
        regulator_name: 'SPSE',
        tariffs: [
          T('R1', 0, 150, 2650, 148.00, 55.00, 66.20, 18500, 30500, 8800, 14000, 10500, 16200),
          T('R2', 151, 300, 4850, 154.50, 61.00, 73.50, 35000, 65500, 18000, 30500, 21500, 38800),
          T('R3', 301, 500, 8500, 162.00, 68.20, 82.00, 71000, 112000, 36000, 55500, 46000, 72500),
          T('R4', 501, null, 13900, 170.50, 76.50, 92.10, 125000, null, 65000, null, 86000, null),
        ],
      },
      {
        name: 'Santa Fe',
        distributor_name: 'EPE',
        regulator_name: 'EPE',
        tariffs: [
          T('R1', 0, 150, 2300, 141.00, 50.20, 60.80, 16800, 27800, 7800, 12400, 9200, 14300),
          T('R2', 151, 300, 4250, 147.00, 55.80, 67.50, 32000, 59500, 15800, 27200, 19000, 34500),
          T('R3', 301, 500, 7400, 153.80, 62.10, 75.20, 65000, 103000, 32000, 49800, 41000, 65000),
          T('R4', 501, null, 12100, 161.50, 69.50, 84.10, 114000, null, 57000, null, 76000, null),
        ],
      },
      {
        name: 'Santiago del Estero',
        distributor_name: 'Edese',
        regulator_name: 'ENRESE',
        tariffs: [
          T('R1', 0, 150, 1820, 127.20, 42.20, 51.50, 14200, 24200, 6200, 10600, 7400, 12400),
          T('R2', 151, 300, 3350, 132.50, 47.00, 57.20, 27800, 51500, 13000, 23200, 15500, 29000),
          T('R3', 301, 500, 5950, 138.50, 52.50, 64.00, 56500, 90000, 26800, 41500, 34000, 54500),
          T('R4', 501, null, 10000, 145.50, 59.20, 72.00, 99000, null, 48500, null, 65000, null),
        ],
      },
      {
        name: 'Tierra del Fuego',
        distributor_name: 'Cooperativa Eléctrica de Río Grande',
        regulator_name: 'DPE',
        tariffs: [
          T('R1', 0, 150, 2800, 151.00, 57.20, 68.50, 19000, 31500, 9100, 14600, 10900, 17000),
          T('R2', 151, 300, 5100, 158.00, 63.50, 76.20, 36500, 68500, 18800, 32000, 22500, 40500),
          T('R3', 301, 500, 8900, 166.00, 71.00, 85.50, 74000, 117000, 37500, 58000, 48000, 76000),
          T('R4', 501, null, 14500, 175.00, 79.80, 96.00, 130000, null, 68000, null, 90000, null),
        ],
      },
    ];

    const provinces = [];
    for (const jurisdiction of jurisdictions) {
      const province = await Province.create({
        name: jurisdiction.name,
        distributor_name: jurisdiction.distributor_name,
        regulator_name: jurisdiction.regulator_name,
        is_active: true,
      });
      provinces.push(province);
      const rows = jurisdiction.tariffs.map((t) => ({
        ...t,
        province_id: province.id,
        tariff_name: `Residencial ${t.category}`,
        effective_from: '2026-09-01',
        effective_to: null,
        is_current: true,
      }));
      await Tariff.bulkCreate(rows);
    }
    console.log(`${provinces.length} provinces created.`);

    const tariffsCount = await Tariff.count();
    console.log(`${tariffsCount} tariffs created.`);

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
      // Iluminación (ordenado por watts ascendente)
      { name: 'Lámpara LED 6W', watts: 6, min: 5, max: 7, hours: 4 },
      { name: 'Spot LED empotrable 7W', watts: 7, min: 5, max: 9, hours: 3 },
      { name: 'Lámpara LED 9W', watts: 9, min: 8, max: 10, hours: 4 },
      { name: 'Luz de jardín exterior', watts: 10, min: 7, max: 13, hours: 8 },
      { name: 'Lámpara LED 12W', watts: 12, min: 10, max: 14, hours: 4 },
      { name: 'Aplique de pared LED 12W', watts: 12, min: 10, max: 14, hours: 3 },
      { name: 'Lámpara LED 15W', watts: 15, min: 13, max: 17, hours: 4 },
      { name: 'Velador', watts: 15, min: 10, max: 20, hours: 3 },
      { name: 'Lámpara LED 18W', watts: 18, min: 15, max: 21, hours: 4 },
      { name: 'Tubo LED 18W', watts: 18, min: 15, max: 21, hours: 6 },
      { name: 'Lámpara de bajo consumo 20W', watts: 20, min: 18, max: 22, hours: 4 },
      { name: 'Lámpara de mesa', watts: 20, min: 15, max: 25, hours: 2 },
      { name: 'Luz de seguridad con sensor 20W', watts: 20, min: 15, max: 25, hours: 8 },
      { name: 'Tira LED', watts: 24, min: 18, max: 30, hours: 4 },
      { name: 'Plafón LED 24W', watts: 24, min: 20, max: 28, hours: 4 },
      { name: 'Lámpara de pie', watts: 25, min: 20, max: 30, hours: 3 },
      { name: 'Foco reflector LED 30W', watts: 30, min: 25, max: 35, hours: 3 },
      { name: 'Lámpara colgante LED 30W', watts: 30, min: 25, max: 35, hours: 4 },
      { name: 'Panel LED empotrable 36W', watts: 36, min: 30, max: 42, hours: 4 },
      { name: 'Lámpara incandescente 60W', watts: 60, min: 55, max: 65, hours: 3 },
      { name: 'Reflector halógeno 150W', watts: 150, min: 120, max: 180, hours: 2 },
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
      ['Iluminación', 25, 46],
      ['Entretenimiento', 46, 67],
      ['Cocina', 67, 92],
      ['Lavado', 92, 104],
      ['Otros', 104, 116],
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
    console.log('Provinces (24 jurisdicciones):', provinces.length);
    console.log('Categories:', categories.length);
    console.log('Appliances:', appliances.length);
    console.log('Tariffs:', tariffsCount);
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
