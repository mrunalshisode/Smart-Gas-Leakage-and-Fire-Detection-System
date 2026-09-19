# ESP32 Hardware Integration Guide
## Member 2 — MQTT & IoT Communication
### IoTAP Smart Gas Leakage and Fire Detection System

---

## 1. Overview

This document provides complete instructions for connecting the **ESP32 microcontroller** to the **IoTAP Backend** via MQTT. The ESP32 collects analog gas concentration data (MQ-2) and infrared flame detection signals, packages them into JSON payloads, and publishes them to the backend broker. In return, the ESP32 subscribes to the alert topic to trigger local visual and acoustic actuators (piezo buzzer, alarm LEDs, exhaust relay).

```
   ┌─────────────────────────────────────────────────────────────┐
   │                     ESP32 Hardware Node                     │
   │                                                             │
   │   [MQ-2 Gas Sensor]   ───────► GPIO 34 (ADC1_CH6)           │
   │   [IR Flame Sensor]   ───────► GPIO 35 (Digital In)         │
   │   [Active Buzzer]     ◄─────── GPIO 25 (Digital Out)        │
   │   [Red Alert LED]     ◄─────── GPIO 26 (Digital Out)        │
   │   [Fan / Relay]       ◄─────── GPIO 27 (Digital Out)        │
   └───────────────────────────────┬─────────────────────────────┘
                                   │ Wi-Fi / MQTT
                                   ▼
        MQTT Broker: broker.hivemq.com:1883
        ├── Ingestion: iotap/sensor/data (ESP32 -> Backend)
        └── Alerts:    iotap/sensor/alerts (Backend -> ESP32)
                                   │
                                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     Node.js Backend                         │
   │  - Express REST APIs                                        │
   │  - MongoDB Persistence (SensorLog & Alert collections)      │
   │  - AlertManager (Cooldown & Deduplication)                  │
   │  - Socket.IO Real-Time Push to Dashboards                   │
   └─────────────────────────────────────────────────────────────┘
```

---

## 2. Bill of Materials (BOM)

| Component | Quantity | Purpose | Pin Type |
| :--- | :---: | :--- | :--- |
| **ESP32 DevKit V1** (30-pin or 38-pin) | 1 | Microcontroller with built-in Wi-Fi & TCP/IP stack | Micro-USB / 3.3V Logic |
| **MQ-2 Gas Sensor Module** | 1 | Detects LPG, Propane, Methane, Smoke, Alcohol | Analog Out (AOUT) -> 0-3.3V (via divider) |
| **IR Flame Sensor Module** (LM393) | 1 | Detects fire/infrared emission (760nm - 1100nm) | Digital Out (DOUT) -> Active LOW/HIGH |
| **5V Active Piezo Buzzer** | 1 | Acoustic hazard alarm | Digital GPIO (via 2N2222 NPN or direct) |
| **5V Single-Channel Relay Module** | 1 | Drives high-current exhaust fan or solenoid valve | Digital GPIO (Active LOW/HIGH) |
| **LED Indicators** (Green, Red, Yellow) | 3 | Normal, Gas Warning, Fire Alert status | Current limit with 330Ω resistors |
| **Breadboard & Jumper Wires** | - | Prototyping interconnects | DuPont Male-to-Male / Male-to-Female |

---

## 3. Wiring & GPIO Pin Mapping

> [!CAUTION]
> The ESP32 GPIO pins operate at **3.3V logic**. The MQ-2 sensor heater requires **5V (VCC)** for proper operation. When connecting the MQ-2 Analog Out (AOUT) to the ESP32 ADC, ensure the output does not exceed 3.3V (use a simple 2-resistor voltage divider if AOUT exceeds 3.3V).

| ESP32 GPIO | Connected Component Pin | Signal Type | Notes |
| :--- | :--- | :--- | :--- |
| **3V3** | Flame Sensor VCC, Status LEDs | Power (3.3V) | Supplies sensors requiring 3.3V |
| **VIN / 5V** | MQ-2 Sensor VCC, Relay Module VCC | Power (5V) | Powered from USB 5V rail |
| **GND** | Common Ground (All modules) | Ground | Common reference ground |
| **GPIO 34** | MQ-2 Gas Sensor **AOUT** | Analog Input (ADC1) | ADC1 is safe to use with Wi-Fi enabled |
| **GPIO 35** | Flame Sensor **DOUT** | Digital Input | Pull-up configured in software |
| **GPIO 25** | Active Buzzer (+) | Digital Output | HIGH = Sound alarm, LOW = Silent |
| **GPIO 26** | Red Warning LED (+) | Digital Output | HIGH = Alert ON (use 330Ω resistor) |
| **GPIO 27** | Exhaust Fan Relay **IN** | Digital Output | Energizes relay to vent gas |
| **GPIO 14** | Green Normal LED (+) | Digital Output | HIGH = System healthy |

