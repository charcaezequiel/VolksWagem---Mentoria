require('dotenv').config();

const readline = require('readline');
const { sequelize, User } = require('../src/models');
const { PASSWORD_POLICY } = require('../src/validators/authValidators');

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
  if (!password) password = await ask(rl, 'Password: ');

  rl.close();

  if (!email || !name || !password) {
    console.error('Faltan datos obligatorios.');
    process.exit(1);
  }
  /* Misma politica que el registro publico y que el alta desde el panel. Si
     el admin es la cuenta mas poderosa del sistema, es absurdo que su
     contrasena tenga reglas mas laxas que las de un cliente. */
  if (password.length < PASSWORD_POLICY.minLength || password.length > PASSWORD_POLICY.maxLength) {
    console.error(`La contrasena debe tener entre ${PASSWORD_POLICY.minLength} y ${PASSWORD_POLICY.maxLength} caracteres.`);
    process.exit(1);
  }
  if (!PASSWORD_POLICY.regex.test(password)) {
    console.error('La contrasena debe incluir mayuscula, minuscula, numero y simbolo.');
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
    await existing.update({ role: 'admin', province_id: null, user_type: null, alert_threshold_kwh: null });
    console.log(`${email} (${existing.name}) fue promovido a admin.`);
    console.log('Su contrasena no se modifico.');
    await sequelize.close();
    process.exit(0);
  }

  // Se crea sin provincia, sin rubro y sin umbral: un admin administra esas
  // cosas, no las tiene. La columna user_type acepta NULL justamente para
  // esto; antes quedaba con rubro residencial porque el default se la imponia.

  // El hook beforeCreate del modelo hashea password_hash.
  await User.create({
    name,
    email,
    password_hash: password,
    province_id: null,
    user_type: null,
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
