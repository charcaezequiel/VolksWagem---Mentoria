require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const { sequelize, User } = require('./models');
const errorHandler = require('./middleware/errorHandler');

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
const { checkThreshold, checkPeakDetection } = require('./services/alertService');

const app = express();
const server = http.createServer(app);

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
app.use(express.json());

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
    await sequelize.authenticate();
    console.log('Database connected.');

    await sequelize.sync({ force: false });
    console.log('Database synchronized.');

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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };
