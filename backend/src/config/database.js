const { Sequelize } = require('sequelize');
const dns = require('dns');
require('dotenv').config();

const isCloudDB = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost');
if (isCloudDB) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const _origLookup = dns.lookup.bind(dns);
  dns.setServers(['8.8.8.8']);
  dns.lookup = (hostname, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    dns.resolve4(hostname, (e4, addrs) => {
      if (!e4 && addrs && addrs.length) return cb(null, addrs[0], 4);
      dns.resolve6(hostname, (e6, addrs6) => {
        if (!e6 && addrs6 && addrs6.length) return cb(null, addrs6[0], 6);
        _origLookup(hostname, opts, cb);
      });
    });
  };
}

const sequelize = isCloudDB
  ? new Sequelize(process.env.DB_HOST.includes('://')
      ? process.env.DB_HOST
      : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      define: {
        timestamps: true,
        underscored: true,
      },
    })
  : new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
      },
    }
  );

module.exports = sequelize;
