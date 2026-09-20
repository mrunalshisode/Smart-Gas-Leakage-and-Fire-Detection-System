import React from 'react';

/**
 * Compact, grouped SystemPage:
 * - Clear distinction of Available, Standby, and Disconnected statuses
 * - Group 1: Infrastructure & Network Health (ESP32, Wi-Fi, MQTT, Backend, Socket.IO, MongoDB)
 * - Group 2: Hardware Components & Transducers (MQ-2, Flame Sensor, ESP32 MCU, Buzzer, LED)
 * - Short, readable descriptions without long paragraphs
 */
export default function SystemPage({
  dashboardData,
}) {
  const current = dashboardData?.current || {};
  const connection = dashboardData?.connection || {};
  const isOnline = Boolean(connection.isOnline);
  const gas = Number(current.gasLevel ?? current.gasValue ?? 0);
  const isFlame = Boolean(current.flameDetected);
  const buzzerOn = Boolean(current.buzzerOn);
  const ledOn = Boolean(current.ledOn);
  const mqttStatus = connection.mqtt || 'Connected';
  const backendStatus = connection.backend || (isOnline ? 'Online' : 'Offline');

  // Group 1: Connection & Network Health
  const connectionHealth = [
    {
      name: 'ESP32 Edge Node',
      status: isOnline ? 'Online & Streaming' : 'Disconnected',
      statusType: isOnline ? 'success' : 'danger',
      description: `Hardware ID: ${connection.deviceId || 'ESP32_NODE_01'}. Real-time telemetry loop.`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      ),
    },
    {
      name: 'Wi-Fi Network',
      status: isOnline ? 'Connected' : 'Disconnected',
      statusType: isOnline ? 'success' : 'danger',
      description: '2.4 GHz wireless link for MQTT message transmission.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      ),
    },
    {
      name: 'HiveMQ MQTT Broker',
      status: mqttStatus,
      statusType: mqttStatus === 'Connected' ? 'success' : mqttStatus === 'Connecting' ? 'warning' : 'danger',
      description: 'broker.hivemq.com:1883 • Topic: iotap/sensor/data',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
    },
    {
      name: 'Backend REST API',
      status: backendStatus,
      statusType: backendStatus === 'Online' ? 'success' : 'danger',
      description: 'Express server at localhost:5000 with telemetry & alert APIs.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
    {
      name: 'Socket.IO Stream',
      status: isOnline ? 'Live Stream' : 'Reconnecting',
      statusType: isOnline ? 'success' : 'warning',
      description: 'Low-latency bidirectional WebSocket pushing sensor-data and alert events.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      name: 'MongoDB Database',
      status: isOnline ? 'Connected' : 'Offline',
      statusType: isOnline ? 'success' : 'danger',
      description: 'MongoDB collection storing sensor readings and safety alert logs.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
    },
  ];

  // Group 2: Hardware Components
  const hardwareComponents = [
    {
      name: 'MQ-2 Gas Sensor',
      status: isOnline ? (gas >= 400 ? 'Hazard Detected' : 'Monitoring / Safe') : 'Offline',
      statusType: !isOnline ? 'neutral' : gas >= 400 ? 'danger' : 'success',
      description: isOnline
        ? `Analog semiconductor measuring flammable gas. Current: ${gas} PPM.`
        : 'Telemetry link inactive. Sensor status unverified.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M16 18a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      name: 'IR Flame Sensor',
      status: isOnline ? (isFlame ? 'Flame Detected' : 'Clear / Standby') : 'Offline',
      statusType: !isOnline ? 'neutral' : isFlame ? 'danger' : 'success',
      description: isOnline
        ? isFlame
          ? 'Optical phototransistor detected active flame infrared emissions.'
          : 'High-sensitivity optical phototransistor actively monitoring for flame emissions.'
        : 'Telemetry link inactive. Sensor status unverified.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      name: 'ESP32 Microcontroller',
      status: isOnline ? 'Operational' : 'Offline',
      statusType: isOnline ? 'success' : 'danger',
      description: 'Dual-core 240 MHz MCU reading ADC pins and transmitting JSON payloads.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      ),
    },
    {
      name: 'Piezoelectric Buzzer',
      status: isOnline ? (buzzerOn ? 'Sounding (Alarm)' : 'Silent / Standby') : 'Unknown',
      statusType: !isOnline ? 'neutral' : buzzerOn ? 'danger' : 'neutral',
      description: buzzerOn
        ? 'Acoustic alarm activated due to hazardous gas or flame detection.'
        : 'Standby mode; calibrated to sound automatically during hazard alerts.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ),
    },
    {
      name: 'Visual Warning LED',
      status: isOnline ? (ledOn ? 'Strobing (Danger)' : 'Normal Beacon') : 'Unknown',
      statusType: !isOnline ? 'neutral' : ledOn ? 'danger' : 'success',
      description: ledOn
        ? 'Emergency strobe LED illuminated for visual danger notification.'
        : 'Normal heartbeat beacon; flashes during active alert states.',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
  ];

  return (
    <div className="page-container system-page">
      {/* Page Header */}
      <div className="page-intro-header">
        <div>
          <h2 className="page-main-title">System Health &amp; Diagnostics</h2>
          <p className="page-main-subtitle">
            Diagnostic overview of edge computing hardware, wireless network, and cloud services
          </p>
        </div>

        <div className="uptime-card-badge">
          <span className="uptime-label">Uptime:</span>
          <span className="uptime-val">{dashboardData?.uptime || '00:00:00'}</span>
        </div>
      </div>

      {/* Group 1: Infrastructure & Network Health */}
      <div className="system-section-card">
        <div className="section-card-header">
          <h3 className="section-card-title">Network &amp; Pipeline Health</h3>
          <span className="section-card-desc">Protocol communication from ESP32 edge node through broker to web client</span>
        </div>

        <div className="system-cards-grid">
          {connectionHealth.map((item, idx) => (
            <div key={idx} className="system-item-box">
              <div className="item-box-top">
                <span className="item-box-icon">{item.icon}</span>
                <span className={`badge badge-sm badge-${item.statusType}`}>{item.status}</span>
              </div>
              <h4 className="item-box-name">{item.name}</h4>
              <p className="item-box-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Group 2: Hardware Components */}
      <div className="system-section-card">
        <div className="section-card-header">
          <h3 className="section-card-title">Hardware Transducers &amp; Actuators</h3>
          <span className="section-card-desc">Connected sensors, microcontroller, and emergency safety actuators</span>
        </div>

        <div className="system-cards-grid">
          {hardwareComponents.map((item, idx) => (
            <div key={idx} className="system-item-box">
              <div className="item-box-top">
                <span className="item-box-icon">{item.icon}</span>
                <span className={`badge badge-sm badge-${item.statusType}`}>{item.status}</span>
              </div>
              <h4 className="item-box-name">{item.name}</h4>
              <p className="item-box-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
