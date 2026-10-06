/**
 * Chequeo de configuracion del backend.
 *
 * Existe para que un .env incompleto o mal apuntado NUNCA termine en un stack
 * trace de Sequelize. Todo problema de configuracion se explica en lenguaje
 * claro (archivo, variable y como completarlo) y los errores de conexion se
 * traducen a una causa probable + solucion.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Cargamos SIEMPRE backend/.env aunque el proceso se lance desde la raiz del
// repo (npm scripts usan backend/ como cwd, pero `node backend/src/server.js`
// desde la raiz no). dotenv no pisa valores ya cargados.
const BACKEND_ENV_FILE = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(BACKEND_ENV_FILE)) {
  require('dotenv').config({ path: BACKEND_ENV_FILE });
}

// Variables minimas para poder conectarse a la base.
const REQUIRED_DB_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

// Hosts que significan "PostgreSQL en esta maquina".
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

function isLocalHost(host) {
  return LOCAL_HOSTS.includes(String(host || '').trim().toLowerCase());
}

// Marcadores tipicos de valores de plantilla que nadie reemplazo todavia.
const PLACEHOLDER_MARKERS = ['YOUR_', 'TU_', 'REPLACE_', 'YOUR-PASSWORD', 'EXAMPLE', 'EJEMPLO'];

const RULE = '─'.repeat(64);

function looksLikePlaceholder(value) {
  const raw = String(value).trim();
  if (!raw) return false;
  const upper = raw.toUpperCase();
  if (PLACEHOLDER_MARKERS.some((marker) => upper.includes(marker))) return true;
  return /^\[.+\]$/.test(raw); // [YOUR-PASSWORD]
}

/** Ruta real del .env que esta usando el proceso (para mostrar en los mensajes). */
function envFileLocation() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || path.resolve(__dirname, '..', '..', '.env');
}

/** Devuelve [{ name, reason }] con todo lo que impida conectarse. */
function collectEnvProblems(env = process.env) {
  const problems = [];
  // En local el password puede quedar vacio (pg_hba en "trust"): no lo exigimos.
  const required = isLocalHost(env.DB_HOST)
    ? ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER']
    : REQUIRED_DB_VARS;

  for (const name of required) {
    const value = env[name];
    if (value === undefined || String(value).trim() === '') {
      problems.push({ name, reason: 'falta o esta vacia' });
    } else if (looksLikePlaceholder(value)) {
      problems.push({ name, reason: `es una plantilla sin completar ("${String(value).trim()}")` });
    }
  }

  const port = env.DB_PORT;
  if (!problems.some((p) => p.name === 'DB_PORT') && !/^\d+$/.test(String(port).trim())) {
    problems.push({ name: 'DB_PORT', reason: `debe ser un numero, no "${port}"` });
  }

  return problems;
}

/** Avisos que no frenan el arranque pero conviene mirar. */
function collectEnvNotes(env = process.env) {
  const notes = [];
  const host = String(env.DB_HOST || '');

  if (isLocalHost(host)) {
    notes.push(
      'DB_HOST apunta a PostgreSQL local. Si queres usar Supabase, cambialo a ' +
        'DB_HOST=aws-0-us-west-2.pooler.supabase.com (el host db.*.supabase.co es IPv6-only y falla en muchas redes).'
    );
    if (!String(env.DB_PASSWORD || '').trim()) {
      notes.push('DB_PASSWORD vacio: valido solo si pg_hba.conf esta en "trust"; si te pide contrasena, completalo.');
    }
  }
  if (env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    notes.push(
      'DB_SSL_REJECT_UNAUTHORIZED=false: el trafico va cifrado pero no se valida el certificado ' +
        '(aceptable en desarrollo; en produccion usa DB_SSL_CA=certs/supabase-ca.crt).'
    );
  }
  if (!env.CORS_ORIGIN) {
    notes.push('CORS_ORIGIN vacio: el frontend en http://localhost:3000 no podra hablar con la API.');
  }

  return notes;
}

function printConfigProblems(problems, notes = []) {
  const file = envFileLocation();
  const lines = [
    '',
    RULE,
    '  CONFIGURACION DE BASE DE DATOS INCOMPLETA',
    `  Archivo: ${file}`,
    RULE,
    '',
    '  Hay variables que impiden conectarse:',
  ];

  for (const problem of problems) {
    lines.push(`    - ${problem.name}: ${problem.reason}`);
  }

  lines.push(
    '',
    '  Como solucionarlo:',
    '    1. Abrí el archivo de arriba y completa esos valores.',
    '       Supabase: Dashboard -> Project Settings -> Database -> Connection string (Session pooler)',
    '       (host aws-0-us-west-2.pooler.supabase.com, puerto 5432, database postgres,',
    '        user postgres.<project-ref> y la contrasena del panel).',
    '    2. Volve a arrancar:  npm run dev',
    '    3. Para validar sin arrancar todo:  npm run db:check',
    '',
    '  El servidor no arranca hasta que este archivo este completo: asi nunca mas',
    '  aparece un stack trace de conexion.',
    RULE,
    ''
  );

  console.error(lines.join('\n'));

  if (notes.length) {
    console.error('  Avisos:\n' + notes.map((n) => `    * ${n}`).join('\n') + '\n');
  }
}

/** Corta el proceso con el mensaje legible (sin stack). */
function abortOnBadConfig(env = process.env) {
  const problems = collectEnvProblems(env);
  if (problems.length) {
    printConfigProblems(problems, collectEnvNotes(env));
    process.exit(1);
  }
}

/** Recorre errores anidados (parent/original/AggregateError) y junta sus codes. */
function errorCodes(error) {
  const codes = new Set();
  const stack = [error];
  const seen = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    if (current.code) codes.add(current.code);
    if (Array.isArray(current.errors)) stack.push(...current.errors);
    if (current.parent) stack.push(current.parent);
    if (current.original) stack.push(current.original);
    if (current.cause) stack.push(current.cause);
  }

  return codes;
}

