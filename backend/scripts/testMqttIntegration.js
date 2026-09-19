const mqtt = require('mqtt');
const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');

dotenv.config();

const PORT = process.env.PORT || 5000;
const SERVER_URL = `http://localhost:${PORT}`;
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_TOPIC = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
const ALERT_TOPIC = process.env.MQTT_TOPIC_ALERT || 'iotap/sensor/alerts';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let serverProcess = null;
let spawnedServer = false;

// Check if server is running; spawn if not
async function ensureServerRunning() {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`);
    if (res.status === 200) {
      const json = await res.json();
      console.log(`[Test Setup] Backend server is already running at ${SERVER_URL} (MQTT: ${json.mqtt || 'unknown'})`);
      if (json.mqtt !== 'connected') {
        console.log('[Test Setup] Waiting for backend MQTT broker connection to complete...');
        for (let j = 0; j < 15; j++) {
          await wait(1000);
          const checkRes = await (await fetch(`${SERVER_URL}/api/health`)).json();
          if (checkRes.mqtt === 'connected') break;
        }
      }
      await wait(1500); // Allow subscription stabilization
      return;
    }
  } catch (err) {
    // Server not running, spawn it
  }

  console.log(`[Test Setup] Starting backend server process...`);
  spawnedServer = true;
  serverProcess = spawn('node', [path.join(__dirname, '../src/server.js')], {
    stdio: 'inherit',
    env: process.env,
  });

  // Poll until server and MQTT connection are ready
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await wait(1000);
    try {
      const res = await fetch(`${SERVER_URL}/api/health`);
      if (res.status === 200) {
        const json = await res.json();
        if (json.mqtt === 'connected') {
          console.log(`[Test Setup] Backend server initialized, healthy, and MQTT connected.`);
          await wait(1500); // Allow subscription stabilization
          return;
        }
      }
    } catch (e) {
      // Keep waiting
    }
  }
  throw new Error('Timeout: Failed to start backend server and establish MQTT broker connection within 30 seconds.');
}

async function runMqttTestSuite() {
  console.log('====================================================');
  console.log('  MEMBER 2: MQTT & IoT COMMUNICATION INTEGRATION TEST');
  console.log('====================================================');
  console.log(` Server URL   : ${SERVER_URL}`);
  console.log(` MQTT Broker  : ${BROKER_URL}`);
  console.log(` Sensor Topic : ${SENSOR_TOPIC}`);
  console.log(` Alert Topic  : ${ALERT_TOPIC}`);
  console.log('====================================================\n');

  await ensureServerRunning();

  const results = [];
  function record(testName, passed, details = '') {
    results.push({ testName, passed, details });
    const mark = passed ? '[PASS]' : '[FAIL]';
    console.log(`${mark} ${testName} ${details ? `(${details})` : ''}`);
    if (!passed) {
      console.error(`       Error details:`, details);
    }
  }

  // ----------------------------------------------------
  // 1. MQTT Broker Connection & Reconnection Resilience
  // ----------------------------------------------------
  console.log('\n--- 1. Testing MQTT Broker Connectivity & Event Hooks ---');
  let mqttPublisherConnected = false;
  let mqttSubscriberConnected = false;

  const publisher = mqtt.connect(BROKER_URL, {
    clientId: `test_pub_${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
  });

  const subscriber = mqtt.connect(BROKER_URL, {
    clientId: `test_sub_${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
  });

  await Promise.all([
    new Promise((resolve, reject) => {
      publisher.on('connect', () => {
        mqttPublisherConnected = true;
        resolve();
      });
      publisher.on('error', reject);
    }),
    new Promise((resolve, reject) => {
      subscriber.on('connect', () => {
        mqttSubscriberConnected = true;
        subscriber.subscribe(ALERT_TOPIC, { qos: 0 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      subscriber.on('error', reject);
    }),
  ]);

  record('MQTT Publisher Connection', mqttPublisherConnected, `Connected to ${BROKER_URL}`);
  record('MQTT Subscriber Connection & Subscription', mqttSubscriberConnected, `Subscribed to ${ALERT_TOPIC}`);

  // Track alerts received on MQTT alert topic
  const receivedMqttAlerts = [];
  subscriber.on('message', (topic, message) => {
    if (topic === ALERT_TOPIC) {
      try {
        const parsed = JSON.parse(message.toString());
        receivedMqttAlerts.push(parsed);
      } catch (e) {}
    }
  });

  // ----------------------------------------------------
  // 2. Real-Time Socket.IO Client Connection
  // ----------------------------------------------------
  console.log('\n--- 2. Setting Up Real-Time Socket.IO Client ---');
  const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  const receivedSensorEvents = [];
  const receivedSocketAlerts = [];

  await new Promise((resolve) => {
    socket.on('connect', () => {
      record('Socket.IO Client Connection', true, `Socket ID: ${socket.id}`);
      resolve();
    });
  });

  socket.on('sensor-data', (data) => {
    receivedSensorEvents.push(data);
  });

  socket.on('alert', (alert) => {
    receivedSocketAlerts.push(alert);
  });

  // ----------------------------------------------------
  // 3. Telemetry Ingestion, MongoDB Storage & Socket.IO Push
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Normal Telemetry Ingestion & Real-Time Broadcast ---');
  const normalDevice = 'ESP32_TEST_NORMAL';
  const normalPayload = {
    deviceId: normalDevice,
    gasLevel: 175,
    flameDetected: false,
  };

  publisher.publish(SENSOR_TOPIC, JSON.stringify(normalPayload));
  await wait(2000);

  // Verify Socket.IO event received
  const matchedSensorEvent = receivedSensorEvents.find((e) => e.deviceId === normalDevice);
  record(
    'Socket.IO "sensor-data" Event Dispatched',
    matchedSensorEvent !== undefined && matchedSensorEvent.gasLevel === 175,
    matchedSensorEvent ? `Gas: ${matchedSensorEvent.gasLevel}, Flame: ${matchedSensorEvent.flameDetected}` : 'Not received'
  );

  // Verify MongoDB persistence via REST API
  const latestSensorRes = await fetch(`${SERVER_URL}/api/sensors/latest`);
  const latestSensorJson = await latestSensorRes.json();
  const isSavedInDb = latestSensorJson.data && latestSensorJson.data.deviceId === normalDevice && latestSensorJson.data.gasLevel === 175;
  record(
    'Sensor Telemetry Persisted in MongoDB',
    isSavedInDb,
    isSavedInDb ? `Doc ID: ${latestSensorJson.data._id}` : 'Record not found in latest'
  );

  // ----------------------------------------------------
  // 4. ESP32 Hardware Data Types Compatibility (1/0, string numbers)
  // ----------------------------------------------------
  console.log('\n--- 4. Testing ESP32 Hardware Data Types Normalization ---');
  const esp32Device = 'ESP32_HW_TEST';
  // Simulating typical ESP32 ArduinoJson output: string gas level & integer flame flag (1)
  const esp32RawPayload = {
    deviceId: esp32Device,
    gasLevel: '280.5',
    flameDetected: 1, // Arduino digitalRead returning HIGH
  };

  publisher.publish(SENSOR_TOPIC, JSON.stringify(esp32RawPayload));
  await wait(2000);

  const matchedHwEvent = receivedSensorEvents.find((e) => e.deviceId === esp32Device);
  const isNormalized = matchedHwEvent && typeof matchedHwEvent.gasLevel === 'number' && matchedHwEvent.flameDetected === true;
  record(
    'ESP32 Hardware Data Normalization (numeric 1 -> boolean true, string gas -> float)',
    isNormalized,
    matchedHwEvent ? `gasLevel: ${matchedHwEvent.gasLevel} (${typeof matchedHwEvent.gasLevel}), flameDetected: ${matchedHwEvent.flameDetected}` : 'Not received'
  );

  // ----------------------------------------------------
  // 5. Payload Validation & Defensive Error Handling
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Defensive Payload Validation & Error Handling ---');
  const sensorCountBefore = receivedSensorEvents.length;

  // 5.1 Malformed non-JSON string
  publisher.publish(SENSOR_TOPIC, 'NOT_VALID_JSON_STRING{{{');
  await wait(1000);

  // 5.2 Non-object JSON (e.g. integer or array)
  publisher.publish(SENSOR_TOPIC, '12345');
  publisher.publish(SENSOR_TOPIC, JSON.stringify([1, 2, 3]));
  await wait(1000);

  // 5.3 Negative gasLevel
  publisher.publish(SENSOR_TOPIC, JSON.stringify({ deviceId: 'BAD_DEV', gasLevel: -20, flameDetected: false }));
  await wait(1000);

  // 5.4 Missing gasLevel
  publisher.publish(SENSOR_TOPIC, JSON.stringify({ deviceId: 'BAD_DEV', flameDetected: false }));
  await wait(1000);

  // None of these bad payloads should have emitted valid sensor events
  const sensorCountAfter = receivedSensorEvents.length;
  record(
    'Invalid & Malformed Payloads Rejected Without Crash',
    sensorCountAfter === sensorCountBefore,
    `Sensor event count remained steady (${sensorCountBefore})`
  );

  // ----------------------------------------------------
  // 6. Hazard Detection, Deduplication & MQTT Alert Publication
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Hazard Alert Evaluation, Cooldown & MQTT Publication ---');
  const hazardDevice = 'ESP32_HAZARD_NODE';

  // 6.1 Gas Leak Hazard
  console.log('--> Publishing Gas Leak (gas: 600 >= 400)...');
  publisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: hazardDevice,
      gasLevel: 600,
      flameDetected: false,
    })
  );
  await wait(2500);

  // Check Socket.IO alert
  const gasSocketAlert = receivedSocketAlerts.find((a) => a.deviceId === hazardDevice && a.alertType === 'GAS_LEAK');
  record(
    'Gas Leak Alert Emitted via Socket.IO',
    gasSocketAlert !== undefined,
    gasSocketAlert ? `Type: ${gasSocketAlert.alertType}, Severity: ${gasSocketAlert.severity}` : 'Not received'
  );

  // Check MQTT Alert Topic (iotap/sensor/alerts)
  const gasMqttAlert = receivedMqttAlerts.find((a) => a.deviceId === hazardDevice && a.alertType === 'GAS_LEAK');
  record(
    'Gas Leak Alert Published to MQTT (iotap/sensor/alerts)',
    gasMqttAlert !== undefined,
    gasMqttAlert ? `Received on MQTT: [${gasMqttAlert.alertType}] - ${gasMqttAlert.message}` : 'Not received'
  );

  // 6.2 Cooldown Suppression (rapid repeat within 60s)
  console.log('--> Publishing repeat gas hazard within cooldown...');
  const mqttAlertsCountBefore = receivedMqttAlerts.filter((a) => a.deviceId === hazardDevice).length;

  publisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: hazardDevice,
      gasLevel: 650,
      flameDetected: false,
    })
  );
  await wait(2000);

  const mqttAlertsCountAfter = receivedMqttAlerts.filter((a) => a.deviceId === hazardDevice).length;
  record(
    'Duplicate Alert Suppressed by Cooldown',
    mqttAlertsCountAfter === mqttAlertsCountBefore,
    `Alert count unchanged (${mqttAlertsCountBefore})`
  );

  // 6.3 Normal State Reset
  console.log('--> Publishing normal state to clear hazard...');
  publisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: hazardDevice,
      gasLevel: 100,
      flameDetected: false,
    })
  );
  await wait(2000);

  // 6.4 Combined Hazard (Gas + Fire) after reset
  console.log('--> Publishing Combined Hazard (gas: 800 + flame: true)...');
  publisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: hazardDevice,
      gasLevel: 800,
      flameDetected: true,
    })
  );
  await wait(2500);

  const combinedMqttAlert = receivedMqttAlerts.find((a) => a.deviceId === hazardDevice && a.alertType === 'COMBINED_HAZARD');
  record(
    'Combined Hazard Triggered After Normal Reset',
    combinedMqttAlert !== undefined && combinedMqttAlert.severity === 'CRITICAL',
    combinedMqttAlert ? `Alert: ${combinedMqttAlert.alertType}, Severity: ${combinedMqttAlert.severity}` : 'Not received'
  );

  // ----------------------------------------------------
  // Cleanup
  // ----------------------------------------------------
  publisher.end();
  subscriber.end();
  socket.disconnect();

  if (spawnedServer && serverProcess) {
    console.log('\n[Test Cleanup] Stopping spawned backend server...');
    serverProcess.kill('SIGINT');
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('           MQTT INTEGRATION TEST RESULTS            ');
  console.log('====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Total Tests Run : ${totalCount}`);
  console.log(`Passed          : ${passedCount}`);
  console.log(`Failed          : ${totalCount - passedCount}`);
  console.log(`Success Rate    : ${((passedCount / totalCount) * 100).toFixed(1)}%`);
  console.log('====================================================');

  if (passedCount === totalCount) {
    console.log('\n>>> ALL MQTT INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> SOME MQTT INTEGRATION TESTS FAILED <<<\n');
    process.exit(1);
  }
}

runMqttTestSuite().catch((err) => {
  console.error('[Test Error] Fatal test runner error:', err);
  if (spawnedServer && serverProcess) {
    serverProcess.kill('SIGINT');
  }
  process.exit(1);
});