---

## 4. MQTT Topics & Protocol Specifications

### Ingestion Topic: `iotap/sensor/data` (Publish)
* **Direction**: ESP32 &rarr; Backend
* **QoS**: 0
* **Payload Format**:
```json
{
  "deviceId": "ESP32_NODE_01",
  "gasLevel": 450.5,
  "flameDetected": false
}
```

### Alert Topic: `iotap/sensor/alerts` (Subscribe)
* **Direction**: Backend &rarr; ESP32
* **QoS**: 0
* **Payload Format Received by ESP32**:
```json
{
  "deviceId": "ESP32_NODE_01",
  "alertType": "GAS_LEAK",
  "severity": "HIGH",
  "gasLevel": 450.5,
  "flameDetected": false,
  "message": "Gas leak warning! Gas level (450.5 PPM) exceeded threshold (400 PPM).",
  "timestamp": "2026-09-19T05:08:43.123Z"
}
```

---

## 5. Arduino C++ Firmware Sketch

### Required Arduino Libraries:
Install the following libraries in Arduino IDE (Sketch &rarr; Include Library &rarr; Manage Libraries):
1. **PubSubClient** by Nick O'Leary (v2.8+)
2. **ArduinoJson** by Benoît Blanchon (v6.21+ or v7.x)

### Complete Firmware Code:
Save as `iotap_esp32_node.ino`:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// Network & Broker Configuration
// ==========================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;
const char* TOPIC_SENSOR  = "iotap/sensor/data";
const char* TOPIC_ALERT   = "iotap/sensor/alerts";

const char* DEVICE_ID     = "ESP32_NODE_01";

// ==========================================
// GPIO Pin Definitions
// ==========================================
const int PIN_GAS_ANALOG   = 34; // MQ-2 Analog AOUT (ADC1)
const int PIN_FLAME_DIGITAL= 35; // Flame DOUT
const int PIN_BUZZER       = 25; // Active buzzer
const int PIN_RED_LED      = 26; // Hazard alarm LED
const int PIN_RELAY_FAN    = 27; // Exhaust fan relay
const int PIN_GREEN_LED    = 14; // Normal status LED

// ==========================================
// Timing Variables
// ==========================================
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // Send reading every 2 seconds

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ==========================================
// Actuator Trigger Routine
// ==========================================
void triggerAlarm(const char* alertType, const char* severity) {
  Serial.printf("[ALARM TRIGGERED] Type: %s | Severity: %s\n", alertType, severity);

  digitalWrite(PIN_GREEN_LED, LOW);
  digitalWrite(PIN_RED_LED, HIGH);

  if (strcmp(alertType, "GAS_LEAK") == 0) {
    // Intermittent beep + exhaust fan
    digitalWrite(PIN_RELAY_FAN, HIGH); // Turn on exhaust fan
    for (int i = 0; i < 3; i++) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(150);
      digitalWrite(PIN_BUZZER, LOW);
      delay(150);
    }
  } else if (strcmp(alertType, "FIRE_DETECTED") == 0) {
    // Rapid siren
    digitalWrite(PIN_RELAY_FAN, LOW); // Fan OFF during fire to avoid feeding oxygen
    for (int i = 0; i < 5; i++) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(80);
      digitalWrite(PIN_BUZZER, LOW);
      delay(80);
    }
  } else if (strcmp(alertType, "COMBINED_HAZARD") == 0) {
    // Continuous alarm
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_RELAY_FAN, HIGH);
    delay(1000);
    digitalWrite(PIN_BUZZER, LOW);
  }
}

void clearAlarm() {
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_RED_LED, LOW);
  digitalWrite(PIN_RELAY_FAN, LOW);
  digitalWrite(PIN_GREEN_LED, HIGH);
}

