#!/usr/bin/env node
/**
 * npm run db:check
 *
 * Valida la configuracion y prueba la conexion contra la base SIN arrancar el
 * servidor. Sirve para verificar credenciales/host en segundos y para obtener
 * un mensaje claro cuando algo falla.
 */
require('dotenv').config();

const {
  collectEnvNotes,
  collectEnvProblems,
  explainDbError,
  printConfigProblems,
  withRetry,
} = require('./env');

(async () => {
  const problems = collectEnvProblems();
  if (problems.length) {
    printConfigProblems(problems, collectEnvNotes());
    process.exit(1);
  }

  const notes = collectEnvNotes();
  if (notes.length) {
    console.log('\nAvisos:\n' + notes.map((note) => `  * ${note}`).join('\n') + '\n');
  }

  const target = `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  console.log(`Probando conexion a ${target} (usuario ${process.env.DB_USER})...`);

  try {
    const sequelize = require('./database');
    const startedAt = Date.now();
    await withRetry(() => sequelize.authenticate(), { attempts: 3, delayMs: 2000, label: 'db:check' });
    console.log(`OK: conexion establecida en ${Date.now() - startedAt}ms.`);

    const [rows] = await sequelize.query(
      "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const tableCount = rows[0].tables;

    console.log(`Tablas en el esquema public: ${tableCount}`);
    if (tableCount === 0) {
      console.log('La base esta vacia: crea tablas y datos de ejemplo con  npm run db:reset');
    } else {
      console.log('Base lista. Arranca el backend con  npm run dev');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error(explainDbError(error));
    process.exit(1);
  }
})();
