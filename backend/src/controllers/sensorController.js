const { ConsumptionReading, Alert } = require('../models');
const { checkPeakDetection } = require('../services/alertService');

exports.addReading = async (req, res, next) => {
  try {
    const {
      instant_watts,
      accumulated_kwh_day,
      device_id,
      voltage,
      current,
      frequency,
      power_factor,
    } = req.body;

    const device = device_id ? req.device && req.device.id === device_id ? req.device : null : req.device;

    const reading = await ConsumptionReading.create({
      user_id: req.user.id,
      device_id: device ? device.id : null,
      instant_watts,
      accumulated_kwh_day,
      voltage: voltage != null ? voltage : null,
      current: current != null ? current : null,
      frequency: frequency != null ? frequency : null,
      power_factor: power_factor != null ? power_factor : null,
      source: 'sensor',
    });

    if (device) {
      await device.update({ last_seen_at: new Date() });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('reading:new', {
        reading,
        device_name: device ? device.name : null,
      });
    }

    try {
      const alert = await checkPeakDetection(req.user.id);
      if (alert && io) {
        io.to(`user-${req.user.id}`).emit('alert:new', { alert });
      }
    } catch (e) {
      console.warn('Peak detection error:', e.message);
    }

    res.status(201).json({ reading, device: device ? { id: device.id, name: device.name } : null });
  } catch (error) {
    next(error);
  }
};
