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
