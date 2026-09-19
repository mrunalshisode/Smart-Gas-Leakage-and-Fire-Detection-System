import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Formats timestamps into human-readable HH:MM:SS AM/PM format
 */
export function formatTime(timestamp) {
  if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Formats date into readable format: "20 Sep 2026, 12:30 AM"
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '--';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Converts backend uptime seconds into standard HH:MM:SS format
 */
export function formatUptime(uptimeSeconds) {
  if (typeof uptimeSeconds !== 'number' || isNaN(uptimeSeconds)) return '00:00:00';
  const total = Math.floor(uptimeSeconds);
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Derives overall system status from gas level and flame detection
 */
export function calculateOverallStatus(gasLevel, flameDetected, isOnline = true) {
  if (!isOnline) {
    return 'DEVICE OFFLINE';
  }
  const isFlame = Boolean(flameDetected);
  const numericGas = Number(gasLevel) || 0;
  if (isFlame && numericGas >= 400) {
    return 'COMBINED HAZARD';
  }
  if (isFlame) {
    return 'FIRE DETECTED';
  }
  if (numericGas >= 700) {
    return 'DANGER';
  }
  if (numericGas >= 400) {
    return 'GAS LEAK DETECTED';
  }
  return 'SYSTEM SAFE';
}

/**
 * Normalizes any telemetry payload (from REST API, Socket.IO, or raw ESP32 MQTT)
 * Supports gasLevel, gasValue, flameDetected, flame, temperature, temp, etc.
 * DO NOT invent fake temperature: if null or undefined, preserves null!
 */
export function normalizeTelemetry(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Unwrap { data: ... } or { payload: ... } if nested
  const data = raw.data || raw.payload || raw.reading || raw;

  // Gas level: accept gasLevel, gasValue, gas, gas_level, ppm, or value
  const rawGas = data.gasLevel ?? data.gasValue ?? data.gas ?? data.gas_level ?? data.ppm ?? data.value ?? 0;
  const gasLevel = Number(rawGas) >= 0 && !isNaN(Number(rawGas)) ? Number(rawGas) : 0;

  // Flame detection: accept flameDetected, flame, isFlame, fire, flameStatus
  const rawFlame = data.flameDetected ?? data.flame ?? data.isFlame ?? data.fire ?? data.flame_detected;
  const flameDetected =
    rawFlame === true ||
    rawFlame === 1 ||
    rawFlame === '1' ||
    rawFlame === 'true' ||
    rawFlame === 'Flame Detected' ||
    rawFlame === 'Detected';

  // Temperature: ONLY use if explicitly provided by hardware, DO NOT invent fake 28.0 C!
  const rawTemp = data.temperature ?? data.temp ?? data.temperatureValue ?? data.tempC;
  const temperature =
    rawTemp !== undefined && rawTemp !== null && rawTemp !== '' && !isNaN(Number(rawTemp))
      ? Number(rawTemp)
      : null;

  // Alerts
  const gasAlert = data.gasAlert !== undefined ? Boolean(data.gasAlert) : gasLevel >= 400;
  const fireAlert = data.fireAlert !== undefined ? Boolean(data.fireAlert) : flameDetected;

  // Actuators
  const buzzerOn = data.buzzerOn ?? data.buzzer ?? data.buzzerState ?? (gasAlert || fireAlert);
  const ledOn = data.ledOn ?? data.led ?? data.ledState ?? (gasAlert || fireAlert);

  const deviceId = data.deviceId || data.id || 'ESP32_NODE_01';
  const timestamp = data.timestamp || data.createdAt || new Date().toISOString();

  return {
    _id: data._id || null,
    deviceId,
    gasLevel,
    gasValue: gasLevel, // Provide both aliases
    flameDetected,
    temperature, // May be null if hardware did not supply temperature
    gasAlert,
    fireAlert,
    buzzerOn: Boolean(buzzerOn),
    ledOn: Boolean(ledOn),
    timestamp,
  };
}

/**
 * GET /api/health - Retrieves service health and MQTT status
 */
export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('[API Health] Request failed:', err.message);
    return null;
  }
}

/**
 * GET /api/sensors/latest - Retrieves the single latest sensor reading
 */
export async function fetchLatestSensor() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sensors/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return normalizeTelemetry(json.data);
    }
    return null;
  } catch (err) {
    console.warn('[API Latest Sensor] Request failed:', err.message);
    return null;
  }
}

/**
 * GET /api/sensors/history?limit=50 - Retrieves historical telemetry readings
 */
