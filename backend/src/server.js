require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const { sequelize, User } = require('./models');
const errorHandler = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/security');

const { getLang } = require('./utils/i18n');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const applianceRoutes = require('./routes/appliances');
const consumptionRoutes = require('./routes/consumption');
const invoiceRoutes = require('./routes/invoices');
const alertRoutes = require('./routes/alerts');
const tariffRoutes = require('./routes/tariffs');
const predictionRoutes = require('./routes/predictions');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const sensorRoutes = require('./routes/sensor');
const adminRoutes = require('./routes/admin');
const { checkThreshold, checkPeakDetection } = require('./services/alertService');
const { withRetry, explainDbError } = require('./config/env');

const app = express();
const server = http.createServer(app);

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('JWT_SECRET must be set and at least 32 characters in production.');
  process.exit(1);
}

app.disable('x-powered-by');

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: corsOrigins }));
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));

// Idioma activo del usuario (header Accept-Language enviado por el frontend)
app.use((req, res, next) => {
  req.lang = getLang(req);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/tariffs', tariffRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sensor', sensorRoutes);
/* El router de admin se autoprotege: aplica authenticateToken + requireAdmin
   a todas sus rutas internamente, asi que no puede quedar exposed por error. */
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

cron.schedule('0 * * * *', async () => {
  console.log('Running hourly alert checks...');
  try {
    const users = await User.findAll({ where: { is_active: true } });
    for (const user of users) {
      const thresholdAlert = await checkThreshold(user.id);
      const peakAlert = await checkPeakDetection(user.id);
      for (const alert of [thresholdAlert, peakAlert]) {
        if (alert && io) {
          io.to(`user-${user.id}`).emit('alert:new', { alert });
        }
      }
    }
    console.log('Alert checks completed.');
  } catch (error) {
    console.error('Error running alert checks:', error.message);
  }
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Reintenta solo errores de red transitorios (conexion inicial lenta,
    // pooler levantandose). Un password malo o un SSL mal configurado cortan
    // a la primera con el mensaje explicativo.
    await withRetry(() => sequelize.authenticate(), { attempts: 3, delayMs: 2000, label: 'db' });
    console.log('Database connected.');

    await withRetry(() => sequelize.sync({ force: false }), {
      attempts: 2,
      delayMs: 2000,
      label: 'db sync',
    });
    console.log('Database synchronized.');
  } catch (error) {
    console.error(explainDbError(error));
    console.error('  El servidor NO se inicia sin base de datos.');
    console.error('  Corregí la configuracion (o completa backend/.env) y volve a arrancar:  npm run dev\n');
    console.error('  Validacion rapida:  npm run db:check\n');
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    const nets = require('os').networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
    if (ips.length) {
      console.log(`Network access: ${ips.map((ip) => `http://${ip}:${PORT}`).join(' | ')}`);
    }
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error('');
      console.error(`  El puerto ${PORT} ya esta en uso.`);
      console.error('  Probablemente ya haya otro backend corriendo. Opciones:');
      console.error(`    - Detenelo:  Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
      console.error('    - O arranca este con otro puerto:  $env:PORT=3002; npm run dev');
      console.error('');
    } else {
      console.error(`\n  No se pudo escuchar en el puerto ${PORT}: ${error.message}\n`);
    }
    process.exit(1);
  });
};

startServer();

module.exports = { app, server, io };
