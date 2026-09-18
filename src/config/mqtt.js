const mqtt = require('mqtt');
const SensorLog = require('../models/SensorLog');
const Alert = require('../models/Alert');
const { getIO } = require('./socket');
const { shouldTriggerAlert } = require('../services/alertManager');

let client = null;

const initMQTT = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
  const sensorTopic = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
  const alertTopic = process.env.MQTT_TOPIC_ALERT || 'iotap/sensor/alerts';
  const gasThreshold = Number(process.env.GAS_THRESHOLD_PPM) || 400;

  console.log(`[MQTT] Connecting to broker at ${brokerUrl}...`);
  client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log(`[MQTT] Successfully connected to broker: ${brokerUrl}`);
    client.subscribe(sensorTopic, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to topic ${sensorTopic}:`, err.message);
      } else {
        console.log(`[MQTT] Subscribed to topic: ${sensorTopic}`);
      }
    });
  });

  client.on('error', (err) => {
    console.error(`[MQTT] Connection error: ${err.message}`);
  });

  client.on('message', async (topic, message) => {
    if (topic !== sensorTopic) return;

    try {
      const payload = JSON.parse(message.toString());
      const {
        deviceId = 'ESP32_NODE_01',
        gasLevel = 0,
        flameDetected = false,
      } = payload;

      const numericGasLevel = Number(gasLevel);
      const isFlameDetected = Boolean(flameDetected);
      const isGasAlert = payload.gasAlert !== undefined ? Boolean(payload.gasAlert) : numericGasLevel >= gasThreshold;
      const isFireAlert = payload.fireAlert !== undefined ? Boolean(payload.fireAlert) : isFlameDetected;

      // 1. Persist sensor telemetry to MongoDB
      let savedLog = null;
      try {
        savedLog = await SensorLog.create({
          deviceId,
          gasLevel: numericGasLevel,
          flameDetected: isFlameDetected,
          gasAlert: isGasAlert,
          fireAlert: isFireAlert,
          timestamp: new Date(),
        });
      } catch (dbError) {
        console.error('[MQTT/DB] Failed to save sensor log to database:', dbError.message);
      }

      const telemetryData = savedLog
        ? savedLog.toObject()
        : { deviceId, gasLevel: numericGasLevel, flameDetected: isFlameDetected, gasAlert: isGasAlert, fireAlert: isFireAlert, timestamp: new Date() };

      // 2. Broadcast sensor reading to real-time clients via Socket.IO
      try {
        const io = getIO();
        io.emit('sensor-data', telemetryData);
      } catch (socketErr) {
        // Socket.IO not yet initialized or no listeners
      }

      // 3. Evaluate safety hazard conditions & alert deduplication
      const isGasBreach = numericGasLevel >= gasThreshold;
      const isHazardous = isGasBreach || isFlameDetected;

      let alertType = 'GAS_LEAK';
      let severity = 'HIGH';
      let messageText = `Gas leak warning! Gas level (${numericGasLevel} PPM) exceeded threshold (${gasThreshold} PPM).`;

      if (isGasBreach && isFlameDetected) {
        alertType = 'COMBINED_HAZARD';
        severity = 'CRITICAL';
        messageText = `CRITICAL: Both gas leak (${numericGasLevel} PPM) and fire detected simultaneously!`;
      } else if (isFlameDetected) {
        alertType = 'FIRE_DETECTED';
        severity = 'CRITICAL';
        messageText = 'CRITICAL: Flame detected in monitored zone!';
      }

      // Check whether this device/alertType should trigger or be suppressed by cooldown
      const allowAlert = shouldTriggerAlert(deviceId, alertType, isHazardous);

      if (allowAlert) {
        let savedAlert = null;
        try {
          savedAlert = await Alert.create({
            deviceId,
            alertType,
            severity,
            gasLevel: numericGasLevel,
            flameDetected: isFlameDetected,
            message: messageText,
            timestamp: new Date(),
          });
        } catch (alertDbErr) {
          console.error('[MQTT/DB] Failed to save alert to database:', alertDbErr.message);
        }

        const alertData = savedAlert
          ? savedAlert.toObject()
          : { deviceId, alertType, severity, gasLevel: numericGasLevel, flameDetected: isFlameDetected, message: messageText, timestamp: new Date() };

        // Real-time broadcast for urgent alerts
        try {
          const io = getIO();
          io.emit('alert', alertData);
        } catch (socketErr) {
          // Socket.IO error ignored
        }

        // Publish alert back to MQTT topic for ESP32 actuators / buzzers
        if (client && client.connected) {
          client.publish(alertTopic, JSON.stringify(alertData));
        }

        console.warn(`[HAZARD ALERT] ${alertType} - Severity: ${severity} - ${messageText}`);
      }
    } catch (parseError) {
      console.error('[MQTT] Failed to parse incoming JSON payload:', parseError.message);
    }
  });

  return client;
};

const getMQTTClient = () => client;

module.exports = {
  initMQTT,
  getMQTTClient,
};
