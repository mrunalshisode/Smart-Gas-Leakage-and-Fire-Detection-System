# Backend API Documentation
## Smart Gas Leakage and Fire Detection System (IoTAP)

This documentation describes all existing REST API endpoints, real-time Socket.IO events, MQTT topics, and data formats for the frontend application.

- **Base URL**: `http://localhost:5000` (or `http://<SERVER_IP>:5000`)
- **CORS**: Enabled for all origins (`*`)
- **Real-Time Protocol**: Socket.IO (supports WebSockets & HTTP polling)

---

## 1. REST API Endpoints

### 1.1 Root Operational Check
Simple root ping endpoint confirming that the backend HTTP service is running.

- **Method**: `GET`
- **URL**: `/`
- **Request Headers**: None
- **Query Parameters**: None
- **Request Body**: None

#### Example Request
```http
GET / HTTP/1.1
Host: localhost:5000
```

#### Successful Response (`200 OK`)
```json
{
  "status": "online",
  "message": "IoT Gas Leakage and Fire Detection System Backend is operational",
  "timestamp": "2026-09-18T14:33:22.057Z"
}
```

---

### 1.2 Detailed Service Health Check
Retrieves the operational status, server uptime, and timestamp of the backend service.

- **Method**: `GET`
- **URL**: `/api/health`
- **Request Headers**: None
- **Query Parameters**: None
- **Request Body**: None

#### Example Request
```http
GET /api/health HTTP/1.1
Host: localhost:5000
```

#### Successful Response (`200 OK`)
```json
{
  "status": "OK",
  "service": "IoTAP Smart Gas & Fire Detection Backend",
  "uptime": 1342.58,
  "timestamp": "2026-09-18T14:50:00.000Z"
}
```

---

### 1.3 Get Latest Sensor Reading
Retrieves the single most recent telemetry log recorded from the sensors.

- **Method**: `GET`
- **URL**: `/api/sensors/latest`
- **Request Headers**: None
- **Query Parameters**: None
- **Request Body**: None

#### Example Request
```http
GET /api/sensors/latest HTTP/1.1
Host: localhost:5000
```

#### Successful Response (`200 OK` — Data Available)
```json
{
  "success": true,
  "data": {
    "_id": "6aad4f833b6336ed024df70b",
    "deviceId": "ESP32_NODE_01",
    "gasLevel": 450,
    "flameDetected": false,
    "gasAlert": true,
    "fireAlert": false,
    "timestamp": "2026-09-18T14:49:39.034Z",
    "createdAt": "2026-09-18T14:49:39.045Z",
    "updatedAt": "2026-09-18T14:49:39.045Z",
    "__v": 0
  }
}
```

#### Successful Response (`200 OK` — No Readings Yet)
```json
{
  "success": true,
  "message": "No sensor logs recorded yet",
  "data": null
}
```

#### Error Response (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Failed to retrieve latest sensor reading",
  "error": "Error details"
}
```

---

### 1.4 Get Sensor History
Retrieves past sensor telemetry readings ordered chronologically (newest first). Ideal for rendering charts, gas trend graphs, and data tables.

- **Method**: `GET`
- **URL**: `/api/sensors/history`
- **Query Parameters**:
  - `limit` *(optional, integer)*: Maximum records to return. Default is `50`.

#### Example Request
```http
GET /api/sensors/history?limit=20 HTTP/1.1
Host: localhost:5000
```

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6aad4f833b6336ed024df70b",
      "deviceId": "ESP32_NODE_01",
      "gasLevel": 450,
      "flameDetected": false,
      "gasAlert": true,
      "fireAlert": false,
      "timestamp": "2026-09-18T14:49:39.034Z",
      "createdAt": "2026-09-18T14:49:39.045Z",
      "updatedAt": "2026-09-18T14:49:39.045Z",
      "__v": 0
    },
    {
      "_id": "6aad4e6419634ace93daac81",
      "deviceId": "ESP32_NODE_01",
      "gasLevel": 180,
      "flameDetected": false,
      "gasAlert": false,
      "fireAlert": false,
      "timestamp": "2026-09-18T14:44:52.751Z",
      "createdAt": "2026-09-18T14:44:52.752Z",
      "updatedAt": "2026-09-18T14:44:52.752Z",
      "__v": 0
    }
  ]
}
```

