const express = require('express');
const router = express.Router();
const {
  getLatestReading,
  getSensorHistory,
  createSensorReading,
} = require('../controllers/sensorController');

// Routes mapped to /api/sensors
router.get('/latest', getLatestReading);
router.get('/history', getSensorHistory);
router.post('/', createSensorReading);

module.exports = router;
