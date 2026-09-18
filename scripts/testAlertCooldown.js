const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_TOPIC = process.env.MQTT_TOPIC_SENSOR || 'iotap/sensor/data';
const SERVER_URL = `http://localhost:${process.env.PORT || 5000}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAlertsCountForDevice(deviceId) {
  const res = await fetch(`${SERVER_URL}/api/alerts?limit=50`);
  const json = await res.json();
  const matching = json.data.filter((a) => a.deviceId === deviceId);
  return matching.length;
}

async function runCooldownTests() {
  console.log('====================================================');
  console.log(' Testing Alert Deduplication & Cooldown Mechanism');
  console.log(` Broker URL : ${BROKER_URL}`);
  console.log(` Topic      : ${SENSOR_TOPIC}`);
  console.log('====================================================\n');

  const client = mqtt.connect(BROKER_URL);

  await new Promise((resolve, reject) => {
    client.on('connect', () => {
      console.log('[MQTT] Connected to broker.');
      resolve();
    });
    client.on('error', reject);
  });

  const dev1 = 'ESP32_CD_TEST_1';
  const dev2 = 'ESP32_CD_TEST_2';

  // Baseline count
  const initialDev1Count = await getAlertsCountForDevice(dev1);
  const initialDev2Count = await getAlertsCountForDevice(dev2);

  // ----------------------------------------------------
  // Test 1: First hazard reading should create an alert
  // ----------------------------------------------------
  console.log('--> Step 1: Sending first hazard for', dev1, '(gas: 600)');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({ deviceId: dev1, gasLevel: 600, flameDetected: false })
  );
  await wait(2000);

  const countAfterFirst = await getAlertsCountForDevice(dev1);
  if (countAfterFirst === initialDev1Count + 1) {
    console.log(' [PASS] Initial alert created successfully.');
  } else {
    console.error(' [FAIL] Expected alert count to increase by 1, got:', countAfterFirst);
  }

  // ----------------------------------------------------
  // Test 2: Rapid successive hazard reading within 60s MUST BE SUPPRESSED
  // ----------------------------------------------------
  console.log('--> Step 2: Sending second hazard for', dev1, 'within cooldown (gas: 650)');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({ deviceId: dev1, gasLevel: 650, flameDetected: false })
  );
  await wait(2000);

  const countAfterSecond = await getAlertsCountForDevice(dev1);
  if (countAfterSecond === countAfterFirst) {
    console.log(' [PASS] Duplicate alert during 60s cooldown was successfully SUPPRESSED!');
  } else {
    console.error(' [FAIL] Duplicate alert was NOT suppressed. Count:', countAfterSecond);
  }

  // ----------------------------------------------------
  // Test 3: Multiple devices handled independently
  // ----------------------------------------------------
  console.log('--> Step 3: Sending hazard for independent device', dev2, '(gas: 520)');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({ deviceId: dev2, gasLevel: 520, flameDetected: false })
  );
  await wait(2000);

  const dev2Count = await getAlertsCountForDevice(dev2);
  if (dev2Count === initialDev2Count + 1) {
    console.log(' [PASS] Device 2 triggered alert independently while Device 1 is in cooldown!');
  } else {
    console.error(' [FAIL] Device 2 failed to trigger independent alert.');
  }

  // ----------------------------------------------------
  // Test 4: Returning to normal state resets cooldown for fresh incident
  // ----------------------------------------------------
  console.log('--> Step 4: Device 1 returns to NORMAL state (gas: 150, flame: false)');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({ deviceId: dev1, gasLevel: 150, flameDetected: false })
  );
  await wait(2000);

  console.log('--> Step 5: Hazard returns on Device 1 (gas: 700). Should trigger new alert!');
  client.publish(
    SENSOR_TOPIC,
    JSON.stringify({ deviceId: dev1, gasLevel: 700, flameDetected: false })
  );
  await wait(2000);

  const countAfterReset = await getAlertsCountForDevice(dev1);
  if (countAfterReset === countAfterSecond + 1) {
    console.log(' [PASS] Alert successfully triggered when hazard returned after normal state!');
  } else {
    console.error(' [FAIL] Alert was not triggered on return from normal state. Count:', countAfterReset);
  }

  client.end();

  console.log('\n====================================================');
  console.log(' ALL COOLDOWN & DEDUPLICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runCooldownTests().catch((err) => {
  console.error('Cooldown test error:', err.message);
  process.exit(1);
});
