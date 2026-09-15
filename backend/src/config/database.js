const { Sequelize } = require('sequelize');
const fs = require('fs');
const dns = require('dns');
require('dotenv').config();

const isCloudDB = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost');
if (isCloudDB) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const sslConfig = (() => {
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED
    ? process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    : true;
  const ssl = { require: true, rejectUnauthorized };
  if (process.env.DB_SSL_CA) {
    try {
      ssl.ca = fs.readFileSync(process.env.DB_SSL_CA);
    } catch (err) {
      ssl.ca = process.env.DB_SSL_CA;
    }
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
