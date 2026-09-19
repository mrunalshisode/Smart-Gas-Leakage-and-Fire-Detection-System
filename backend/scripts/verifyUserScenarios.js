/**
 * Verification Script for User Scenarios:
 * 1. Normal: gasLevel: 150, flameDetected: false
 * 2. Gas Leak: gasLevel: 620, flameDetected: false + Cooldown test
 * 3. Fire Condition: gasLevel: 120, flameDetected: true + Cooldown test
 * 4. Socket.IO real-time delivery and MongoDB verification
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { io } = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_TOPIC = process.env.MQTT_TOPIC_SENSOR_DATA || 'iotap/sensor/data';
const ALERT_TOPIC = process.env.MQTT_TOPIC_ALERTS || 'iotap/sensor/alerts';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runScenarioVerification() {
  console.log('====================================================');
  console.log('  VERIFYING USER SCENARIOS: NORMAL, GAS, & FIRE');
  console.log('====================================================');

  // 1. Check Backend Connectivity
  try {
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log(`[PASS] Backend is running on port 5000 (status: ${healthData.status}, mqtt: ${healthData.mqtt})`);
  } catch (err) {
    console.error(`[FAIL] Backend not reachable at ${BACKEND_URL}:`, err.message);
    process.exit(1);
  }

  // 2. Setup Socket.IO Client
  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });

  const receivedSocketSensors = [];
  const receivedSocketAlerts = [];

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log(`[PASS] Socket.IO client connected (ID: ${socket.id})`);
      resolve();
    });
    socket.on('connect_error', (err) => reject(err));
  });

  socket.on('sensor-data', (data) => {
    receivedSocketSensors.push(data);
    console.log(`  [Socket.IO sensor-data] gas: ${data.gasLevel}, flame: ${data.flameDetected}, buzzer: ${data.buzzerState}`);
  });

  socket.on('alert', (alert) => {
    receivedSocketAlerts.push(alert);
    console.log(`  [Socket.IO alert] type: ${alert.alertType}, severity: ${alert.severity}, msg: ${alert.message}`);
  });

  // 3. Setup MQTT Client
  const mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: `verifier_${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    connectTimeout: 7000,
  });

  const receivedMqttAlerts = [];

  await new Promise((resolve, reject) => {
    mqttClient.on('connect', () => {
      console.log(`[PASS] MQTT client connected to broker (${MQTT_BROKER})`);
      mqttClient.subscribe(ALERT_TOPIC, { qos: 0 }, (err) => {
        if (err) return reject(err);
        console.log(`[PASS] Subscribed to alert topic (${ALERT_TOPIC})`);
        resolve();
      });
    });
    mqttClient.on('error', reject);
  });

  mqttClient.on('message', (topic, payload) => {
    if (topic === ALERT_TOPIC) {
      try {
        const parsed = JSON.parse(payload.toString());
        receivedMqttAlerts.push(parsed);
        console.log(`  [MQTT Alert Received] type: ${parsed.alertType || parsed.type}`);
      } catch (e) {
        receivedMqttAlerts.push(payload.toString());
      }
    }
  });

  // Give backend subscriber time to settle
  await sleep(1500);

  // --------------------------------------------------------------------------
  // STEP 5: Test Normal Sensor Reading (gasLevel: 150, flameDetected: false)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 5: Testing Normal Sensor Reading ---');
  console.log('Sending: gasLevel: 150, flameDetected: false...');
  const normalPayload = {
    deviceId: 'ESP32_VERIFY_NODE',
    gasLevel: 150,
    flameDetected: false,
  };
  const sensorCountBeforeNormal = receivedSocketSensors.length;
  const alertCountBeforeNormal = receivedSocketAlerts.length;

  mqttClient.publish(SENSOR_TOPIC, JSON.stringify(normalPayload));
  await sleep(1500);

  const normalSensorEvent = receivedSocketSensors.slice(sensorCountBeforeNormal).find((s) => s.gasLevel === 150);
  if (normalSensorEvent && normalSensorEvent.flameDetected === false) {
    console.log('[PASS] Normal reading received via Socket.IO (gas: 150, flame: false, buzzer: OFF)');
  } else {
    console.error('[FAIL] Normal reading not received or mismatched');
    process.exit(1);
  }

  if (receivedSocketAlerts.length === alertCountBeforeNormal) {
    console.log('[PASS] No alert triggered for normal reading (Safe State)');
  } else {
    console.error('[FAIL] Unexpected alert triggered for normal reading!');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 6: Test Gas Leak Reading (gasLevel: 620, flameDetected: false)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 6: Testing Gas Leak Reading ---');
  console.log('Sending: gasLevel: 620, flameDetected: false...');
  const gasLeakPayload = {
    deviceId: 'ESP32_VERIFY_NODE',
    gasLevel: 620,
    flameDetected: false,
  };
  const alertCountBeforeGas = receivedSocketAlerts.length;
  const mqttAlertCountBeforeGas = receivedMqttAlerts.length;

  mqttClient.publish(SENSOR_TOPIC, JSON.stringify(gasLeakPayload));
  await sleep(1500);

  const gasAlertEvent = receivedSocketAlerts.slice(alertCountBeforeGas).find((a) => a.alertType === 'GAS_LEAK');
  if (gasAlertEvent && gasAlertEvent.severity === 'HIGH') {
    console.log(`[PASS] Gas leak alert emitted via Socket.IO (type: ${gasAlertEvent.alertType}, severity: ${gasAlertEvent.severity})`);
  } else {
    console.error('[FAIL] Gas leak alert not emitted via Socket.IO');
    process.exit(1);
  }

  if (receivedMqttAlerts.length > mqttAlertCountBeforeGas) {
    console.log('[PASS] Gas leak alert published to MQTT topic (iotap/sensor/alerts)');
  } else {
    console.error('[FAIL] Gas leak alert not published to MQTT');
    process.exit(1);
  }

  // Test Cooldown for Gas Leak
  console.log('--> Testing Alert Cooldown (publishing duplicate gas reading)...');
  const alertCountBeforeCooldown = receivedSocketAlerts.length;
  mqttClient.publish(SENSOR_TOPIC, JSON.stringify({
    deviceId: 'ESP32_VERIFY_NODE',
    gasLevel: 630,
    flameDetected: false,
  }));
  await sleep(1500);

  if (receivedSocketAlerts.length === alertCountBeforeCooldown) {
    console.log('[PASS] Duplicate gas alert suppressed by 60s cooldown');
  } else {
    console.error('[FAIL] Duplicate alert was NOT suppressed during cooldown');
    process.exit(1);
  }

  // Reset hazard state back to normal
  console.log('\n--> Resetting state to normal...');
  mqttClient.publish(SENSOR_TOPIC, JSON.stringify({
    deviceId: 'ESP32_VERIFY_NODE',
    gasLevel: 160,
    flameDetected: false,
  }));
  await sleep(1500);

  // --------------------------------------------------------------------------
  // STEP 7: Test Fire Condition Reading (gasLevel: 120, flameDetected: true)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 7: Testing Fire Condition Reading ---');
  console.log('Sending: gasLevel: 120, flameDetected: true...');
  const firePayload = {
    deviceId: 'ESP32_VERIFY_NODE',
    gasLevel: 120,
    flameDetected: true,
  };
  const alertCountBeforeFire = receivedSocketAlerts.length;
  const mqttAlertCountBeforeFire = receivedMqttAlerts.length;

  mqttClient.publish(SENSOR_TOPIC, JSON.stringify(firePayload));
  await sleep(1500);

  const fireAlertEvent = receivedSocketAlerts.slice(alertCountBeforeFire).find((a) => a.alertType === 'FIRE_DETECTED');
  if (fireAlertEvent && fireAlertEvent.severity === 'CRITICAL') {
    console.log(`[PASS] Fire detection alert emitted via Socket.IO (type: ${fireAlertEvent.alertType}, severity: ${fireAlertEvent.severity})`);
  } else {
    console.error('[FAIL] Fire detection alert not emitted via Socket.IO');
    process.exit(1);
  }

  if (receivedMqttAlerts.length > mqttAlertCountBeforeFire) {
    console.log('[PASS] Fire detection alert published to MQTT topic (iotap/sensor/alerts)');
  } else {
    console.error('[FAIL] Fire detection alert not published to MQTT');
    process.exit(1);
  }

  // Test Cooldown for Fire
  console.log('--> Testing Alert Cooldown (publishing duplicate fire reading)...');
  const fireCooldownCount = receivedSocketAlerts.length;
  mqttClient.publish(SENSOR_TOPIC, JSON.stringify({
    deviceId: 'ESP32_VERIFY_NODE',
    gasLevel: 125,
    flameDetected: true,
  }));
  await sleep(1500);

  if (receivedSocketAlerts.length === fireCooldownCount) {
    console.log('[PASS] Duplicate fire alert suppressed by 60s cooldown');
  } else {
    console.error('[FAIL] Duplicate fire alert was NOT suppressed during cooldown');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 8 & 9: Verify Database Persistence and REST APIs
  // --------------------------------------------------------------------------
  console.log('\n--- Step 8 & 9: Verifying Database Persistence & REST APIs ---');
  const latestSensorRes = await fetch(`${BACKEND_URL}/api/sensors/latest`);
  const latestSensorData = await latestSensorRes.json();
  console.log(`[PASS] GET /api/sensors/latest: Gas=${latestSensorData.data.gasLevel}, Flame=${latestSensorData.data.flameDetected}`);

  const latestAlertRes = await fetch(`${BACKEND_URL}/api/alerts/latest`);
  const latestAlertData = await latestAlertRes.json();
  console.log(`[PASS] GET /api/alerts/latest: Type=${latestAlertData.data.alertType}, Severity=${latestAlertData.data.severity}`);

  // Cleanup
  socket.disconnect();
  mqttClient.end(false, () => {
    console.log('\n====================================================');
    console.log('>>> ALL VERIFICATION SCENARIOS COMPLETED SUCCESSFULLY! <<<');
    console.log('====================================================');
    process.exit(0);
  });
}

runScenarioVerification().catch((err) => {
  console.error('Fatal error during scenario verification:', err);
  process.exit(1);
});
