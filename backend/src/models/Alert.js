const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      default: 'ESP32_NODE_01',
    },
    alertType: {
      type: String,
      required: true,
      enum: ['GAS_LEAK', 'FIRE_DETECTED', 'COMBINED_HAZARD'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH',
    },
    gasLevel: {
      type: Number,
      required: false,
    },
    flameDetected: {
      type: Boolean,
      required: false,
      default: false,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
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

module.exports = mongoose.model('Alert', alertSchema);