const ERROR_HINTS = {
  ECONNREFUSED: {
    title: 'Nadie esta escuchando en ese host:puerto',
    steps: [
      'Si usas Supabase: verificá que DB_HOST sea aws-0-us-west-2.pooler.supabase.com (pooler IPv4).',
      'Si usas PostgreSQL local: el servicio esta detenido -> Get-Service postgresql* y arrancalo.',
    ],
  },
  ENOTFOUND: {
    title: 'No se pudo resolver el hostname (DNS)',
    steps: [
      'Revisá que DB_HOST no tenga errores de tipeo ni espacios.',
      'db.*.supabase.co solo tiene registro AAAA (IPv6): usá el pooler aws-0-us-west-2.pooler.supabase.com.',
    ],
  },
  EAI_AGAIN: {
    title: 'Fallo transitorio de DNS',
    steps: ['Problema de red momentaneo: reintenta en unos segundos.'],
  },
  ETIMEDOUT: {
    title: 'La conexion no obtuvo respuesta a tiempo',
    steps: [
      'Firewall o red bloqueando el puerto 5432.',
      'Si es Supabase, probá el Session Pooler (puerto 5432) en lugar del Transaction Pooler (6543).',
    ],
  },
  EHOSTUNREACH: { title: 'Host inalcanzable', steps: ['Revisá tu red / VPN / firewall saliente.'] },
  ENETUNREACH: { title: 'Red inalcanzable', steps: ['Revisá tu conexion a Internet.'] },
  ECONNRESET: { title: 'La conexion fue cortada', steps: ['Reintenta; si persiste, revisá estabilidad de la red.'] },
  '28P01': {
    title: 'Autenticacion rechazada: usuario o contrasena incorrectos',
    steps: [
      'DB_PASSWORD debe ser la contrasena del usuario de la base (no la del panel de Supabase si la rotaste).',
      'Copiala desde Supabase -> Connect -> Connection string -> Session pooler.',
    ],
  },
  '28000': { title: 'Acceso no autorizado', steps: ['Revisá DB_USER y permisos del rol.'] },
  '3D000': { title: 'La base de datos no existe', steps: ['DB_NAME debe ser "postgres" en Supabase.'] },
  '53300': { title: 'Demasiadas conexiones abiertas', steps: ['Cerrá procesos viejos o subí max_connections.'] },
  '53400': { title: 'Configuracion excede limites del servidor', steps: ['Revisá los parametros de conexion.'] },
  SELF_SIGNED_CERT_IN_CHAIN: {
    title: 'El certificado TLS del servidor no es de confianza',
    steps: [
      'Supabase: DB_SSL_REJECT_UNAUTHORIZED=false (solo desarrollo) o DB_SSL_CA=certs/supabase-ca.crt.',
    ],
  },
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: {
    title: 'No se pudo verificar el certificado TLS',
    steps: ['Configurá DB_SSL_CA o DB_SSL_REJECT_UNAUTHORIZED=false en desarrollo.'],
  },
  DEPTH_ZERO_SELF_SIGNED_CERT: {
    title: 'Certificado autofirmado',
    steps: ['Configurá DB_SSL_CA o DB_SSL_REJECT_UNAUTHORIZED=false en desarrollo.'],
  },
  CERT_HAS_EXPIRED: { title: 'Certificado TLS vencido', steps: ['Actualizá el CA en certs/.'] },
};

/** Traduce un error de Sequelize/pg a un mensaje accionable (sin stack). */
function explainDbError(error, env = process.env) {
  const codes = errorCodes(error);
  const hintKey = Object.keys(ERROR_HINTS).find((key) => codes.has(key));
  const hint = hintKey ? ERROR_HINTS[hintKey] : null;
  const host = `${env.DB_HOST || '?'}:${env.DB_PORT || '?'}`;
  const lines = ['', RULE, '  NO SE PUDO CONECTAR A LA BASE DE DATOS', RULE, ''];

  if (hint) {
    lines.push(`  Causa probable: ${hint.title}`, `  (${[...codes].join(' / ')})`, '', '  Pasos:');
    hint.steps.forEach((step, i) => lines.push(`    ${i + 1}. ${step}`));
  } else {
    lines.push(`  Error: ${error.message}`, '', '  Pasos:');
    lines.push('    1. Revisá backend/.env (npm run db:check valida la configuracion).');
    lines.push('    2. Si sigue, compartí este mensaje completo.');
  }

  lines.push(
    '',
    `  Destino intentado: ${host}`,
    `  Archivo de config: ${envFileLocation()}`,
    RULE,
    ''
  );

  return lines.join('\n');
}

const RETRYABLE_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ECONNRESET',
  'EPIPE',
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ejecuta `fn` reintentando errores de red transitorios.
 * Los errores de autenticacion / SSL / configuracion NO se reintentan:
 * repetirlos solo tarda y ensucia la salida.
 */
async function withRetry(fn, { attempts = 3, delayMs = 2000, label = 'conexion' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const retryable = [...errorCodes(error)].some((code) => RETRYABLE_CODES.has(code));
      if (!retryable || attempt === attempts) break;
      console.warn(`[db] ${label}: intento ${attempt}/${attempts} fallo, reintentando en ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

module.exports = {
  LOCAL_HOSTS,
  REQUIRED_DB_VARS,
  abortOnBadConfig,
  collectEnvNotes,
  collectEnvProblems,
  envFileLocation,
  errorCodes,
  explainDbError,
  isLocalHost,
  looksLikePlaceholder,
  printConfigProblems,
  withRetry,
};
