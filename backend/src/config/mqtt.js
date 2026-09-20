const mqtt = require('mqtt');
const SensorLog = require('../models/SensorLog');
const Alert = require('../models/Alert');
const { getIO } = require('./socket');
const { shouldTriggerAlert } = require('../services/alertManager');

let client = null;

/**
 * Initializes the MQTT client with resilient reconnection, payload validation,
 * database persistence, Socket.IO real-time emission, and alert publishing.
 */
const initMQTT = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
  const sensorTopic = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
  const alertTopic = process.env.MQTT_TOPIC_ALERT || 'iotap/sensor/alerts';
  const gasThreshold = Number(process.env.GAS_THRESHOLD_PPM) || 400;

  // Generate unique backend client identifier to avoid broker session collisions
  const clientId = `iotap_backend_${Math.random().toString(16).substring(2, 8)}`;

  const options = {
    clientId,
    clean: true,
    reconnectPeriod: 2000, // Reconnect every 2s on disconnection
    connectTimeout: 30000, // 30s timeout
  };

  console.log(`[MQTT] Connecting to broker at ${brokerUrl} (Client ID: ${clientId})...`);
  client = mqtt.connect(brokerUrl, options);

  // Connection event handler
  client.on('connect', () => {
    console.log(`[MQTT] Successfully connected to broker: ${brokerUrl}`);
    client.subscribe(sensorTopic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to topic "${sensorTopic}":`, err.message);
      } else {
        console.log(`[MQTT] Subscribed to sensor telemetry topic: "${sensorTopic}"`);
      }
    });
  });

  // Reconnection and lifecycle handlers for complete operational visibility
  client.on('reconnect', () => {
    console.log('[MQTT] Attempting to reconnect to broker...');
  });

  client.on('offline', () => {
    console.warn('[MQTT] Client is currently offline.');
  });

  client.on('close', () => {
    console.log('[MQTT] Connection closed.');
  });

  client.on('error', (err) => {
    console.error(`[MQTT] Connection error: ${err.message}`);
  });

  // Message handler for incoming sensor telemetry
  client.on('message', async (topic, message) => {
    if (topic !== sensorTopic) return;

    try {
      let rawPayload;
      try {
        rawPayload = JSON.parse(message.toString());
      } catch (parseError) {
        console.error('[MQTT] Rejected malformed JSON payload:', parseError.message);
        return;
      }

      // 1. Defensively validate that payload is a non-null object (not array or primitive)
      if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
        console.error('[MQTT] Rejected invalid payload format: must be a JSON object.');
        return;
      }

      // 2. Extract and validate deviceId
      const rawDeviceId = typeof rawPayload.deviceId === 'string' ? rawPayload.deviceId.trim() : '';
      const deviceId = rawDeviceId.length > 0 ? rawDeviceId : 'ESP32_NODE_01';

      // 3. Validate gasLevel: support both gasLevel and gasValue from ESP32 hardware
      const rawGas =
        rawPayload.gasLevel !== undefined && rawPayload.gasLevel !== null
          ? rawPayload.gasLevel
          : rawPayload.gasValue;

      if (rawGas === undefined || rawGas === null) {
        console.error(`[MQTT] Rejected payload from ${deviceId}: missing required field "gasLevel" or "gasValue".`);
        return;
      }

      const numericGasLevel = Number(rawGas);
      if (isNaN(numericGasLevel) || numericGasLevel < 0) {
        console.error(`[MQTT] Rejected payload from ${deviceId}: invalid gas level (${rawGas}). Must be a non-negative number.`);
        return;
      }

      // 4. Normalize flameDetected: robustly support boolean, numeric (1/0), and string values from ESP32
      const isFlameDetected =
        rawPayload.flameDetected === true ||
        rawPayload.flameDetected === 1 ||
        rawPayload.flameDetected === 'true' ||
        rawPayload.flameDetected === '1';

      // Compute or accept explicit alert flags
      const isGasAlert = rawPayload.gasAlert !== undefined ? Boolean(rawPayload.gasAlert) : numericGasLevel >= gasThreshold;
      const isFireAlert = rawPayload.fireAlert !== undefined ? Boolean(rawPayload.fireAlert) : isFlameDetected;

      // 5. Persist sensor telemetry to MongoDB
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

      const baseTelemetry = savedLog
        ? savedLog.toObject()
        : {
            deviceId,
            gasLevel: numericGasLevel,
            flameDetected: isFlameDetected,
            gasAlert: isGasAlert,
            fireAlert: isFireAlert,
            timestamp: new Date(),
          };

      const telemetryData = {
        ...baseTelemetry,
        gasValue: numericGasLevel, // include alias for frontend
      };

      // 6. Broadcast sensor reading to real-time clients via Socket.IO
      try {
        const io = getIO();
        io.emit('sensor-data', telemetryData);
      } catch (socketErr) {
        // Socket.IO not yet initialized or no listeners
      }

      // 7. Evaluate safety hazard conditions & alert deduplication
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
          : {
              deviceId,
              alertType,
              severity,
              gasLevel: numericGasLevel,
              flameDetected: isFlameDetected,
              message: messageText,
              timestamp: new Date(),
            };

        // Real-time broadcast for urgent alerts
        try {
          const io = getIO();
          io.emit('alert', alertData);
        } catch (socketErr) {
          // Socket.IO error ignored
        }

        // Publish alert back to MQTT topic for ESP32 actuators / buzzers
        if (client && client.connected) {
          client.publish(alertTopic, JSON.stringify(alertData), { qos: 0 }, (pubErr) => {
            if (pubErr) {
              console.error(`[MQTT] Failed to publish alert to ${alertTopic}:`, pubErr.message);
            } else {
              console.log(`[MQTT] Published hazard alert to ${alertTopic}: [${alertType}]`);
            }
          });
        }

        console.warn(`[HAZARD ALERT] ${alertType} - Severity: ${severity} - ${messageText}`);
      }
    } catch (err) {
      console.error('[MQTT] Unexpected error processing sensor message:', err.message);
    }
  });

  return client;
};

const getMQTTClient = () => client;

const closeMQTT = () => {
  if (client) {
    console.log('[MQTT] Closing MQTT connection...');
    client.end(true);
    client = null;
  }
};

module.exports = {
  initMQTT,
  getMQTTClient,
  closeMQTT,
};
