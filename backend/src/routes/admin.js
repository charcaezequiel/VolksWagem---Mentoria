const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize, User, Province, Tariff, DeviceCategory, Appliance, Device,
  ConsumptionReading, Alert, Invoice, Prediction, Recommendation, AiConfig,
} = require('../models');
const { authenticateToken, requireAdmin, generateDeviceToken } = require('../middleware/auth');
const { PASSWORD_POLICY } = require('../validators/authValidators');
const aiConfigService = require('../services/aiConfigService');

/* Todas las rutas cuelgan de authenticateToken + requireAdmin: ningun endpoint
   de este router es accesible sin token valido Y con role === 'admin'. */
router.use(authenticateToken, requireAdmin);

const bad = (res, error, details) =>
  res.status(400).json({ error, ...(details ? { details } : {}) });

/** Los campos numericos llegan como string desde el form; se castean y validan. */
/**
 * Convierte un valor de formulario a numero.
 * '' / null / undefined -> null (campo vacio, legitimo).
 * Texto no numerico     -> NaN (marca de error).
 *
 * El NaN es intencional: num() SOLO castea, no valida. El problema es que
 * NaN no lo detectan los chequeos ingenuos, porque tanto `NaN < 0` como
 * `NaN == null` dan false. Por eso toda escritura numérica pasa despues por
 * hasInvalidNumbers(), que usa Number.isFinite.
 */
const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

/** Nombres de los campos del payload que quedaron en NaN. Vacio = todo ok. */
const hasInvalidNumbers = (object, fields) =>
  fields.filter((f) => object[f] !== undefined && object[f] !== null && !Number.isFinite(object[f]));

const TARIFF_NUMERIC = [
  'tier_from', 'tier_to', 'price_per_kwh', 'price_per_kwh_n2', 'price_per_kwh_n3',
  'fixed_charge', 'estimated_min_n1', 'estimated_max_n1', 'estimated_min_n2',
  'estimated_max_n2', 'estimated_min_n3', 'estimated_max_n3',
];

const WATT_NUMERIC = ['nominal_watts', 'min_watts', 'max_watts', 'hours_daily_usage'];

/* ================== 1. USUARIOS ================== */

router.get('/users', async (req, res, next) => {
  try {
    const { search, role, status, province_id, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role === 'admin' || role === 'user') where.role = role;
    if (province_id) where.province_id = Number(province_id);
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * pageSize;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true,
    });

    res.json({ users: rows, total: count, page: pageNum, limit: pageSize, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [devices, alerts, invoices, predictions, recommendations] = await Promise.all([
      Device.count({ where: { user_id: user.id } }),
      Alert.count({ where: { user_id: user.id } }),
      Invoice.count({ where: { user_id: user.id } }),
      Prediction.count({ where: { user_id: user.id } }),
      Recommendation.count({ where: { user_id: user.id } }),
    ]);

    res.json({ user, stats: { devices, alerts, invoices, predictions, recommendations } });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const { name, email, province_id, user_type, alert_threshold_kwh, is_active, role } = req.body;
    const target = await User.findByPk(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    /* Un admin no puede quitarse a si mismo el rol: dejaria al sistema sin
       ningun administrador accesible (es el unico que puede reasignarlo). */
    if (role !== undefined && target.id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'No puedes quitarte a ti mismo el rol de administrador' });
    }

    const patch = {};
    if (name !== undefined) patch.name = name;
    if (email !== undefined) patch.email = email;
    if (province_id !== undefined) patch.province_id = province_id;
    if (user_type !== undefined) patch.user_type = user_type;
    if (alert_threshold_kwh !== undefined) patch.alert_threshold_kwh = num(alert_threshold_kwh);
    if (is_active !== undefined) patch.is_active = Boolean(is_active);
    if (role !== undefined) patch.role = role;

    if (patch.alert_threshold_kwh != null && !Number.isFinite(patch.alert_threshold_kwh)) {
      return bad(res, 'alert_threshold_kwh no es un numero');
    }
    if (role !== undefined && role !== 'admin' && role !== 'user') {
      return bad(res, "role debe ser 'user' o 'admin'");
    }

    await target.update(patch);

    const fresh = await User.findByPk(target.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
    });
    res.json({ user: fresh });
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, province_id, user_type, role, alert_threshold_kwh } = req.body;

    if (!name || !email || !password) {
      return bad(res, 'name, email y password son requeridos');
    }
    /* Se reutiliza la MISMA politica que el registro publico: una cuenta creada
       desde el panel tiene que cumplir las mismas reglas que una creada por el
       usuario, o quedaria con una contrasena mas debil que el sistema acepta. */
    if (password.length < PASSWORD_POLICY.minLength || password.length > PASSWORD_POLICY.maxLength) {
      return bad(res, `La contrasena debe tener entre ${PASSWORD_POLICY.minLength} y ${PASSWORD_POLICY.maxLength} caracteres`);
    }
    if (!PASSWORD_POLICY.regex.test(password)) {
      return bad(res, 'La contrasena debe incluir mayuscula, minuscula, numero y simbolo');
    }
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    /* Misma proteccion que en PUT /users/:id: num() devuelve NaN para texto no
       numerico y ese NaN llegaria directo a la columna. */
    const threshold = alert_threshold_kwh != null ? num(alert_threshold_kwh) : null;
    if (threshold != null && !Number.isFinite(threshold)) {
      return bad(res, 'alert_threshold_kwh no es un numero');
    }

    // El hook beforeCreate del modelo hashea password_hash por nosotros.
    const user = await User.create({
      name,
      email,
      password_hash: password,
      province_id: province_id || null,
      user_type: user_type || 'residencial',
      role: role === 'admin' ? 'admin' : 'user',
      alert_threshold_kwh: threshold,
    });

    /* Se relee con la provincia para que el objeto devuelto sea identico al que
       devuelve GET /users: sin esto el alta respondia sin provincia y un
       cliente que creara una cuenta y leyera la respuesta veria menos campos
       que si la consultara despues. */
    const created = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
    });
    res.status(201).json({ user: created });
  } catch (error) {
    next(error);
  }
});

