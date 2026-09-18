const SensorLog = require('../models/SensorLog');
const { getIO } = require('../config/socket');

// GET /api/sensors/latest
// Fetch the most recent sensor reading
const getLatestReading = async (req, res) => {
  try {
    const latest = await SensorLog.findOne().sort({ timestamp: -1 });
    if (!latest) {
      return res.status(200).json({
        success: true,
        message: 'No sensor logs recorded yet',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: latest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve latest sensor reading',
      error: error.message,
    });
  }
};

// GET /api/sensors/history
// Fetch recent historical readings (optional ?limit=50)
const getSensorHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = await SensorLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sensor history',
      error: error.message,
    });
  }
};

// POST /api/sensors
// Optional endpoint to manually log a sensor reading for testing/development
const createSensorReading = async (req, res) => {
  try {
    const { deviceId, gasLevel, flameDetected, gasAlert, fireAlert } = req.body;

    if (gasLevel === undefined || gasLevel === null) {
      return res.status(400).json({
        success: false,
        message: 'gasLevel is required',
      });
    }

    const numericGas = Number(gasLevel);
    const isFlame = Boolean(flameDetected);
    const gasThreshold = Number(process.env.GAS_THRESHOLD_PPM) || 400;
    const isGasAlert = gasAlert !== undefined ? Boolean(gasAlert) : numericGas >= gasThreshold;
    const isFireAlert = fireAlert !== undefined ? Boolean(fireAlert) : isFlame;

    const newReading = await SensorLog.create({
      deviceId: deviceId || 'ESP32_MANUAL',
      gasLevel: numericGas,
      flameDetected: isFlame,
      gasAlert: isGasAlert,
      fireAlert: isFireAlert,
      timestamp: new Date(),
    });

    // Broadcast via Socket.IO
    try {
      const io = getIO();
      io.emit('sensor-data', newReading);
    } catch (socketErr) {
      // Socket not ready or ignored
    }

    return res.status(201).json({
      success: true,
      data: newReading,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record sensor reading',
      error: error.message,
    });
  }
};

module.exports = {
  getLatestReading,
  getSensorHistory,
  createSensorReading,
};
