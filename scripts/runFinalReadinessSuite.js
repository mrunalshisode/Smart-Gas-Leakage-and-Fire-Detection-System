const mqtt = require('mqtt');
const { io } = require('socket.io-client');
const dotenv = require('dotenv');

dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_TOPIC = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
const ALERT_TOPIC = process.env.MQTT_TOPIC_ALERT || 'iotap/sensor/alerts';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const testResults = [];

function recordResult(category, testName, expected, actual, passed, details = '') {
  testResults.push({
    category,
    testName,
    expected,
    actual,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${category} :: ${testName}`);
  if (!passed) console.error('  Expected:', expected, 'Got:', actual);
}

async function runAllTests() {
  console.log('====================================================');
  console.log('   STARTING FINAL BACKEND READINESS TEST SUITE      ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: System Services & Connectivity Check
  // ----------------------------------------------------
  console.log('--- Checking 1. System Services & Connectivity ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthJson = await healthRes.json();
    const isOk = healthRes.status === 200 && healthJson.status === 'OK';
    recordResult(
      'System Connectivity',
      'Server & Health Endpoint',
      'HTTP 200, status: OK',
      `HTTP ${healthRes.status}, status: ${healthJson.status}`,
      isOk,
      `Uptime: ${healthJson.uptime}s`
    );
  } catch (err) {
    recordResult('System Connectivity', 'Server & Health Endpoint', 'HTTP 200', err.message, false);
  }

  // ----------------------------------------------------
  // SECTION 2: REST API Testing
  // ----------------------------------------------------
  console.log('\n--- Checking 2. REST APIs ---');

  // 2.1 GET /
  try {
    const res = await fetch(`${BASE_URL}/`);
    const json = await res.json();
    recordResult(
      'REST API',
      'GET / (Root Operational Check)',
      'HTTP 200 with status: online',
      `HTTP ${res.status}, status: ${json.status}`,
      res.status === 200 && json.status === 'online'
    );
  } catch (err) {
    recordResult('REST API', 'GET /', 'HTTP 200', err.message, false);
  }

  // 2.2 GET /api/health
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const json = await res.json();
    recordResult(
      'REST API',
      'GET /api/health',
      'HTTP 200 with status: OK',
      `HTTP ${res.status}, status: ${json.status}`,
      res.status === 200 && json.status === 'OK'
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/health', 'HTTP 200', err.message, false);
  }

  // 2.3 POST /api/sensors - Normal reading
  let postNormalData = null;
  try {
    const res = await fetch(`${BASE_URL}/api/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'FINAL_TEST_ESP32',
        gasLevel: 180,
        flameDetected: false,
      }),
    });
    const json = await res.json();
    postNormalData = json.data;
    const passed =
      res.status === 201 &&
      json.success === true &&
      json.data.gasAlert === false &&
      json.data.fireAlert === false;
    recordResult(
      'REST API',
      'POST /api/sensors (Normal reading: gas 180, flame false)',
      'HTTP 201, gasAlert: false, fireAlert: false',
      `HTTP ${res.status}, gasAlert: ${json.data?.gasAlert}, fireAlert: ${json.data?.fireAlert}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'POST /api/sensors (Normal)', 'HTTP 201', err.message, false);
  }

  // 2.4 POST /api/sensors - Gas leakage reading
  try {
    const res = await fetch(`${BASE_URL}/api/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'FINAL_TEST_ESP32',
        gasLevel: 580,
        flameDetected: false,
      }),
    });
    const json = await res.json();
    const passed =
      res.status === 201 &&
      json.success === true &&
      json.data.gasAlert === true &&
      json.data.fireAlert === false;
    recordResult(
      'REST API',
      'POST /api/sensors (Gas leakage reading: gas 580, flame false)',
      'HTTP 201, gasAlert: true, fireAlert: false',
      `HTTP ${res.status}, gasAlert: ${json.data?.gasAlert}, fireAlert: ${json.data?.fireAlert}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'POST /api/sensors (Gas leakage)', 'HTTP 201', err.message, false);
  }

  // 2.5 POST /api/sensors - Fire detection reading
  try {
    const res = await fetch(`${BASE_URL}/api/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'FINAL_TEST_ESP32',
        gasLevel: 140,
        flameDetected: true,
      }),
    });
    const json = await res.json();
    const passed =
      res.status === 201 &&
      json.success === true &&
      json.data.gasAlert === false &&
      json.data.fireAlert === true;
    recordResult(
      'REST API',
      'POST /api/sensors (Fire detection reading: gas 140, flame true)',
      'HTTP 201, gasAlert: false, fireAlert: true',
      `HTTP ${res.status}, gasAlert: ${json.data?.gasAlert}, fireAlert: ${json.data?.fireAlert}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'POST /api/sensors (Fire detection)', 'HTTP 201', err.message, false);
  }

  // 2.6 POST /api/sensors - Combined reading
  try {
    const res = await fetch(`${BASE_URL}/api/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'FINAL_TEST_ESP32',
        gasLevel: 850,
        flameDetected: true,
      }),
    });
    const json = await res.json();
    const passed =
      res.status === 201 &&
      json.success === true &&
      json.data.gasAlert === true &&
      json.data.fireAlert === true;
    recordResult(
      'REST API',
      'POST /api/sensors (Combined reading: gas 850, flame true)',
      'HTTP 201, gasAlert: true, fireAlert: true',
      `HTTP ${res.status}, gasAlert: ${json.data?.gasAlert}, fireAlert: ${json.data?.fireAlert}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'POST /api/sensors (Combined)', 'HTTP 201', err.message, false);
  }

  // 2.7 POST /api/sensors - Missing gasLevel validation
  try {
    const res = await fetch(`${BASE_URL}/api/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'FINAL_TEST_ESP32',
        flameDetected: true,
      }),
    });
    const json = await res.json();
    const passed =
      res.status === 400 &&
      json.success === false &&
      json.message === 'gasLevel is required';
    recordResult(
      'REST API',
      'POST /api/sensors (Missing gasLevel validation)',
      'HTTP 400, message: "gasLevel is required"',
      `HTTP ${res.status}, message: "${json.message}"`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'POST /api/sensors (Missing field)', 'HTTP 400', err.message, false);
  }

  // 2.8 GET /api/sensors/latest
  try {
    const res = await fetch(`${BASE_URL}/api/sensors/latest`);
    const json = await res.json();
    const passed =
      res.status === 200 &&
      json.success === true &&
      json.data !== null &&
      typeof json.data.gasLevel === 'number';
    recordResult(
      'REST API',
      'GET /api/sensors/latest',
      'HTTP 200 with sensor data object',
      `HTTP ${res.status}, device: ${json.data?.deviceId}, gas: ${json.data?.gasLevel}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/sensors/latest', 'HTTP 200', err.message, false);
  }

  // 2.9 GET /api/sensors/history
  try {
    const res = await fetch(`${BASE_URL}/api/sensors/history?limit=10`);
    const json = await res.json();
    const passed =
      res.status === 200 &&
      json.success === true &&
      Array.isArray(json.data) &&
      json.data.length > 0;
    recordResult(
      'REST API',
      'GET /api/sensors/history?limit=10',
      'HTTP 200 with array of logs',
      `HTTP ${res.status}, count: ${json.count}, array length: ${json.data?.length}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/sensors/history', 'HTTP 200', err.message, false);
  }

  // 2.10 GET /api/alerts/latest
  try {
    const res = await fetch(`${BASE_URL}/api/alerts/latest`);
    const json = await res.json();
    const passed =
      res.status === 200 &&
      json.success === true &&
      (json.data === null || typeof json.data.alertType === 'string');
    recordResult(
      'REST API',
      'GET /api/alerts/latest',
      'HTTP 200 with alert object',
      `HTTP ${res.status}, alertType: ${json.data?.alertType}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/alerts/latest', 'HTTP 200', err.message, false);
  }

  // 2.11 GET /api/alerts
  try {
    const res = await fetch(`${BASE_URL}/api/alerts`);
    const json = await res.json();
    const passed =
      res.status === 200 &&
      json.success === true &&
      Array.isArray(json.data);
    recordResult(
      'REST API',
      'GET /api/alerts (Default History)',
      'HTTP 200 with alert list',
      `HTTP ${res.status}, count: ${json.count}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/alerts', 'HTTP 200', err.message, false);
  }

  // 2.12 GET /api/alerts?limit=5
  try {
    const res = await fetch(`${BASE_URL}/api/alerts?limit=5`);
    const json = await res.json();
    const passed =
      res.status === 200 &&
      json.success === true &&
      json.data.length <= 5;
    recordResult(
      'REST API',
      'GET /api/alerts?limit=5',
      'HTTP 200 with at most 5 alerts',
      `HTTP ${res.status}, returned length: ${json.data?.length}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/alerts?limit=5', 'HTTP 200', err.message, false);
  }

  // 2.13 GET /api/alerts?severity=HIGH
  try {
    const res = await fetch(`${BASE_URL}/api/alerts?severity=HIGH`);
    const json = await res.json();
    const allHigh = json.data.every((a) => a.severity === 'HIGH');
    const passed = res.status === 200 && json.success === true && allHigh;
    recordResult(
      'REST API',
      'GET /api/alerts?severity=HIGH',
      'HTTP 200, all records have severity HIGH',
      `HTTP ${res.status}, count: ${json.count}, all matched HIGH: ${allHigh}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/alerts?severity=HIGH', 'HTTP 200', err.message, false);
  }

  // 2.14 GET /api/alerts?alertType=GAS_LEAK
  try {
    const res = await fetch(`${BASE_URL}/api/alerts?alertType=GAS_LEAK`);
    const json = await res.json();
    const allGas = json.data.every((a) => a.alertType === 'GAS_LEAK');
    const passed = res.status === 200 && json.success === true && allGas;
    recordResult(
      'REST API',
      'GET /api/alerts?alertType=GAS_LEAK',
      'HTTP 200, all records have alertType GAS_LEAK',
      `HTTP ${res.status}, count: ${json.count}, all matched GAS_LEAK: ${allGas}`,
      passed
    );
  } catch (err) {
    recordResult('REST API', 'GET /api/alerts?alertType=GAS_LEAK', 'HTTP 200', err.message, false);
  }

  // ----------------------------------------------------
  // SECTION 3: Real-Time & Database Verification
  // ----------------------------------------------------
  console.log('\n--- Checking 3. Real-Time (Socket.IO, MQTT) & Database ---');

  // 3.1 Setup Socket.IO client and MQTT subscriber
  let socketConnected = false;
  let receivedSensorDataEvent = null;
  let receivedAlertEvent = null;
  let receivedMqttAlertPayload = null;

  const socket = io(BASE_URL, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    socketConnected = true;
  });
  socket.on('sensor-data', (data) => {
    if (data.deviceId === 'FINAL_RT_DEVICE') {
      receivedSensorDataEvent = data;
    }
  });
  socket.on('alert', (data) => {
    if (data.deviceId === 'FINAL_RT_DEVICE') {
      receivedAlertEvent = data;
    }
  });

  // Setup MQTT subscriber on alert topic
  const mqttAlertSubscriber = mqtt.connect(BROKER_URL);
  await new Promise((resolve) => {
    mqttAlertSubscriber.on('connect', () => {
      mqttAlertSubscriber.subscribe(ALERT_TOPIC, () => resolve());
    });
  });

  mqttAlertSubscriber.on('message', (topic, message) => {
    if (topic === ALERT_TOPIC) {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.deviceId === 'FINAL_RT_DEVICE') {
          receivedMqttAlertPayload = parsed;
        }
      } catch (e) {}
    }
  });

  await wait(1000); // Wait for connections to stabilize
  recordResult(
    'Real-Time Setup',
    'Socket.IO Client Connection',
    'Socket connected to server',
    socketConnected ? 'Connected' : 'Failed',
    socketConnected
  );

  // Setup MQTT publisher to publish telemetry
  const mqttPublisher = mqtt.connect(BROKER_URL);
  await new Promise((resolve) => {
    mqttPublisher.on('connect', resolve);
  });

  // Step 3A: Publish hazardous telemetry via MQTT
  console.log('--> Publishing hazard telemetry for FINAL_RT_DEVICE via MQTT...');
  mqttPublisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'FINAL_RT_DEVICE',
      gasLevel: 620,
      flameDetected: true,
    })
  );
  await wait(2500);

  // 3.2 Verify Socket.IO 'sensor-data' event
  const passedSensorEvent =
    receivedSensorDataEvent !== null &&
    receivedSensorDataEvent.deviceId === 'FINAL_RT_DEVICE' &&
    receivedSensorDataEvent.gasLevel === 620;
  recordResult(
    'Real-Time Event',
    'Socket.IO sensor-data Event',
    'Received telemetry with deviceId FINAL_RT_DEVICE & gasLevel 620',
    receivedSensorDataEvent
      ? `Received: device ${receivedSensorDataEvent.deviceId}, gas ${receivedSensorDataEvent.gasLevel}`
      : 'Not received',
    passedSensorEvent
  );

  // 3.3 Verify Socket.IO 'alert' event
  const passedAlertEvent =
    receivedAlertEvent !== null &&
    receivedAlertEvent.deviceId === 'FINAL_RT_DEVICE' &&
    receivedAlertEvent.alertType === 'COMBINED_HAZARD';
  recordResult(
    'Real-Time Event',
    'Socket.IO alert Event',
    'Received alert with COMBINED_HAZARD and CRITICAL severity',
    receivedAlertEvent
      ? `Received: ${receivedAlertEvent.alertType}, severity: ${receivedAlertEvent.severity}`
      : 'Not received',
    passedAlertEvent
  );

  // 3.4 Verify MQTT Alert Publishing (to iotap/sensor/alerts)
  const passedMqttAlert =
    receivedMqttAlertPayload !== null &&
    receivedMqttAlertPayload.deviceId === 'FINAL_RT_DEVICE' &&
    receivedMqttAlertPayload.alertType === 'COMBINED_HAZARD';
  recordResult(
    'Real-Time MQTT',
    'MQTT Alert Topic Publication (iotap/sensor/alerts)',
    'Published COMBINED_HAZARD on alert topic for ESP32 actuators',
    receivedMqttAlertPayload
      ? `Received on MQTT: ${receivedMqttAlertPayload.alertType}`
      : 'Not received on MQTT',
    passedMqttAlert
  );

  // 3.5 Verify Database: SensorLog Saved
  const latestSensorRes = await fetch(`${BASE_URL}/api/sensors/latest`);
  const latestSensorJson = await latestSensorRes.json();
  const dbSensorSaved =
    latestSensorJson.data &&
    latestSensorJson.data.deviceId === 'FINAL_RT_DEVICE' &&
    latestSensorJson.data.gasLevel === 620;
  recordResult(
    'Database Verification',
    'SensorLog Ingestion in MongoDB',
    'Latest MongoDB reading matches published telemetry (FINAL_RT_DEVICE, 620)',
    dbSensorSaved
      ? `Saved in MongoDB with ID: ${latestSensorJson.data._id}`
      : 'Mismatch or not saved',
    dbSensorSaved
  );

  // 3.6 Verify Database: Alert Saved
  const latestAlertRes = await fetch(`${BASE_URL}/api/alerts/latest`);
  const latestAlertJson = await latestAlertRes.json();
  const dbAlertSaved =
    latestAlertJson.data &&
    latestAlertJson.data.deviceId === 'FINAL_RT_DEVICE' &&
    latestAlertJson.data.alertType === 'COMBINED_HAZARD';
  recordResult(
    'Database Verification',
    'Alert Ingestion in MongoDB',
    'Latest MongoDB alert matches COMBINED_HAZARD for FINAL_RT_DEVICE',
    dbAlertSaved
      ? `Saved in MongoDB with ID: ${latestAlertJson.data._id}`
      : 'Mismatch or not saved',
    dbAlertSaved
  );

  // 3.7 Verify Alert Cooldown (Duplicate Prevention)
  console.log('--> Publishing second hazard reading within cooldown...');
  const alertsCountBefore = (await (await fetch(`${BASE_URL}/api/alerts?limit=50`)).json()).data.filter(
    (a) => a.deviceId === 'FINAL_RT_DEVICE'
  ).length;

  mqttPublisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'FINAL_RT_DEVICE',
      gasLevel: 680,
      flameDetected: true,
    })
  );
  await wait(2000);

  const alertsCountAfter = (await (await fetch(`${BASE_URL}/api/alerts?limit=50`)).json()).data.filter(
    (a) => a.deviceId === 'FINAL_RT_DEVICE'
  ).length;

  const duplicateSuppressed = alertsCountAfter === alertsCountBefore;
  recordResult(
    'Alert Cooldown',
    'Duplicate Alert Suppression During 60s Cooldown',
    'Alert count remains constant; duplicate is suppressed',
    duplicateSuppressed
      ? `Suppressed successfully (Count before: ${alertsCountBefore}, Count after: ${alertsCountAfter})`
      : `Failed to suppress (Count before: ${alertsCountBefore}, Count after: ${alertsCountAfter})`,
    duplicateSuppressed
  );

  // 3.8 Verify Normal State Reset & Fresh Incident Trigger
  console.log('--> Publishing normal state to reset hazard...');
  mqttPublisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'FINAL_RT_DEVICE',
      gasLevel: 120,
      flameDetected: false,
    })
  );
  await wait(2000);

  console.log('--> Publishing new hazard to verify fresh alert trigger...');
  mqttPublisher.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'FINAL_RT_DEVICE',
      gasLevel: 720,
      flameDetected: true,
    })
  );
  await wait(2500);

  const alertsCountFinal = (await (await fetch(`${BASE_URL}/api/alerts?limit=50`)).json()).data.filter(
    (a) => a.deviceId === 'FINAL_RT_DEVICE'
  ).length;

  const freshAlertCreated = alertsCountFinal === alertsCountAfter + 1;
  recordResult(
    'Alert Cooldown',
    'Normal State Reset & New Incident Trigger',
    'Hazard returning after normal state immediately triggers a new alert',
    freshAlertCreated
      ? `Triggered new alert on return (Previous count: ${alertsCountAfter}, New count: ${alertsCountFinal})`
      : `Failed to trigger (Previous count: ${alertsCountAfter}, Final count: ${alertsCountFinal})`,
    freshAlertCreated
  );

  // Disconnect test sockets and publishers
  socket.disconnect();
  mqttAlertSubscriber.end();
  mqttPublisher.end();

  // Print Summary
  const passedCount = testResults.filter((t) => t.status === 'PASS').length;
  const failedCount = testResults.filter((t) => t.status === 'FAIL').length;
  console.log('\n====================================================');
  console.log(` SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED | TOTAL: ${testResults.length}`);
  console.log('====================================================');

  return testResults;
}

runAllTests()
  .then((results) => {
    // Write results to JSON for report generation
    const fs = require('fs');
    fs.writeFileSync(
      'scripts/finalTestResults.json',
      JSON.stringify(results, null, 2)
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error('Master test suite runner failed:', err);
    process.exit(1);
  });
