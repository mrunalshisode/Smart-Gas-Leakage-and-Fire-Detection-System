const mqtt = require('mqtt');
const { io } = require('socket.io-client');
const dotenv = require('dotenv');

dotenv.config();

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_TOPIC = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
const SERVER_URL = `http://localhost:${process.env.PORT || 5000}`;

console.log('====================================================');
console.log(' Starting End-to-End Test: MQTT -> Backend -> Socket.IO');
console.log(` MQTT Broker : ${BROKER_URL}`);
console.log(` Topic       : ${SENSOR_TOPIC}`);
console.log(` Socket Server: ${SERVER_URL}`);
console.log('====================================================');

// 1. Connect Socket.IO client
const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

let receivedSocketEvent = false;

socket.on('connect', () => {
  console.log(`[1/3] Socket.IO test client connected. ID: ${socket.id}`);

  // 2. Connect MQTT publisher to simulate ESP32
  console.log('[2/3] Connecting MQTT test publisher to broker...');
  const mqttClient = mqtt.connect(BROKER_URL);

  mqttClient.on('connect', () => {
    console.log('[2/3] MQTT publisher connected. Publishing sensor telemetry...');
    const testPayload = {
      deviceId: 'ESP32_LIVE_VERIFY',
      gasLevel: 550,
      flameDetected: false,
    };

    mqttClient.publish(SENSOR_TOPIC, JSON.stringify(testPayload), { qos: 0 }, (err) => {
      if (err) {
        console.error('Failed to publish MQTT message:', err.message);
      } else {
        console.log('[2/3] Published telemetry over MQTT successfully:', testPayload);
      }
      mqttClient.end();
    });
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT publisher error:', err.message);
  });
});

// 3. Listen for Socket.IO event emitted by backend
socket.on('sensor-data', (data) => {
  if (data.deviceId === 'ESP32_LIVE_VERIFY') {
    console.log('[3/3] Received "sensor-data" Socket.IO event from backend!');
    console.log('      Device ID   :', data.deviceId);
    console.log('      Gas Level   :', data.gasLevel);
    console.log('      Flame State :', data.flameDetected);
    console.log('      Gas Alert   :', data.gasAlert);
    console.log('      Fire Alert  :', data.fireAlert);
    console.log('      MongoDB ID  :', data._id);
    receivedSocketEvent = true;

    console.log('====================================================');
    console.log(' SUCCESS: MQTT reading triggered real-time Socket.IO event!');
    console.log('====================================================');

    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 500);
  }
});

socket.on('alert', (alertData) => {
  if (alertData.deviceId === 'ESP32_LIVE_VERIFY') {
    console.log('[Socket Alert Event]', alertData.alertType, alertData.severity, alertData.message);
  }
});

// Timeout fallback
setTimeout(() => {
  if (!receivedSocketEvent) {
    console.error('Test timeout: Did not receive Socket.IO event in time.');
    socket.disconnect();
    process.exit(1);
  }
}, 8000);
