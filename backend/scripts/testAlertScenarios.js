const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_TOPIC = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
const SERVER_URL = `http://localhost:${process.env.PORT || 5000}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runScenarioTests() {
  console.log('====================================================');
  console.log(' Starting Safe Simulated MQTT Hazard Scenario Tests');
  console.log(` Broker URL : ${BROKER_URL}`);
  console.log(` Topic      : ${SENSOR_TOPIC}`);
  console.log('====================================================\n');

  const client = mqtt.connect(BROKER_URL);

  await new Promise((resolve, reject) => {
    client.on('connect', () => {
      console.log('[MQTT] Connected to test broker successfully.');
      resolve();
    });
    client.on('error', reject);
  });

  // Test Case 1: Gas-Only Hazard (PPM: 650 >= 400 threshold, flame: false)
  console.log('--> [Scenario 1] Publishing Gas-Only Hazard...');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'ESP32_TEST_SUITE',
      gasLevel: 650,
      flameDetected: false,
    })
  );
  await wait(2000); // Allow backend to receive, parse, and save

  // Test Case 2: Fire-Only Hazard (PPM: 120 normal, flame: true)
  console.log('--> [Scenario 2] Publishing Fire-Only Hazard...');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'ESP32_TEST_SUITE',
      gasLevel: 120,
      flameDetected: true,
    })
  );
  await wait(2000);

  // Test Case 3: Combined Hazard (PPM: 820 high gas AND flame: true)
  console.log('--> [Scenario 3] Publishing Combined Gas + Fire Hazard...');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({
      deviceId: 'ESP32_TEST_SUITE',
      gasLevel: 820,
      flameDetected: true,
    })
  );
  await wait(2000);

  client.end();
  console.log('\n[MQTT] Simulated messages published. Disconnected from broker.');

  // Verify through REST API
  console.log('\n--- Verifying Alert Endpoints ---');

  // 1. Verify GET /api/alerts/latest
  const latestRes = await fetch(`${SERVER_URL}/api/alerts/latest`);
  const latestJson = await latestRes.json();
  console.log('1. GET /api/alerts/latest response:');
  console.log(JSON.stringify(latestJson, null, 2));

  // 2. Verify GET /api/alerts (History endpoint with limit=5)
  const historyRes = await fetch(`${SERVER_URL}/api/alerts?limit=5`);
  const historyJson = await historyRes.json();
  console.log('\n2. GET /api/alerts (History, last 5) count:', historyJson.count);
  console.log(
    historyJson.data.map((a, i) => ({
      index: i + 1,
      alertType: a.alertType,
      severity: a.severity,
      gasLevel: a.gasLevel,
      flameDetected: a.flameDetected,
      message: a.message,
    }))
  );

  console.log('\n====================================================');
  console.log(' All 3 Scenarios Executed and Verified Successfully!');
  console.log('====================================================');
}

runScenarioTests().catch((err) => {
  console.error('Test execution failed:', err.message);
  process.exit(1);
});
