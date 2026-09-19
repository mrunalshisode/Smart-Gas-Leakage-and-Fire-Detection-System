const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:5000';

console.log(`[Socket Test] Connecting to ${SERVER_URL}...`);
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
});

socket.on('connect', async () => {
  console.log(`[Socket Test] Connected to server successfully! Socket ID: ${socket.id}`);

  // Trigger a hazard reading (gas + flame) to test both sensor-data and alert events
  console.log('[Socket Test] Triggering hazard reading (gas: 750, flame: true)...');
  try {
    const res = await fetch(`${SERVER_URL}/api/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'ESP32_SOCKET_HAZARD',
        gasLevel: 750,
        flameDetected: true,
      }),
    });
    const json = await res.json();
    console.log('[Socket Test] Hazard reading posted:', json.data.deviceId);
  } catch (err) {
    console.error('[Socket Test] Failed to send trigger reading:', err.message);
  }
});

let receivedSensorData = false;

socket.on('sensor-data', (data) => {
  if (data.deviceId === 'ESP32_SOCKET_HAZARD') {
    console.log('[Socket Test] Received "sensor-data" event for', data.deviceId);
    console.log(`              Gas: ${data.gasLevel}, Flame: ${data.flameDetected}, gasAlert: ${data.gasAlert}, fireAlert: ${data.fireAlert}`);
    receivedSensorData = true;
    checkDone();
  }
});

socket.on('alert', (alertData) => {
  console.log('[Socket Test] Received "alert" event:');
  console.log(`              Type: ${alertData.alertType}, Severity: ${alertData.severity}`);
  console.log(`              Message: ${alertData.message}`);
});

function checkDone() {
  if (receivedSensorData) {
    console.log('>>> VERIFICATION PASSED: Socket.IO events delivered in real-time!');
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 500);
  }
}

socket.on('connect_error', (error) => {
  console.error('[Socket Test] Connection error:', error.message);
  process.exit(1);
});

// Timeout safeguard (5 seconds)
setTimeout(() => {
  console.error('[Socket Test] Timeout waiting for real-time event.');
  socket.disconnect();
  process.exit(1);
}, 5000);
