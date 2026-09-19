import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Formats timestamps into human-readable HH:MM AM/PM format
 */
export function formatTime(timestamp) {
  if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
export function calculateOverallStatus(gasLevel, flameDetected) {
  const isFlame = Boolean(flameDetected);
  const numericGas = Number(gasLevel) || 0;
  if (isFlame) {
    return 'FIRE DETECTED';
  }
  if (numericGas >= 700) {
    return 'DANGER';
  }
  if (numericGas >= 400) {
    return 'WARNING';
  }
  return 'SAFE';
}

/**
 * GET /api/health - Retrieves service health and MQTT status
 */
export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
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
    return json.data;
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/sensors/history?limit=20 - Retrieves historical telemetry readings
 */
export async function fetchSensorHistory(limit = 20) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sensors/history?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    return [];
  }
}

/**
 * GET /api/alerts?limit=10 - Retrieves historical safety hazard alerts
 */
export async function fetchAlerts(limit = 10) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/alerts?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    return [];
  }
}

/**
 * Fetches initial snapshot of data from backend REST APIs on application mount
 */
export async function fetchDashboardSnapshot() {
  const [health, latestSensor, history, alerts] = await Promise.all([
    fetchHealth(),
    fetchLatestSensor(),
    fetchSensorHistory(20),
    fetchAlerts(10),
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

  const currentGas = latestSensor ? Number(latestSensor.gasLevel) || 0 : 0;
  const currentFlame = latestSensor ? Boolean(latestSensor.flameDetected) : false;
  const isGasAlert = latestSensor ? Boolean(latestSensor.gasAlert) : currentGas >= 400;
  const isFireAlert = latestSensor ? Boolean(latestSensor.fireAlert) : currentFlame;
  const overallStatus = calculateOverallStatus(currentGas, currentFlame);

  const formattedHistory = history.map((item) => ({
    time: formatTime(item.timestamp),
    gasLevel: item.gasLevel,
    temperature: item.temperature ?? 28.0,
    flameStatus: item.flameDetected ? 'Flame Detected' : 'No Flame',
    systemStatus: calculateOverallStatus(item.gasLevel, item.flameDetected),
  }));

  const gasTrend = history
    .slice(0, 15)
    .reverse()
    .map((item) => ({
      time: formatTime(item.timestamp),
      value: Number(item.gasLevel) || 0,
    }));

  const temperatureTrend = history
    .slice(0, 15)
    .reverse()
    .map((item) => ({
      time: formatTime(item.timestamp),
      value: 28.0,
    }));

  const formattedAlerts = alerts.map((a) => ({
    id: a._id || a.timestamp || String(Math.random()),
    type: a.alertType || 'HAZARD',
    severity: a.severity || 'HIGH',
    message: a.message || 'Safety hazard detected',
    time: formatTime(a.timestamp),
  }));

  return {
    connection: {
      isOnline: isBackendOnline,
      label: isBackendOnline
        ? `Connected (${latestSensor?.deviceId || 'ESP32_NODE_01'})`
        : 'Backend server offline',
      lastUpdated: latestSensor ? formatTime(latestSensor.timestamp) : 'Waiting for data',
      esp32: latestSensor ? 'Online' : isBackendOnline ? 'Online' : 'Offline',
      wifi: isBackendOnline ? 'Connected' : 'Offline',
      mqtt: mqttStatus,
      backend: isBackendOnline ? 'Online' : 'Offline',
      reconnecting: !isBackendOnline,
    },
    mode: 'Live System',
    uptime: formatUptime(health?.uptime),
    overallStatus,
    current: {
      deviceId: latestSensor?.deviceId || 'ESP32_NODE_01',
      gasLevel: currentGas,
      temperature: 28.0,
      flameDetected: currentFlame,
      gasAlert: isGasAlert,
      fireAlert: isFireAlert,
      buzzerOn: isGasAlert || isFireAlert,
      ledOn: isGasAlert || isFireAlert,
    },
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
      esp32: 'Connecting...',
      wifi: 'Connecting...',
      mqtt: 'Connecting...',
      backend: 'Connecting...',
      reconnecting: false,
    },
    mode: 'Live System',
    uptime: '00:00:00',
    overallStatus: 'SAFE',
    current: {
      deviceId: 'ESP32_NODE_01',
      gasLevel: 0,
      temperature: 28.0,
      flameDetected: false,
      gasAlert: false,
      fireAlert: false,
      buzzerOn: false,
      ledOn: false,
    },
    gasTrend: [],
    temperatureTrend: [],
    alerts: [],
    history: [],
  };
}

/**
 * Subscribes to real-time Socket.IO events ('sensor-data' and 'alert')
 * and performs periodic health polling to keep connection status updated.
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
    });

    socket.on('connect', () => {
      onUpdate((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          isOnline: true,
          reconnecting: false,
          label: `Connected (Socket ID: ${socket.id.substring(0, 6)})`,
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

    // Ingest real-time sensor telemetry
    socket.on('sensor-data', (telemetry) => {
      if (!telemetry) return;

      const numericGas = Number(telemetry.gasLevel) || 0;
      const isFlame = Boolean(telemetry.flameDetected);
      const isGasAlert = telemetry.gasAlert !== undefined ? Boolean(telemetry.gasAlert) : numericGas >= 400;
      const isFireAlert = telemetry.fireAlert !== undefined ? Boolean(telemetry.fireAlert) : isFlame;
      const status = calculateOverallStatus(numericGas, isFlame);
      const timeLabel = formatTime(telemetry.timestamp);

      onUpdate((prev) => {
        const nextGasTrend = [
          ...prev.gasTrend.slice(-14),
          { time: timeLabel, value: numericGas },
        ];
        const nextTempTrend = [
          ...prev.temperatureTrend.slice(-14),
          { time: timeLabel, value: 28.0 },
        ];
        const nextHistory = [
          {
            time: timeLabel,
            gasLevel: numericGas,
            temperature: 28.0,
            flameStatus: isFlame ? 'Flame Detected' : 'No Flame',
            systemStatus: status,
          },
          ...prev.history.slice(0, 19),
        ];

        return {
          ...prev,
          connection: {
            ...prev.connection,
            isOnline: true,
            reconnecting: false,
            lastUpdated: timeLabel,
            esp32: telemetry.deviceId ? 'Online' : prev.connection.esp32,
            label: `Live data from ${telemetry.deviceId || 'ESP32'}`,
          },
          overallStatus: status,
          current: {
            deviceId: telemetry.deviceId || prev.current.deviceId || 'ESP32_NODE_01',
            gasLevel: numericGas,
            temperature: 28.0,
            flameDetected: isFlame,
            gasAlert: isGasAlert,
            fireAlert: isFireAlert,
            buzzerOn: isGasAlert || isFireAlert,
            ledOn: isGasAlert || isFireAlert,
          },
          gasTrend: nextGasTrend,
          temperatureTrend: nextTempTrend,
          history: nextHistory,
        };
      });
    });

    // Ingest real-time hazard alerts
    socket.on('alert', (alert) => {
      if (!alert) return;

      const alertItem = {
        id: alert._id || alert.timestamp || String(Math.random()),
        type: alert.alertType || 'HAZARD',
        severity: alert.severity || 'HIGH',
        message: alert.message || 'Safety hazard detected',
        time: formatTime(alert.timestamp),
      };

      onUpdate((prev) => ({
        ...prev,
        alerts: [alertItem, ...prev.alerts.slice(0, 19)],
      }));

      if (typeof onHazardAlert === 'function') {
        onHazardAlert(alert);
      }
    });
  } catch (socketErr) {
    console.warn('[Socket.IO] Initialization error:', socketErr.message);
  }

  // Periodic Health Check Poller (every 5 seconds) to keep MQTT & Backend status fresh
  const pollHealth = async () => {
    const health = await fetchHealth();
    if (health && health.status === 'OK') {
      const mqttStatus =
        health.mqtt === 'connected'
          ? 'Connected'
          : health.mqtt === 'connecting'
          ? 'Connecting'
          : 'Offline';

      onUpdate((prev) => ({
        ...prev,
        uptime: formatUptime(health.uptime),
        connection: {
          ...prev.connection,
          backend: 'Online',
          mqtt: mqttStatus,
          wifi: 'Connected',
          esp32: prev.connection.esp32 === 'Connecting...' ? 'Online' : prev.connection.esp32,
          isOnline: socket?.connected ?? true,
        },
      }));
    } else {
      onUpdate((prev) => ({
        ...prev,
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
  };

  pollHealth();
  pollInterval = window.setInterval(pollHealth, 5000);

  return () => {
    if (pollInterval) window.clearInterval(pollInterval);
    if (socket) socket.disconnect();
  };
}