#### Error Response (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Failed to retrieve sensor history",
  "error": "Error details"
}
```

---

### 1.5 Post Manual Sensor Reading
Manually submits a sensor reading via HTTP. Useful for frontend simulation, debugging without hardware, or test suites. When called, it also broadcasts the reading to all connected Socket.IO clients.

- **Method**: `POST`
- **URL**: `/api/sensors`
- **Request Headers**: `Content-Type: application/json`

#### Request Body Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `gasLevel` | `Number` | **Yes** | Raw sensor reading (ADC value e.g. 0–4095 or calibrated PPM). Must be $\ge 0$. |
| `deviceId` | `String` | No | Identifier of the transmitting node (defaults to `'ESP32_MANUAL'`). |
| `flameDetected` | `Boolean` | No | `true` if flame is detected, `false` otherwise (defaults to `false`). |
| `gasAlert` | `Boolean` | No | If omitted, calculated automatically based on `gasLevel >= 400`. |
| `fireAlert` | `Boolean` | No | If omitted, calculated automatically based on `flameDetected`. |

#### Example Request
```http
POST /api/sensors HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "deviceId": "ESP32_NODE_01",
  "gasLevel": 450,
  "flameDetected": false
}
```

#### Successful Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "deviceId": "ESP32_NODE_01",
    "gasLevel": 450,
    "flameDetected": false,
    "gasAlert": true,
    "fireAlert": false,
    "timestamp": "2026-09-18T14:49:39.034Z",
    "_id": "6aad4f833b6336ed024df70b",
    "createdAt": "2026-09-18T14:49:39.045Z",
    "updatedAt": "2026-09-18T14:49:39.045Z",
    "__v": 0
  }
}
```

#### Error Response — Missing Required Field (`400 Bad Request`)
```json
{
  "success": false,
  "message": "gasLevel is required"
}
```

#### Error Response (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Failed to record sensor reading",
  "error": "Error details"
}
```

---

### 1.6 Get Latest Alert
Retrieves the most recent safety alert incident (gas leak, flame detected, or combined).

- **Method**: `GET`
- **URL**: `/api/alerts/latest`
- **Request Headers**: None
- **Query Parameters**: None
- **Request Body**: None

#### Example Request
```http
GET /api/alerts/latest HTTP/1.1
Host: localhost:5000
```

#### Successful Response (`200 OK` — Alert Present)
```json
{
  "success": true,
  "data": {
    "_id": "6aad502e8e5d49937525365e",
    "deviceId": "ESP32_NODE_01",
    "alertType": "COMBINED_HAZARD",
    "severity": "CRITICAL",
    "gasLevel": 820,
    "flameDetected": true,
    "message": "CRITICAL: Both gas leak (820 PPM) and fire detected simultaneously!",
    "timestamp": "2026-09-18T14:52:30.811Z",
    "createdAt": "2026-09-18T14:52:30.811Z",
    "updatedAt": "2026-09-18T14:52:30.811Z",
    "__v": 0
  }
}
```

#### Successful Response (`200 OK` — No Alerts Recorded)
```json
{
  "success": true,
  "data": null
}
```

#### Error Response (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Failed to retrieve latest alert",
  "error": "Error details"
}
```

---

### 1.7 Get Alert History
Retrieves past hazard alerts with optional filtering by severity or alert type.

- **Method**: `GET`
- **URL**: `/api/alerts`
- **Query Parameters**:
  - `limit` *(optional, integer)*: Maximum records to return. Default is `20`.
  - `severity` *(optional, string)*: Filter by severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
  - `alertType` *(optional, string)*: Filter by type: `GAS_LEAK`, `FIRE_DETECTED`, `COMBINED_HAZARD`.

#### Example Request
```http
GET /api/alerts?limit=10&severity=CRITICAL HTTP/1.1
Host: localhost:5000
```

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6aad502e8e5d49937525365e",
      "deviceId": "ESP32_NODE_01",
      "alertType": "COMBINED_HAZARD",
      "severity": "CRITICAL",
      "gasLevel": 820,
      "flameDetected": true,
      "message": "CRITICAL: Both gas leak (820 PPM) and fire detected simultaneously!",
      "timestamp": "2026-09-18T14:52:30.811Z",
      "createdAt": "2026-09-18T14:52:30.811Z",
      "updatedAt": "2026-09-18T14:52:30.811Z",
      "__v": 0
    }
  ]
}
```

#### Error Response (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Failed to retrieve alerts",
  "error": "Error details"
}
```

---

### 1.8 Common Error Responses

#### Route Not Found (`404 Not Found`)
When requesting an endpoint or method that is not registered:
```json
{
  "success": false,
  "message": "Endpoint not found: GET /api/invalid-route"
}
```

#### Global Error Fallback (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Specific error description"
}
```

---

## 2. Real-Time Socket.IO Events

The backend exposes a Socket.IO server on the same port (`http://localhost:5000`).

