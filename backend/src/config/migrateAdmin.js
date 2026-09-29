require('dotenv').config();

const { sequelize, User, AiConfig } = require('../models');
const { DEFAULTS } = require('../services/aiConfigService');

/**
 * Migracion incremental e idempotente para el panel de administracion.
 *
 * Por que existe: sequelize.sync({ force: false }) crea tablas faltantes pero
 * NO agrega columnas a las que ya existen. Como `role` es una columna nueva de
 * `users`, en cualquier base ya montada sync la ignoraria en silencio y
 * requireAdmin fallaria con "column role does not exist" en cada request.
 *
 * A diferencia de `npm run db:migrate` (que hace sync({force:true}) y borra
 * todo), este script solo hace ADD COLUMN IF NOT EXISTS. Se puede correr
 * cuantas veces quieras sobre una base con datos.
 */

const steps = [];
const step = (name, fn) => steps.push({ name, fn });

step('Agregar columna users.role', async (queryInterface) => {
  // El enum de Postgres es un tipo, no una columna: se crea aparte y solo
  // si no existe, antes de intentar usarlo.
  await queryInterface.sequelize.query(
    `DO $$ BEGIN
       CREATE TYPE "enum_users_role" AS ENUM('user', 'admin');
     EXCEPTION WHEN duplicate_object THEN NULL;
     END $$;`
  );

  await queryInterface.sequelize.query(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "enum_users_role" NOT NULL DEFAULT 'user'`
  );
});

step('Permitir user_type nulo para que un admin no tenga rubro', async (queryInterface) => {
  /* user_type es el RUBRO ENERGETICO (residencial/comercial/industrial/
     agropecuario): describe a quien se le factura. Un administrador no es un
     cliente, asi que no tiene rubro ni provincia. Antes la columna era
     NOT NULL DEFAULT 'residencial', o sea que la base le imponia un rubro
     residencial a todo admin que se creara, por mas que la app no le
     mandara nada.

     Se saca el NOT NULL pero se DEJA el DEFAULT: el formulario de registro
     no manda user_type, asi que los clientes autocontenidos siguen
     tomando 'residencial' por defecto. El default solo aplica cuando la
     columna se omite del INSERT; un admin la manda en NULL explicito y
     queda en NULL. Asi la columna puede ser nula sin tocar el
     comportamiento de los clientes. */
  await queryInterface.sequelize.query(
    `ALTER TABLE "users" ALTER COLUMN "user_type" DROP NOT NULL`
  );
});

step('Limpiar datos de cliente de los administradores existentes', async () => {
  /* Los admins creados antes de esta migracion quedaron con provincia y
     rubro residencial porque createAdmin.js los seteaba. Se limpian para que
     el estado de la base coincida con el modelo.

     Solo se tocan las columnas de dominio del cliente. NO se toca is_active:
     desactivar al unico admin dejaria el sistema sin administracion. */
  /* User.update() devuelve [filasAfectadas, filas]. El primer elemento es el
     conteo; leer el segundo daria el array de filas y el "0" que reportaba
     antes. */
  const [n] = await User.update(
    { province_id: null, user_type: null, alert_threshold_kwh: null },
    { where: { role: 'admin' } }
  );
  console.log(n > 0
    ? `   ${n} administrador(es) quedaron sin provincia ni rubro.`
    : '   Ningun admin tenia datos de cliente cargados.');
});

step('Crear tabla ai_configs', async () => {
  // force:false la crea sola si falta, pero sync no corre garantizados en este
  // script, asi que se asegura de forma explicita.
  await AiConfig.sync();
});

step('Crear fila de configuracion de IA con los valores por defecto', async () => {
  const [row] = await AiConfig.findOrCreate({
    where: { singleton_id: 1 },
    defaults: { ...DEFAULTS },
  });
  console.log(`   ai_configs singleton ${row.singleton_id} listo (${row.model_version}).`);
});

step('Reportar administradores existentes', async () => {
  const admins = await User.findAll({
    where: { role: 'admin' },
    attributes: ['id', 'name', 'email'],
  });
  if (admins.length === 0) {
    console.log('   Todavia no hay ningun admin. Crear uno con:  npm run db:admin');
  } else {
    for (const a of admins) console.log(`   admin: ${a.name} <${a.email}>`);
  }
});

const run = async () => {
  const queryInterface = sequelize.getQueryInterface();
  console.log('Migracion del panel de administracion...\n');
  try {
    for (const { name, fn } of steps) {
      process.stdout.write(`-> ${name}\n`);
      await fn(queryInterface);
    }
    console.log('\nMigracion completada.');
    process.exit(0);
  } catch (error) {
    console.error('\nMigracion fallida:', error.message);
    process.exit(1);
  }
};

run();
