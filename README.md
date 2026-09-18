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

## MQTT Integration (ESP32)

### 1. Ingestion Topic: `iotap/sensor/data`
The backend listens on `MQTT_TOPIC_SENSOR` for incoming JSON messages from the ESP32:

```json
{
  "deviceId": "ESP32_NODE_01",
  "gasLevel": 450,
  "flameDetected": true
}
```

### 2. Alert Topic: `iotap/sensor/alerts`
When a hazard is triggered (gas exceeds `GAS_THRESHOLD_PPM` or flame is detected), the backend publishes an alert payload back to this topic (useful for activating an ESP32 buzzer, siren, or exhaust fan).

---

## Real-Time Events (Socket.IO)

Clients connecting to Socket.IO can listen to:
- **`sensor-data`**: Emitted whenever new sensor data arrives.
- **`alert`**: Emitted immediately when gas leakage or fire is detected.

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/sensors/latest` | Retrieve the latest sensor reading |
| `GET` | `/api/sensors/history?limit=50` | Retrieve past sensor readings |
| `POST` | `/api/sensors` | Manually log sensor reading (for testing) |
| `GET` | `/api/alerts?limit=20` | Retrieve recent alerts |
| `GET` | `/api/alerts/latest` | Retrieve the single latest alert |
