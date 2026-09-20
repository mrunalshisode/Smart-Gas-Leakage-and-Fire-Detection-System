# IoTAP Smart Gas Leakage and Fire Detection System

A complete full-stack IoT safety solution providing real-time telemetry, automated hazard evaluation, emergency actuation, and live web monitoring for industrial and residential environments.

---

## Repository Architecture (Monorepo)

```
Smart-Gas-Leakage-and-Fire-Detection-System/
├── .gitignore                      # Root Git exclusion rules (.env, node_modules, dist)
├── README.md                       # Full-Stack documentation and startup guide
├── backend/                        # Node.js, Express, MQTT, Socket.IO, and MongoDB
│   ├── .env.example                # Backend environment template
│   ├── package.json
│   ├── API_DOCUMENTATION.md        # Complete REST API reference
│   ├── MQTT_HARDWARE_INTEGRATION.md# Hardware wiring and Arduino sketch
│   ├── FINAL_BACKEND_TEST_REPORT.md# Test suite report and verification logs
│   ├── scripts/                    # Automated testing & verification suites
│   │   ├── runFinalReadinessSuite.js
│   │   ├── testAlertCooldown.js
│   │   ├── testAlertScenarios.js
│   │   ├── testMqttIntegration.js
│   │   ├── testMqttToSocketIO.js
│   │   ├── testSocketClient.js
│   │   ├── verifyUserScenarios.js
│   │   └── finalTestResults.json
│   └── src/                        # Core backend source
│       ├── app.js                  # Express app and middleware
│       ├── server.js               # HTTP, Socket.IO, and MQTT server entry
│       ├── config/                 # DB, MQTT, and Socket.IO configuration
│       ├── controllers/            # Sensor and Alert route controllers
│       ├── models/                 # Mongoose schemas (SensorLog, Alert)
│       ├── routes/                 # REST route definitions
│       └── services/               # Hazard evaluation & alert deduplication
└── frontend/                       # React 18, Vite, Socket.IO Client dashboard
    ├── .env.example                # Frontend environment template
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx                 # Dashboard root container
        ├── main.jsx                # Application mounting
        ├── styles.css              # Dashboard styling
        ├── components/             # Reusable UI cards, charts, and tables
        │   ├── ActiveAlertBanner.jsx
        │   ├── AlertsPanel.jsx
        │   ├── BuzzerControl.jsx
        │   ├── ConnectivityStrip.jsx
        │   ├── GasLineChart.jsx
        │   ├── Header.jsx
        │   ├── SafetyStatusCard.jsx
        │   ├── SensorCard.jsx
        │   ├── SensorHistoryTable.jsx
        │   ├── SensorLineChart.jsx
        │   ├── SystemOverview.jsx
        │   └── TemperatureLineChart.jsx
        └── services/
            └── safetyDataService.js# Real REST and Socket.IO client service
```

---

## Key Features

* **Dual Hazard Detection**: Continuous monitoring of combustible/toxic gases (MQ-2 Sensor) and open flames (Optical Flame Sensor).
* **Automated Safety Actuation**: Instant local activation of acoustic alarms (Buzzer) and exhaust ventilation (Fan).
* **Alert Deduplication & Cooldown**: Smart 60-second cooldown suppression stops spam while state changes trigger instant emergency dispatching.
* **Bi-directional Real-Time Communication**:
  * Telemetry ingested from hardware via MQTT (`iotap/sensor/data`).
  * Instant browser dispatching via WebSockets (`sensor-data` and `alert` events).
  * Outbound actuator notifications published over MQTT (`iotap/sensor/alerts`).
* **Zero Mock Telemetry**: Production-ready frontend connected directly to real REST endpoints and WebSocket feeds.

---

## Quickstart Guide

### 1. Prerequisites
* Node.js (v18.0 or higher)
* MongoDB (v6.0 or higher running locally at `mongodb://127.0.0.1:27017`)
* MQTT Broker access (defaults to HiveMQ public broker: `broker.hivemq.com`)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm start
# Server listens on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Dashboard launches on http://localhost:5173
```

---

## Testing & Verification

Run the automated backend test suites from the `backend/` directory:

```bash
# 1. Full Backend Readiness Test Suite (23 automated checks)
node scripts/runFinalReadinessSuite.js

# 2. MQTT & IoT Integration Test Suite (11 automated checks)
node scripts/testMqttIntegration.js

# 3. User Scenarios Test (Normal, Gas Leak, Fire, Cooldown, Socket.IO)
node scripts/verifyUserScenarios.js
```

Build the frontend bundle:
```bash
cd frontend
npm run build
```

---

## Hazard State Matrix

| State | Gas PPM | Flame | Buzzer | Exhaust Fan | Alert Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NORMAL** | `< 400` | `false` | OFF | OFF | Safe |
| **GAS_LEAK** | `≥ 400` | `false` | ON | ON | HIGH |
| **FIRE_DETECTED** | Any | `true` | ON | OFF | CRITICAL |
| **COMBINED_HAZARD**| `≥ 400` | `true` | ON | ON | CRITICAL |

