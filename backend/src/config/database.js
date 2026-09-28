const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
require('dotenv').config();

const isCloudDB = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost');
if (isCloudDB) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

// Raiz del proyecto backend (este archivo vive en backend/src/config/)
const projectRoot = path.resolve(__dirname, '..', '..');

// Busca el CA en: ruta absoluta, cwd, y por ultimo relativa a la raiz del backend.
// Devuelve { pem } si es un PEM en linea, o null si no se pudo resolver.
function resolveCert(certValue) {
  const candidates = [
    certValue,
    path.resolve(process.cwd(), certValue),
    path.resolve(projectRoot, certValue),
  ];
  const file = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (file) return { file, pem: fs.readFileSync(file, 'utf8') };
  if (certValue.includes('-----BEGIN CERTIFICATE-----')) return { pem: certValue };
  return null;
}

const sslConfig = (() => {
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED
    ? process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    : true;
  const ssl = { require: true, rejectUnauthorized };

  if (process.env.DB_SSL_CA) {
    const cert = resolveCert(process.env.DB_SSL_CA);
    if (!cert) {
      // Fallar aqui evita arrancar con una config de SSL que nadie revisa.
      throw new Error(
        `DB_SSL_CA no se pudo resolver: "${process.env.DB_SSL_CA}". ` +
          `Rutas probadas relativas a ${projectRoot}. Verifica que el archivo exista.`
      );
    }
    ssl.ca = cert.pem;
  } else if (isCloudDB && !rejectUnauthorized) {
    console.warn(
      '[db] DB_SSL_REJECT_UNAUTHORIZED=false: el trafico va cifrado pero el certificado ' +
        'del servidor no se valida. Aceptable en desarrollo; en produccion configura ' +
        'DB_SSL_CA con el CA del proveedor.'
    );
  }

  return ssl;
})();

const baseOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
    keepAlive: true,
    connectionTimeoutMillis: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
};

const sequelize = isCloudDB
  ? new Sequelize(
      process.env.DB_HOST.includes('://')
        ? process.env.DB_HOST
        : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      {
        ...baseOptions,
        dialectOptions: {
          ssl: sslConfig,
        },
      }
    )
  : new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      ...baseOptions,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    }
  );

module.exports = sequelize;
