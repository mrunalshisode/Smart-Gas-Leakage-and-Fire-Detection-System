# Smart Gas Leakage & Fire Detection System - Backend

Backend service and database layer for the IoTAP project **Smart Gas Leakage and Fire Detection System**. Built with Node.js, Express, MongoDB (Mongoose), MQTT, and Socket.IO.

---

## Features

- **Modular Architecture**: Clean separation of configurations, models, controllers, and routes.
- **ESP32 Ready via MQTT**: Ingests sensor telemetry (`gasLevel`, `flameDetected`, `deviceId`) published by ESP32 over MQTT.
- **Automated Hazard Detection**: Detects gas leakage breaches and flame signals; immediately generates incident alerts.
- **Real-Time Push via Socket.IO**: Broadcasts live telemetry and urgent alerts to web or mobile clients.
- **REST API**: Endpoints to query the latest sensor status, historical logs, and alert logs.
- **Configurable**: Fully managed with environment variables (`.env`).

---

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js             # MongoDB connection setup
│   │   ├── mqtt.js           # MQTT client connection & incoming message handler
│   │   └── socket.js         # Socket.IO initialization & real-time broadcast helper
│   │
│   ├── models/
│   │   ├── SensorLog.js      # Schema for gas levels (PPM) & flame status
│   │   └── Alert.js          # Schema for gas leak and fire incident records
│   │
│   ├── controllers/
│   │   ├── sensorController.js # Logic for fetching latest/historical readings
│   │   └── alertController.js  # Logic for fetching alerts
│   │
│   ├── routes/
│   │   ├── sensorRoutes.js   # API routes: /api/sensors/latest, /history
│   │   └── alertRoutes.js    # API routes: /api/alerts
│   │
│   ├── app.js                # Express app configuration & middleware
│   └── server.js             # Main server entry point (HTTP + Socket.IO + MQTT)
│
├── .env                      # Local environment configuration
├── .env.example              # Template for environment variables
├── .gitignore
└── package.json
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18+ or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI.
- **MQTT Broker**: A local broker (like Mosquitto) or a public test broker (e.g., `mqtt://broker.hivemq.com:1883`).

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` if not already created:
```bash
cp .env.example .env
```
Default `.env` settings:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/iotap_gas_fire_db
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
MQTT_TOPIC_SENSOR=iotap/sensor/data
MQTT_TOPIC_ALERT=iotap/sensor/alerts
GAS_THRESHOLD_PPM=400
```

### 4. Run the Server
- **Development mode** (with auto-reload via `nodemon`):
  ```bash
  npm run dev
  ```
- **Production mode**:
  ```bash
  npm start
  ```

---

## MQTT & IoT Communication (ESP32 Integration)

The backend provides a high-performance, bidirectional MQTT integration designed for direct interfacing with ESP32 microcontroller nodes.

### 1. MQTT Configuration (.env)

| Environment Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `MQTT_BROKER_URL` | `mqtt://broker.hivemq.com:1883` | MQTT Broker connection URL |
| `MQTT_TOPIC_SENSOR` | `iotap/sensor/data` | Ingestion topic for ESP32 sensor telemetry |
| `MQTT_TOPIC_ALERT` | `iotap/sensor/alerts` | Publication topic for actuator & buzzer feedback |
| `GAS_THRESHOLD_PPM` | `400` | Safety threshold for gas leakage alert |
| `ALERT_COOLDOWN_SECONDS`| `60` | Cooldown period to suppress repetitive duplicate alerts |

---

### 2. Telemetry Ingestion Topic: `iotap/sensor/data`

The ESP32 publishes sensor readings as JSON to `MQTT_TOPIC_SENSOR`.

#### Ingestion Payload Format
```json
{
  "deviceId": "ESP32_NODE_01",
  "gasLevel": 450,
  "flameDetected": false,
  "gasAlert": true,
  "fireAlert": false
}
```

