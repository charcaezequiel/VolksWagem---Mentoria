require('dotenv').config();

const readline = require('readline');
const { sequelize, User, Province } = require('../src/models');

/**
 * Crea un administrador, o lepromueve el rol a uno existente.
 *
 * El panel de admin se abre solo con role === 'admin', y a un usuario normal
 * no hay forma de ascenderse desde la UI (a proposito: si el endpoint de
 * auto-promocio existiera, cualquiera con una cuenta seria admin). Por eso el
 * primer admin se crea por consola.
 *
 *   node seeds/createAdmin.js
 */

const ask = (rl, question) =>
  new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));

const run = async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const args = process.argv.slice(2);
  let email = args[0];
  let name = args[1];
  let password = args[2];

  if (!email) email = await ask(rl, 'Email del admin: ');
  if (!name) name = await ask(rl, 'Nombre: ');
  if (!password) password = await ask(rl, 'Password (min 8 caracteres): ');

  rl.close();

  if (!email || !name || !password) {
    console.error('Faltan datos obligatorios.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contrasena debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const existing = await User.findOne({ where: { email } });

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`${email} ya es admin. No hay nada que hacer.`);
      await sequelize.close();
      process.exit(0);
    }
    // No se cambia la contrasena: podria ser la que el usuario ya usa.
    await existing.update({ role: 'admin' });
    console.log(`${email} ({existing.name}) fue promovido a admin.`);
    console.log('Su contrasena no se modifico.');
    await sequelize.close();
    process.exit(0);
  }

  const provinces = await Province.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
  const defaultProvince = provinces.length ? provinces[0].id : null;

  // El hook beforeCreate del modelo hashea password_hash.
  await User.create({
    name,
    email,
    password_hash: password,
    province_id: defaultProvince,
    user_type: 'residencial',
    role: 'admin',
  });

  console.log(`Admin creado: ${name} <${email}>`);
  await sequelize.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error('Error:', error.message);
  await sequelize.close();
  process.exit(1);
});