/* ================== 2. TARIFAS ================== */

/* Un tarifarioprovincial son 9 escalones (R1..R9). Esta es la operacion mas
   delicada del panel: al guardar se desactiva la vigencia anterior de ESA
   provincia y se da de alta la nueva, en una transaccion. Si algo falla a
   mitad, no queda la provincia sin tarifa vigente. */
router.post('/tariffs/bulk', async (req, res, next) => {
  try {
    const { province_id, effective_from, rows } = req.body;

    if (!province_id) return bad(res, 'province_id es requerido');
    if (!effective_from) return bad(res, 'effective_from es requerido');
    if (!Array.isArray(rows) || rows.length === 0) return bad(res, 'rows debe ser un arreglo no vacio');

    const errors = [];
    const parsed = rows.map((row, i) => {
      const clean = {
        province_id: Number(province_id),
        tariff_name: row.tariff_name || `Residencial ${row.category || `R${i + 1}`}`,
        category: row.category || `R${i + 1}`,
        tier_from: num(row.tier_from),
        tier_to: num(row.tier_to),
        price_per_kwh: num(row.price_per_kwh),
        price_per_kwh_n2: num(row.price_per_kwh_n2),
        price_per_kwh_n3: num(row.price_per_kwh_n3),
        fixed_charge: num(row.fixed_charge) ?? 0,
        estimated_min_n1: num(row.estimated_min_n1),
        estimated_max_n1: num(row.estimated_max_n1),
        estimated_min_n2: num(row.estimated_min_n2),
        estimated_max_n2: num(row.estimated_max_n2),
        estimated_min_n3: num(row.estimated_min_n3),
        estimated_max_n3: num(row.estimated_max_n3),
        effective_from,
        effective_to: row.effective_to || null,
        is_current: true,
      };

      /* Todas las validaciones usan Number.isFinite. Un chequeo con `< 0` o
         `== null` NO alcanza: para NaN ambas comparaciones dan false, y
         "abc" terminaba guardado como tier_from = NaN en la tabla de
         precios. Se valida ANTES de abrir la transaccion para que una fila
         mala no deje a la provincia sin tarifa vigente. */
      const badNumbers = hasInvalidNumbers(clean, TARIFF_NUMERIC);
      if (badNumbers.length) {
        errors.push(`Fila ${i + 1}: ${badNumbers.join(', ')} no es un numero`);
        return clean;
      }

      if (clean.tier_from == null || clean.tier_from < 0) {
        errors.push(`Fila ${i + 1}: tier_from es requerido y no puede ser negativo`);
      }
      if (clean.price_per_kwh == null || clean.price_per_kwh < 0) {
        errors.push(`Fila ${i + 1}: price_per_kwh (N1) es requerido y no puede ser negativo`);
      }
      if (clean.tier_to != null && clean.tier_to <= clean.tier_from) {
        errors.push(`Fila ${i + 1}: tier_to debe ser mayor que tier_from`);
      }
      return clean;
    });

    if (errors.length) return bad(res, 'Revisar las filas marcadas', errors);

    /* Solo se cuentan las que estaban VIGENTES: `previous` trae tambien el
       historico de cargas anteriores y el numero de desactivadas seria mayor
       al real. */
    const previous = await Tariff.count({
      where: { province_id: Number(province_id), is_current: true },
    });
    const t = sequelize.transaction(async (transaction) => {
      // Se cierra la vigencia anterior en vez de borrarla: queda el historico
      // de lo que se estaba cobrando antes de esta carga.
      await Tariff.update(
        { is_current: false, effective_to: effective_from },
        { where: { province_id: Number(province_id), is_current: true }, transaction },
      );
      await Tariff.bulkCreate(parsed, { transaction });
    });
    await t;

    res.status(201).json({
      message: `${parsed.length} tarifas cargadas`,
      created: parsed.length,
      deactivated: previous,
      tariffs: await Tariff.findAll({
        where: { province_id: Number(province_id), is_current: true },
        order: [['tier_from', 'ASC']],
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tariffs', async (req, res, next) => {
  try {
    const { province_id, only_current = 'true' } = req.query;
    const where = {};
    if (province_id) where.province_id = Number(province_id);
    if (only_current === 'true') where.is_current = true;

    const tariffs = await Tariff.findAll({
      where,
      include: [{ model: Province, as: 'province', attributes: ['id', 'name', 'distributor_name', 'regulator_name'] }],
      order: [['province_id', 'ASC'], ['tier_from', 'ASC']],
    });

    /* Conteo de tarifas vigentes por provincia, para que el selector del panel
       muestre cuantas tiene cada una. La subconsulta referencia "Province".
       (el alias que Sequelize le pone a la tabla), NO "provinces": el nombre
       real de la tabla no existe en el FROM y Postgres lo rechaza. */
    const counts = await Province.findAll({
      attributes: ['id', 'name', [
        literal(`(SELECT COUNT(*)::int FROM tariffs WHERE tariffs.province_id = "Province"."id" AND tariffs.is_current = true)`),
        'tariff_count',
      ]],
      order: [['name', 'ASC']],
    });

    res.json({ tariffs, provinces: counts });
  } catch (error) {
    next(error);
  }
});

router.put('/tariffs/:id', async (req, res, next) => {
  try {
    const tariff = await Tariff.findByPk(req.params.id);
    if (!tariff) return res.status(404).json({ error: 'Tariff not found' });

    const patch = {};
    for (const field of ['tariff_name', 'category', 'effective_from', 'effective_to']) {
      if (req.body[field] !== undefined) patch[field] = req.body[field];
    }
    for (const field of TARIFF_NUMERIC) {
      if (req.body[field] !== undefined) patch[field] = num(req.body[field]);
    }
    if (req.body.is_current !== undefined) patch.is_current = Boolean(req.body.is_current);

    const badNumbers = hasInvalidNumbers(patch, TARIFF_NUMERIC);
    if (badNumbers.length) {
      return bad(res, 'Valores no numericos', badNumbers.map((f) => `${f}: no es un numero`));
    }
    for (const field of ['tier_from', 'price_per_kwh']) {
      if (patch[field] !== undefined && patch[field] !== null && patch[field] < 0) {
        return bad(res, 'Valores fuera de rango', [`${field} no puede ser negativo`]);
      }
    }

    await tariff.update(patch);
    res.json({ tariff });
  } catch (error) {
    next(error);
  }
});

router.delete('/tariffs/:id', async (req, res, next) => {
  try {
    const tariff = await Tariff.findByPk(req.params.id);
    if (!tariff) return res.status(404).json({ error: 'Tariff not found' });
    await tariff.destroy();
    res.json({ deleted: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

/* ================== 3. CATEGORIAS Y ELECTRODOMESTICOS ================== */

router.get('/categories', async (req, res, next) => {
  try {
    /* Se incluye la lista de electrodomésticos de cada categoria, no solo el
       conteo: el panel tiene que poder verlos y borrarlos individualmente.
       Es un catalogo chico y acotado, no una tabla de consumo. */
    const categories = await DeviceCategory.findAll({
      order: [['name', 'ASC']],
      include: [{
        model: Appliance,
        as: 'appliances',
        attributes: ['id', 'category_id', 'name', 'nominal_watts', 'hours_daily_usage'],
      }],
    });

    const withCounts = categories.map((c) => {
      const json = c.toJSON();
      return { ...json, appliance_count: json.appliances ? json.appliances.length : 0 };
    });
    res.json({ categories: withCounts });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name, icon, description } = req.body;
    if (!name) return bad(res, 'name es requerido');
    const category = await DeviceCategory.create({ name, icon: icon || null, description: description || null });
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const category = await DeviceCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    await category.update({
      ...(req.body.name !== undefined && { name: req.body.name }),
      ...(req.body.icon !== undefined && { icon: req.body.icon }),
      ...(req.body.description !== undefined && { description: req.body.description }),
    });
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const category = await DeviceCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    /* No se borra una categoria en uso: dejaria dispositivos y electrodomesticos
       del catalogo apuntando a un category_id inexistente. */
    const [devices, appliances] = await Promise.all([
      Device.count({ where: { category_id: category.id } }),
      Appliance.count({ where: { category_id: category.id } }),
    ]);
    if (devices > 0 || appliances > 0) {
      return res.status(409).json({
        error: 'La categoria esta en uso y no se puede eliminar',
        details: { devices, appliances },
      });
    }

    await category.destroy();
    res.json({ deleted: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

router.post('/appliances', async (req, res, next) => {
  try {
    const { category_id, name, nominal_watts, min_watts, max_watts, hours_daily_usage } = req.body;
    if (!category_id || !name || nominal_watts == null) {
      return bad(res, 'category_id, name y nominal_watts son requeridos');
    }
    const watts = {
      nominal_watts: num(nominal_watts),
      min_watts: num(min_watts),
      max_watts: num(max_watts),
      hours_daily_usage: num(hours_daily_usage) ?? 0,
    };
    const badNumbers = hasInvalidNumbers(watts, WATT_NUMERIC);
    if (badNumbers.length) {
      return bad(res, 'Valores no numericos', badNumbers.map((f) => `${f}: no es un numero`));
    }
    if (watts.nominal_watts < 0 || (watts.hours_daily_usage !== null && watts.hours_daily_usage < 0)) {
      return bad(res, 'Valores fuera de rango', ['los watts y las horas no pueden ser negativos']);
    }
    const appliance = await Appliance.create({
      category_id: Number(category_id),
      name,
      // Se reutiliza el objeto ya casteado y validado: recalcular num() aqui
      // podria guardar un valor distinto del que se verifico.
      ...watts,
    });
    res.status(201).json({ appliance });
  } catch (error) {
    next(error);
  }
});

router.delete('/appliances/:id', async (req, res, next) => {
  try {
    const appliance = await Appliance.findByPk(req.params.id);
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });
    await appliance.destroy();
    res.json({ deleted: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

/* ================== 4. DISPOSITIVOS (ALTA ADMINISTRATIVA) ================== */

/* El alta normal la hace cada usuario en /devices. Esta es la alta
   administrativa: el admin da de alta un dispositivo en la cuenta de un
   cliente, util cuando se instala un sensor a un cliente nuevo. */
router.post('/devices', async (req, res, next) => {
  try {
    const { user_id, category_id, name, nominal_watts, min_watts, max_watts, hours_daily_usage } = req.body;

    if (!user_id || !category_id || !name || nominal_watts == null) {
      return bad(res, 'user_id, category_id, name y nominal_watts son requeridos');
    }

    const [owner, category] = await Promise.all([
      User.findByPk(user_id),
      DeviceCategory.findByPk(category_id),
    ]);
    if (!owner) return bad(res, 'El usuario indicado no existe');
    if (!category) return bad(res, 'La categoria indicada no existe');

    const watts = {
      nominal_watts: num(nominal_watts),
      min_watts: num(min_watts),
      max_watts: num(max_watts),
      hours_daily_usage: num(hours_daily_usage) ?? 0,
    };
    const badNumbers = hasInvalidNumbers(watts, WATT_NUMERIC);
    if (badNumbers.length) {
      return bad(res, 'Valores no numericos', badNumbers.map((f) => `${f}: no es un numero`));
    }
    if (watts.nominal_watts < 0) {
      return bad(res, 'Valores fuera de rango', ['nominal_watts no puede ser negativo']);
    }

    const device = await Device.create({
      user_id,
      category_id: Number(category_id),
      name,
      ...watts,
      is_custom: true,
      device_token: generateDeviceToken(),
    });

    res.status(201).json({ device });
  } catch (error) {
    next(error);
  }
});

router.put('/devices/:id', async (req, res, next) => {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const patch = {};
    for (const field of ['name', 'category_id']) {
      if (req.body[field] !== undefined) patch[field] = field === 'category_id' ? Number(req.body[field]) : req.body[field];
    }
    for (const field of WATT_NUMERIC) {
      if (req.body[field] !== undefined) patch[field] = num(req.body[field]);
    }
    if (req.body.is_active !== undefined) patch.is_active = Boolean(req.body.is_active);

    const badNumbers = hasInvalidNumbers(patch, WATT_NUMERIC);
    if (badNumbers.length) {
      return bad(res, 'Valores no numericos', badNumbers.map((f) => `${f}: no es un numero`));
    }

    await device.update(patch);
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

router.post('/devices/:id/rotate-token', async (req, res, next) => {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    await device.update({ device_token: generateDeviceToken() });
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

/* ================== 5. MONITOREO DE CUENTAS ================== */

/* Panorama de toda la plataforma: cuantas cuentas hay, cuantos sensores estan
   en linea, que volumen de lecturas hubo, y como se reparten los usuarios. */
router.get('/stats', async (req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers, activeUsers, adminUsers,
      totalDevices, onlineDevices, totalCategories, totalAppliances,
      totalTariffs, provincesWithTariffs, totalAlerts, unreadAlerts,
      readings30d, readings24h, totalInvoices, totalPredictions, totalRecommendations,
      byType, byProvince, topConsumers,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { is_active: true } }),
      User.count({ where: { role: 'admin' } }),
      Device.count(),
      Device.count({ where: { is_active: true, last_seen_at: { [Op.gte]: since24h } } }),
      DeviceCategory.count(),
      Appliance.count(),
      Tariff.count({ where: { is_current: true } }),
      /* Cuenta provincias con tarifario vigente. Se cuenta sobre la lista de
         province_id en vez de una subconsulta dentro de Op.in: es el mismo
         resultado sin depender de como Sequelize cite el literal. */
      Tariff.findAll({
        where: { is_current: true },
        attributes: ['province_id'],
        group: ['province_id'],
      }).then((rows) => rows.length),
      Alert.count(),
      Alert.count({ where: { is_read: false } }),
      ConsumptionReading.count({ where: { reading_timestamp: { [Op.gte]: since } } }),
      ConsumptionReading.count({ where: { reading_timestamp: { [Op.gte]: since24h } } }),
      Invoice.count(),
      Prediction.count(),
      Recommendation.count(),
      User.findAll({
        attributes: ['user_type', [fn('COUNT', col('User.id')), 'count']],
        group: ['user_type'],
      }),
      User.findAll({
        /* col() va calificado con el NOMBRE DEL MODELO ("User.id"), no con el
           nombre de la tabla: Sequelize alinea la tabla principal como "User".
           Sin calificar, el "id" es ambiguo porque provinces tambien tiene id
           y el JOIN lo trae al SELECT. */
        attributes: ['province_id', [fn('COUNT', col('User.id')), 'count']],
        include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
        group: ['province_id', 'province.id', 'province.name'],
      }),
      /* Top 10 por consumo: permite detectar un hogaro con un consumo anomalo
         antes de que el propio usuario se de cuenta.
         Las columnas del include van tambien en el GROUP BY: Postgres exige
         que toda columna del SELECT no agregada aparezca ahi, y solo infiere
         la dependencia si se agrupa por la PK de la tabla incluida. */
      ConsumptionReading.findAll({
        attributes: [
          'user_id',
          [fn('SUM', literal('instant_watts / 1000.0')), 'total_kwh'],
        ],
        where: { reading_timestamp: { [Op.gte]: since } },
        group: ['user_id', 'user.id', 'user.name', 'user.email'],
        order: [[literal('total_kwh'), 'DESC']],
        limit: 10,
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      }),
    ]);

    res.json({
      totals: {
        users: totalUsers, active_users: activeUsers, admins: adminUsers,
        devices: totalDevices, online_devices: onlineDevices,
        categories: totalCategories, appliances: totalAppliances,
        tariffs: totalTariffs, provinces_with_tariffs: provincesWithTariffs,
        alerts: totalAlerts, unread_alerts: unreadAlerts,
        readings_30d: readings30d, readings_24h: readings24h,
        invoices: totalInvoices, predictions: totalPredictions,
        recommendations: totalRecommendations,
      },
      distribution: {
        by_type: byType,
        by_province: byProvince,
      },
      top_consumers: topConsumers,
    });
  } catch (error) {
    next(error);
  }
});

/* Historial de consumo de TODAS las cuentas a la vez, para detectar anomalias
   de plataforma. Limitado a 2000 filas para no arrastrar la base entera. */
router.get('/consumption', async (req, res, next) => {
  try {
    const { days = 7, province_id } = req.query;
    const windowDays = Math.min(90, Math.max(1, Number(days) || 7));
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const userWhere = {};
    if (province_id) userWhere.province_id = Number(province_id);

    const readings = await ConsumptionReading.findAll({
      where: { reading_timestamp: { [Op.gte]: since } },
      attributes: ['id', 'user_id', 'instant_watts', 'voltage', 'current', 'reading_timestamp', 'source'],
      order: [['reading_timestamp', 'DESC']],
      limit: 2000,
      include: [{
        model: User, as: 'user', attributes: ['id', 'name', 'email'],
        include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
        ...(Object.keys(userWhere).length ? { where: userWhere } : {}),
      }],
    });

    res.json({ readings, days: windowDays, truncated: readings.length === 2000 });
  } catch (error) {
    next(error);
  }
});

/* Series diarias agregadas por provincia: alimenta el grafico del panel. */
router.get('/consumption/by-province', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const windowDays = Math.min(90, Math.max(1, Number(days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    /* Se agrupa por usuario y dia, no solo por dia: la suma final por
       provincia se hace en JS, asi que alcanza con el desglose por cuenta.
       Las columnas de los includes van en el GROUP BY porque Postgres no
       puede inferir la dependencia al agrupar por una FK, no por la PK. */
    const rows = await ConsumptionReading.findAll({
      where: { reading_timestamp: { [Op.gte]: since } },
      attributes: [
        'user_id',
        [fn('DATE', col('reading_timestamp')), 'day'],
        [fn('SUM', literal('instant_watts / 1000.0')), 'kwh'],
      ],
      group: [
        'user_id',
        literal('DATE(reading_timestamp)'),
        'user.id', 'user.name',
        'user.province.id', 'user.province.name',
      ],
      order: [[literal('day'), 'ASC']],
      include: [{
        model: User, as: 'user', attributes: ['id', 'name'],
        include: [{ model: Province, as: 'province', attributes: ['id', 'name'] }],
      }],
    });

    /* Se agrega en JS para agrupar por NOMBRE de provincia: el SQL agruparia
       por province_id y habria que resolver el nombre aparte.
       row.get('kwh') y no row.kwh: 'kwh' es un atributo calculado por el
       GROUP BY, no una columna del modelo, asi que la instancia no tiene
       getter y el acceso directo por propiedad devuelve undefined. */
    const byProvince = {};
    for (const row of rows) {
      const provinceName = row.user?.province?.name || 'Sin provincia';
      byProvince[provinceName] = (byProvince[provinceName] || 0) + (Number(row.get('kwh')) || 0);
    }

    res.json({
      series: Object.entries(byProvince)
        .map(([province, kwh]) => ({ province, kwh: Math.round(kwh * 100) / 100 }))
        .sort((a, b) => b.kwh - a.kwh),
      days: windowDays,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts', async (req, res, next) => {
  try {
    const { severity, unread_only = 'false', limit = 50 } = req.query;
    const where = {};
    if (severity) where.severity = severity;
    if (unread_only === 'true') where.is_read = false;

    const alerts = await Alert.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: Math.min(200, Math.max(1, Number(limit) || 50)),
    });
    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

/* ================== 6. PARAMETROS DE IA ================== */

router.get('/ai-config', async (req, res, next) => {
  try {
    res.json(await aiConfigService.getWithMeta());
  } catch (error) {
    next(error);
  }
});

router.put('/ai-config', async (req, res, next) => {
  try {
    const result = await aiConfigService.updateConfig(req.body, req.user.id);
    if (result.error) return bad(res, 'Parametros invalidos', result.error);
    res.json({ config: result.config.toJSON ? result.config.toJSON() : result.config });
  } catch (error) {
    next(error);
  }
});

router.post('/ai-config/reset', async (req, res, next) => {
  try {
    const result = await aiConfigService.resetConfig(req.user.id);
    res.json({ config: result.config.toJSON ? result.config.toJSON() : result.config });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