// ==========================================
// MQTT Incoming Message Callback
// ==========================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT Callback] Message arrived on topic: ");
  Serial.println(topic);

  // Parse JSON alert payload
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("[MQTT Callback] JSON parse failed: ");
    Serial.println(error.f_str());
    return;
  }

  const char* targetDevice = doc["deviceId"] | "";
  const char* alertType    = doc["alertType"] | "UNKNOWN";
  const char* severity     = doc["severity"]  | "HIGH";
  const char* message      = doc["message"]   | "";

  // Actuate only if message is targeted to this node or broadcast
  if (strlen(targetDevice) == 0 || strcmp(targetDevice, DEVICE_ID) == 0) {
    Serial.printf("[ALERT RECEIVED] %s: %s\n", alertType, message);
    triggerAlarm(alertType, severity);
  }
}

// ==========================================
// Connection Management
// ==========================================
void setupWiFi() {
  delay(10);
  Serial.printf("\nConnecting to Wi-Fi: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[Wi-Fi] Connected successfully!");
  Serial.print("[Wi-Fi] IP Address: ");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting connection to broker... ");
    String clientId = "ESP32_Node_" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("CONNECTED!");
      // Subscribe to alert feedback topic
      mqttClient.subscribe(TOPIC_ALERT);
      Serial.printf("[MQTT] Subscribed to topic: %s\n", TOPIC_ALERT);
    } else {
      Serial.print("FAILED, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 3 seconds...");
      delay(3000);
    }
  }
}

// ==========================================
// Main Setup
// ==========================================
void setup() {
  Serial.begin(115200);

  pinMode(PIN_GAS_ANALOG, INPUT);
  pinMode(PIN_FLAME_DIGITAL, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RED_LED, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);
  pinMode(PIN_GREEN_LED, OUTPUT);

  // Initial healthy state
  clearAlarm();

  setupWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

// ==========================================
// Main Loop
// ==========================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Periodic Telemetry Publishing
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    // Read Sensors
    // ADC 12-bit range: 0 - 4095
    int rawGas = analogRead(PIN_GAS_ANALOG);
    // Convert ADC to approximate calibrated PPM (scale factor varies by calibration)
    float gasPPM = map(rawGas, 0, 4095, 50, 1000);

    // Flame sensor DOUT is typically active LOW (LOW = flame present)
    bool flameDetected = (digitalRead(PIN_FLAME_DIGITAL) == LOW);

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["deviceId"]      = DEVICE_ID;
    doc["gasLevel"]      = gasPPM;
    doc["flameDetected"] = flameDetected;

    char buffer[256];
    size_t len = serializeJson(doc, buffer);

    bool published = mqttClient.publish(TOPIC_SENSOR, buffer, len);
    if (published) {
      Serial.printf("[Telemetry Sent] Gas: %.1f PPM | Flame: %s\n", gasPPM, flameDetected ? "YES" : "NO");
    } else {
      Serial.println("[Telemetry Error] Failed to publish sensor packet.");
    }

    // If reading is completely safe, ensure normal LED is ON
    if (gasPPM < 400 && !flameDetected) {
      digitalWrite(PIN_GREEN_LED, HIGH);
      digitalWrite(PIN_RED_LED, LOW);
    }
  }
}
```

---

## 6. Sensor Calibration & Pre-requisites

### MQ-2 Gas Sensor:
1. **Pre-heating / Burn-in Period**: The MQ-2 requires a 24 to 48-hour continuous burn-in upon initial power-up for the internal tin dioxide ($SnO_2$) heating layer to stabilize.
2. **Clean Air Baseline**: Test in fresh air first. Note the ADC reading (typically 100-300 on ADC 0-4095).
3. **Threshold Calibration**: The backend defaults to `GAS_THRESHOLD_PPM=400`. Adjust this threshold in `.env` or calibrate your sensor mapping formula according to your specific gas source.

### IR Flame Sensor:
1. **Sensitivity Potentiometer**: The onboard blue trimmer pot on the LM393 module adjusts detection sensitivity.
2. **Ambient Light Tuning**: Turn the potentiometer until the sensor LED turns OFF under ambient room lighting, and lights up reliably when a lighter flame is placed 20–50 cm away.

---

## 7. Verification & Troubleshooting

### Using the HiveMQ Web Client:
1. Open the [HiveMQ Web Client](http://www.hivemq.com/demos/websocket-client/).
2. Connect to `broker.hivemq.com` on port `8000` (WebSocket) or port `1883`.
3. Subscribe to `iotap/sensor/data` to watch live packets from your ESP32.
4. Publish a test hazard to `iotap/sensor/alerts` to test your buzzer and LEDs:
   ```json
   {
     "deviceId": "ESP32_NODE_01",
     "alertType": "GAS_LEAK",
     "severity": "HIGH",
     "gasLevel": 620,
     "flameDetected": false,
     "message": "Manual test alert"
   }
   ```