#### Field Specifications:
* **`deviceId`** *(string, optional, default: `"ESP32_NODE_01"`)*: Unique identifier of the hardware node.
* **`gasLevel`** *(number, required)*: Gas sensor reading in PPM or calibrated ADC (e.g., MQ-2 output). Must be non-negative.
* **`flameDetected`** *(boolean | number, required)*: State of the flame/IR sensor. Supports boolean (`true`/`false`), digital integers (`1`/`0`), or string representations (`"true"`/`"1"`).
* **`gasAlert`** *(boolean, optional)*: Explicit gas alert flag. If omitted, backend evaluates `gasLevel >= GAS_THRESHOLD_PPM`.
* **`fireAlert`** *(boolean, optional)*: Explicit fire alert flag. If omitted, defaults to `flameDetected`.

#### Backend Ingestion Pipeline:
1. **Validation & Normalization**: Validates JSON structure, rejects malformed/negative values, and normalizes ESP32 digital outputs.
2. **MongoDB Storage**: Persists reading into `SensorLog` collection with timestamp.
3. **Socket.IO Broadcast**: Emits live `sensor-data` event to all connected dashboard clients.
4. **Hazard Evaluation**: Compares readings against safety thresholds and triggers incident alerts if hazardous.

---

### 3. Alert Feedback Topic: `iotap/sensor/alerts`

When a hazard occurs, the backend publishes an alert payload back to `MQTT_TOPIC_ALERT` (`QoS 0`). The ESP32 subscribes to this topic to activate local actuators (e.g., piezobuzzer, alarm LEDs, exhaust fan relay).

#### Alert Publication Payload Format
```json
{
  "deviceId": "ESP32_NODE_01",
  "alertType": "GAS_LEAK",
  "severity": "HIGH",
  "gasLevel": 580,
  "flameDetected": false,
  "message": "Gas leak warning! Gas level (580 PPM) exceeded threshold (400 PPM).",
  "timestamp": "2026-09-19T05:08:43.123Z",
  "_id": "6aae18cda8c6040bb7040157"
}
```

#### Alert Types & Severity Matrix:
| Hazard Condition | Alert Type | Severity | Default Action |
| :--- | :--- | :--- | :--- |
| `gasLevel >= 400` & `flame == false` | `GAS_LEAK` | `HIGH` | Buzzer beeps, yellow warning LED, exhaust fan ON |
| `flameDetected == true` & `gas < 400` | `FIRE_DETECTED` | `CRITICAL` | Siren alarms, red strobe LED, emergency alert |
| `gasLevel >= 400` & `flame == true` | `COMBINED_HAZARD` | `CRITICAL` | Continuous siren, solenoid gas cutoff valve |

---

### 4. Alert Cooldown & Deduplication Logic

* **60-Second Cooldown**: If an active hazard continues, duplicate alerts are suppressed for 60 seconds to prevent alert flooding.
* **Immediate Reset on Normal State**: When readings return to safe levels (`gasLevel < 400` and `flame == false`), the hazard state resets immediately. Any subsequent hazard will trigger an alert without waiting for cooldown.
* **Per-Device Tracking**: Each hardware node (`deviceId`) is tracked independently in memory.

---

### 5. Hardware Integration Guide

For full ESP32 circuit schematics, pin mappings (MQ-2, flame sensor, buzzer, relay), and a complete ready-to-flash Arduino C++ firmware sketch using `PubSubClient` and `ArduinoJson`, see **[MQTT_HARDWARE_INTEGRATION.md](./MQTT_HARDWARE_INTEGRATION.md)**.

---

### 6. Real-Time Events (Socket.IO)

Connected frontend clients listen for:
* **`sensor-data`**: Dispatched on every incoming telemetry packet.
* **`alert`**: Dispatched immediately on hazard onset.

---

### 7. Automated Test Suites

Run the following scripts to verify backend, MQTT, and real-time features:

```bash
# Run dedicated Member 2 MQTT Integration test suite
npm run test:mqtt

# Run comprehensive end-to-end backend readiness test suite (23 tests)
npm run test:e2e
```

---

### 8. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check & uptime |
| `GET` | `/api/sensors/latest` | Retrieve the latest sensor reading |
| `GET` | `/api/sensors/history?limit=50` | Retrieve chronological sensor readings |
| `POST` | `/api/sensors` | Manually log sensor reading |
| `GET` | `/api/alerts?limit=20` | Retrieve recent alerts (supports `severity` & `alertType` filters) |
| `GET` | `/api/alerts/latest` | Retrieve single most recent alert |