### 2.1 Connecting to Socket.IO

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
});
```

---

### 2.2 Event: `sensor-data`
Dispatched in real time whenever a new reading arrives from an ESP32 or manual API post.

#### Payload Structure:
```json
{
  "_id": "6aad4f833b6336ed024df70b",
  "deviceId": "ESP32_NODE_01",
  "gasLevel": 450,
  "flameDetected": false,
  "gasAlert": true,
  "fireAlert": false,
  "timestamp": "2026-09-18T14:49:39.034Z",
  "createdAt": "2026-09-18T14:49:39.045Z",
  "updatedAt": "2026-09-18T14:49:39.045Z",
  "__v": 0
}
```

#### Frontend Usage Example:
```javascript
socket.on('sensor-data', (telemetry) => {
  // Update live gauge / meter
  updateGasGauge(telemetry.gasLevel);

  // Update flame status indicator
  setFlameIndicator(telemetry.flameDetected);

  // Append to live telemetry graph
  chartData.push({ time: telemetry.timestamp, gas: telemetry.gasLevel });
});
```

---

### 2.3 Event: `alert`
Dispatched immediately when a safety condition breaches thresholds. Controlled by an in-memory 60-second cooldown per device to prevent flooding the client.

#### Payload Structure:
```json
{
  "_id": "6aad502e8e5d49937525365e",
  "deviceId": "ESP32_NODE_01",
  "alertType": "GAS_LEAK",
  "severity": "HIGH",
  "gasLevel": 550,
  "flameDetected": false,
  "message": "Gas leak warning! Gas level (550 PPM) exceeded threshold (400 PPM).",
  "timestamp": "2026-09-18T14:49:39.050Z"
}
```

#### Frontend Usage Example:
```javascript
socket.on('alert', (hazard) => {
  // Show modal alert or banner
  showHazardBanner({
    title: hazard.alertType,
    severity: hazard.severity,
    message: hazard.message,
    time: hazard.timestamp,
  });

  // Play audio warning if critical
  if (hazard.severity === 'CRITICAL') {
    playAlertSiren();
  }
});
```

---

## 3. Safety Alerts: Types & Severity

| Alert Type | Severity | Trigger Condition |
| :--- | :--- | :--- |
| `GAS_LEAK` | `HIGH` | `gasLevel >= 400` AND `flameDetected === false` |
| `FIRE_DETECTED` | `CRITICAL` | `flameDetected === true` AND `gasLevel < 400` |
| `COMBINED_HAZARD` | `CRITICAL` | `gasLevel >= 400` AND `flameDetected === true` |

- **Cooldown Mechanism**: Once an alert is triggered, repeated readings within **60 seconds** for that device will not generate duplicate database entries or repeated alert events.
- **Normal State Reset**: When gas drops below 400 PPM and flame ceases, the system resets to normal. Any subsequent hazard will trigger an alert immediately.

---

## 4. Hardware Integration (MQTT Telemetry)

For reference or when demonstrating hardware connection with ESP32:

- **Broker**: `mqtt://broker.hivemq.com:1883` (or local broker configured in `.env`)
- **Telemetry Ingestion Topic**: `iotap/sensor/data`
- **Hazard Actuator Topic**: `iotap/sensor/alerts` (ESP32 subscribes here to trigger buzzer/exhaust fan)

#### Expected JSON Payload from ESP32:
```json
{
  "deviceId": "ESP32_NODE_01",
  "gasLevel": 450,
  "flameDetected": false
}
```

---

## 5. Complete Frontend Connection Example (React / Next.js / Vite)

```javascript
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

export default function GasFireDashboard() {
  const [reading, setReading] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Fetch initial status on load
    fetch(`${BACKEND_URL}/api/sensors/latest`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) setReading(res.data);
      })
      .catch((err) => console.error('Error fetching initial reading:', err));

    // 2. Connect to Socket.IO for live streaming
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to backend Socket.IO. Socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 3. Listen for continuous real-time sensor updates
    socket.on('sensor-data', (data) => {
      setReading(data);
    });

    // 4. Listen for critical safety alerts
    socket.on('alert', (alert) => {
      setActiveAlert(alert);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Smart Gas & Fire Monitoring Dashboard</h1>
      <p>Connection: {isConnected ? '🟢 Online' : '🔴 Offline'}</p>

      {activeAlert && (
        <div style={{ background: '#ffdddd', border: '2px solid red', padding: '15px', borderRadius: '8px', margin: '15px 0' }}>
          <h3>⚠️ {activeAlert.alertType} ({activeAlert.severity})</h3>
          <p>{activeAlert.message}</p>
        </div>
      )}

      {reading ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
            <h3>Gas Concentration</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{reading.gasLevel} PPM</p>
            <p>Status: {reading.gasAlert ? '⚠️ Hazard' : '✅ Normal'}</p>
          </div>

          <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
            <h3>Flame Detection</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {reading.flameDetected ? '🔥 FLAME DETECTED' : '🛡️ Safe'}
            </p>
            <p>Status: {reading.fireAlert ? '⚠️ Fire Alarm' : '✅ Normal'}</p>
          </div>
        </div>
      ) : (
        <p>Waiting for sensor readings...</p>
      )}
    </div>
  );
}
```
