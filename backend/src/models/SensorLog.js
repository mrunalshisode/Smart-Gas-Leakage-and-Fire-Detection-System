const mongoose = require('mongoose');

const sensorLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      default: 'ESP32_NODE_01',
    },
    // Raw gas sensor reading (analog ADC value e.g. 0-4095 or PPM)
    gasLevel: {
      type: Number,
      required: [true, 'Gas sensor reading is required'],
      min: [0, 'Gas level must be a non-negative value'],
    },
    // Flame detection boolean flag from infrared/flame sensor
    flameDetected: {
      type: Boolean,
      required: [true, 'Flame detection state is required'],
      default: false,
    },
    // Gas alert status flag (true when gas exceeds safety threshold)
    gasAlert: {
      type: Boolean,
      required: true,
      default: false,
    },
    // Fire alert status flag (true when flame is detected)
    fireAlert: {
      type: Boolean,
      required: true,
      default: false,
    },
    // Timestamp for time-series queries and chronological charting
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SensorLog', sensorLogSchema);