export async function fetchSensorHistory(limit = 50) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sensors/history?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map((item) => normalizeTelemetry(item)).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.warn('[API Sensor History] Request failed:', err.message);
    return [];
  }
}

/**
 * GET /api/alerts?limit=20 - Retrieves historical safety hazard alerts
 */
export async function fetchAlerts(limit = 20) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/alerts?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.warn('[API Alerts] Request failed:', err.message);
    return [];
  }
}

/**
 * Exports history array as a downloadable CSV file
 */
export function exportHistoryToCSV(history) {
  if (!history || history.length === 0) {
    alert('No telemetry data available to export.');
    return;
  }

  const headers = ['Time', 'Device ID', 'Gas Level (PPM)', 'Temperature (C)', 'Flame Sensor', 'System Status'];
  const rows = history.map((item) => [
    `"${item.time || ''}"`,
    `"${item.deviceId || 'ESP32'}"`,
    item.gasLevel ?? item.gasValue ?? 0,
    item.temperature !== null && item.temperature !== undefined ? `${item.temperature} C` : 'Unavailable',
    `"${item.flameStatus || 'No Flame'}"`,
    `"${item.systemStatus || 'SAFE'}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `IoTAP_Sensor_Data_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Fetches initial snapshot of data from backend REST APIs on application mount
 */
export async function fetchDashboardSnapshot() {
  const [health, latestSensor, history, alerts] = await Promise.all([
    fetchHealth(),
    fetchLatestSensor(),
    fetchSensorHistory(50),
    fetchAlerts(20),
  ]);

  const isBackendOnline = Boolean(health && health.status === 'OK');
  const mqttStatus =
    health?.mqtt === 'connected'
      ? 'Connected'
      : health?.mqtt === 'connecting'
      ? 'Connecting'
      : isBackendOnline
      ? 'Connected'
      : 'Offline';

  const currentReading = latestSensor || {
    deviceId: 'ESP32_NODE_01',
    gasLevel: 0,
    gasValue: 0,
    flameDetected: false,
    temperature: null, // Temperature sensor not connected by default
    gasAlert: false,
    fireAlert: false,
    buzzerOn: false,
    ledOn: false,
    timestamp: new Date().toISOString(),
  };

  const overallStatus = calculateOverallStatus(currentReading.gasLevel, currentReading.flameDetected, isBackendOnline);

  const formattedHistory = history.map((item) => ({
    time: formatTime(item.timestamp),
    rawTimestamp: item.timestamp,
    deviceId: item.deviceId || currentReading.deviceId,
    gasLevel: item.gasLevel,
    gasValue: item.gasValue,
    temperature: item.temperature,
    flameStatus: item.flameDetected ? 'Flame Detected' : 'No Flame',
    systemStatus: calculateOverallStatus(item.gasLevel, item.flameDetected, true),
  }));

  const gasTrend = history
    .slice(0, 30)
    .reverse()
    .map((item) => ({
      time: formatTime(item.timestamp),
      value: item.gasLevel,
      rawTimestamp: item.timestamp,
    }));

  const temperatureTrend = history
    .filter((item) => item.temperature !== null && item.temperature !== undefined)
    .slice(0, 30)
    .reverse()
    .map((item) => ({
      time: formatTime(item.timestamp),
      value: item.temperature,
      rawTimestamp: item.timestamp,
    }));

  const formattedAlerts = alerts.map((a) => ({
    id: a._id || a.timestamp || String(Math.random()),
    type: a.alertType || 'HAZARD',
    severity: a.severity || 'HIGH',
    gasLevel: a.gasLevel ?? null,
    message: a.message || 'Safety hazard detected',
    time: formatTime(a.timestamp),
    dateTime: formatDateTime(a.timestamp),
  }));

  return {
    connection: {
      isOnline: isBackendOnline,
      label: isBackendOnline
        ? `Live (${currentReading.deviceId || 'ESP32'})`
        : 'Backend server offline',
      lastUpdated: latestSensor ? formatTime(latestSensor.timestamp) : 'Waiting for telemetry',
      lastUpdatedFull: latestSensor ? formatDateTime(latestSensor.timestamp) : 'Waiting for telemetry',
      esp32: latestSensor ? 'Online' : isBackendOnline ? 'Online' : 'Offline',
      wifi: isBackendOnline ? 'Connected' : 'Offline',
      mqtt: mqttStatus,
      backend: isBackendOnline ? 'Online' : 'Offline',
      reconnecting: !isBackendOnline,
      deviceId: currentReading.deviceId || 'ESP32_NODE_01',
    },
    mode: 'Real-Time Monitoring',
    uptime: formatUptime(health?.uptime),
    overallStatus,
    current: currentReading,
    gasTrend,
    temperatureTrend,
    alerts: formattedAlerts,
    history: formattedHistory,
  };
}

/**
 * Initial empty structure for the dashboard state
 */
export function getInitialDashboardData() {
  return {
    connection: {
      isOnline: false,
      label: 'Connecting to backend...',
      lastUpdated: '--',
      lastUpdatedFull: '--',
      esp32: 'Connecting...',
      wifi: 'Connecting...',
      mqtt: 'Connecting...',
      backend: 'Connecting...',
      reconnecting: false,
      deviceId: 'ESP32_NODE_01',
    },
    mode: 'Real-Time Monitoring',
    uptime: '00:00:00',
    overallStatus: 'SYSTEM SAFE',
    current: {
      deviceId: 'ESP32_NODE_01',
      gasLevel: 0,
      gasValue: 0,
      temperature: null,
      flameDetected: false,
      gasAlert: false,
      fireAlert: false,
      buzzerOn: false,
      ledOn: false,
      timestamp: new Date().toISOString(),
    },
    gasTrend: [],
    temperatureTrend: [],
    alerts: [],
    history: [],
  };
}

/**
 * Subscribes to real-time Socket.IO events ('sensor-data' and 'alert')
 * with automatic fallback polling to maintain continuous synchronization.
 */
export function subscribeToRealtimeService(onUpdate, onHazardAlert) {
  let socket = null;
  let pollInterval = null;

  try {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      onUpdate((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          isOnline: true,
          reconnecting: false,
          label: `Connected (${socket.id ? socket.id.slice(0, 5) : 'WS'})`,
        },
      }));
    });

    socket.on('disconnect', () => {
      onUpdate((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          isOnline: false,
          reconnecting: true,
          label: 'Connection lost, reconnecting...',
        },
      }));
    });

    socket.on('connect_error', () => {
      onUpdate((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          isOnline: false,
          reconnecting: true,
          label: 'Backend unreachable',
        },
      }));
    });

    // Ingest real-time sensor telemetry via 'sensor-data' Socket.IO event
    socket.on('sensor-data', (telemetry) => {
      if (!telemetry) return;

      const normalized = normalizeTelemetry(telemetry);
      if (!normalized) return;

      const status = calculateOverallStatus(normalized.gasLevel, normalized.flameDetected, true);
      const timeLabel = formatTime(normalized.timestamp);
      const dateTimeLabel = formatDateTime(normalized.timestamp);

      onUpdate((prev) => {
        const nextGasTrend = [
          ...prev.gasTrend.slice(-29),
          { time: timeLabel, value: normalized.gasLevel, rawTimestamp: normalized.timestamp },
        ];

        let nextTempTrend = prev.temperatureTrend;
        if (normalized.temperature !== null) {
          nextTempTrend = [
            ...prev.temperatureTrend.slice(-29),
            { time: timeLabel, value: normalized.temperature, rawTimestamp: normalized.timestamp },
          ];
        }

        const nextHistory = [
          {
            time: timeLabel,
            rawTimestamp: normalized.timestamp,
            deviceId: normalized.deviceId,
            gasLevel: normalized.gasLevel,
            gasValue: normalized.gasValue,
            temperature: normalized.temperature,
            flameStatus: normalized.flameDetected ? 'Flame Detected' : 'No Flame',
            systemStatus: status,
          },
          ...prev.history.slice(0, 49),
        ];

        return {
          ...prev,
          connection: {
            ...prev.connection,
            isOnline: true,
            reconnecting: false,
            lastUpdated: timeLabel,
            lastUpdatedFull: dateTimeLabel,
            esp32: normalized.deviceId ? 'Online' : prev.connection.esp32,
            deviceId: normalized.deviceId || prev.connection.deviceId,
            label: `Live (${normalized.deviceId || 'ESP32'})`,
          },
          overallStatus: status,
          current: normalized,
          gasTrend: nextGasTrend,
          temperatureTrend: nextTempTrend,
          history: nextHistory,
        };
      });
    });

    // Ingest real-time hazard alerts via 'alert' Socket.IO event
    socket.on('alert', (alert) => {
      if (!alert) return;

      const alertItem = {
        id: alert._id || alert.timestamp || String(Math.random()),
        type: alert.alertType || 'HAZARD',
        severity: alert.severity || 'HIGH',
        gasLevel: alert.gasLevel ?? null,
        message: alert.message || 'Safety hazard detected',
        time: formatTime(alert.timestamp),
        dateTime: formatDateTime(alert.timestamp),
      };

      onUpdate((prev) => {
        // Prevent duplicate alerts if already at top of list
        const alreadyExists = prev.alerts.length > 0 && prev.alerts[0].id === alertItem.id;
        if (alreadyExists) return prev;
        return {
          ...prev,
          alerts: [alertItem, ...prev.alerts.slice(0, 19)],
        };
      });

      if (typeof onHazardAlert === 'function') {
        onHazardAlert(alert);
      }
    });
  } catch (socketErr) {
    console.error('[Socket.IO] Initialization exception:', socketErr);
  }

  // Periodic Poller (every 4 seconds) to keep MQTT/Backend status fresh
  // AND fallback sync latest sensor reading from REST API if newer reading exists
  const pollHealthAndLatest = async () => {
    try {
      const [health, latest] = await Promise.all([
        fetchHealth(),
        fetchLatestSensor(),
      ]);

      if (health && health.status === 'OK') {
        const mqttStatus =
          health.mqtt === 'connected'
            ? 'Connected'
            : health.mqtt === 'connecting'
            ? 'Connecting'
            : 'Offline';

        onUpdate((prev) => {
          let nextCurrent = prev.current;
          let nextStatus = prev.overallStatus;
          let nextHistory = prev.history;
          let nextGasTrend = prev.gasTrend;
          let nextTempTrend = prev.temperatureTrend;
          let lastUpdated = prev.connection.lastUpdated;
          let lastUpdatedFull = prev.connection.lastUpdatedFull;

          if (latest) {
            const hasNewerData =
              !prev.current.timestamp ||
              new Date(latest.timestamp).getTime() > new Date(prev.current.timestamp).getTime() ||
              (prev.current.gasLevel === 0 && latest.gasLevel > 0);

            if (hasNewerData) {
              nextCurrent = latest;
              nextStatus = calculateOverallStatus(latest.gasLevel, latest.flameDetected, true);
              const timeLabel = formatTime(latest.timestamp);
              lastUpdated = timeLabel;
              lastUpdatedFull = formatDateTime(latest.timestamp);

              if (!prev.history.some((h) => h.time === timeLabel && h.gasLevel === latest.gasLevel)) {
                nextHistory = [
                  {
                    time: timeLabel,
                    rawTimestamp: latest.timestamp,
                    deviceId: latest.deviceId,
                    gasLevel: latest.gasLevel,
                    gasValue: latest.gasValue,
                    temperature: latest.temperature,
                    flameStatus: latest.flameDetected ? 'Flame Detected' : 'No Flame',
                    systemStatus: nextStatus,
                  },
                  ...prev.history.slice(0, 49),
                ];
                nextGasTrend = [
                  ...prev.gasTrend.slice(-29),
                  { time: timeLabel, value: latest.gasLevel, rawTimestamp: latest.timestamp },
                ];
                if (latest.temperature !== null) {
                  nextTempTrend = [
                    ...prev.temperatureTrend.slice(-29),
                    { time: timeLabel, value: latest.temperature, rawTimestamp: latest.timestamp },
                  ];
                }
              }
            }
          }

          return {
            ...prev,
            uptime: formatUptime(health.uptime),
            overallStatus: nextStatus,
            current: nextCurrent,
            history: nextHistory,
            gasTrend: nextGasTrend,
            temperatureTrend: nextTempTrend,
            connection: {
              ...prev.connection,
              backend: 'Online',
              mqtt: mqttStatus,
              wifi: 'Connected',
              esp32: nextCurrent.deviceId ? 'Online' : 'Online',
              deviceId: nextCurrent.deviceId || prev.connection.deviceId,
              isOnline: socket?.connected ?? true,
              lastUpdated,
              lastUpdatedFull,
            },
          };
        });
      } else {
        onUpdate((prev) => ({
          ...prev,
          overallStatus: 'DEVICE OFFLINE',
          connection: {
            ...prev.connection,
            backend: 'Offline',
            mqtt: 'Offline',
            isOnline: false,
            reconnecting: true,
            label: 'Backend unreachable',
          },
        }));
      }
    } catch (pollErr) {
      console.warn('[Poller] Health/latest polling error:', pollErr.message);
    }
  };

  pollHealthAndLatest();
  pollInterval = window.setInterval(pollHealthAndLatest, 4000);

  return () => {
    if (pollInterval) window.clearInterval(pollInterval);
    if (socket) socket.disconnect();
  };
}
