import React from 'react';

/**
 * SystemComponentsGrid presents modular diagnostic cards for each hardware
 * and software element in the IoT safety architecture.
 */
export default function SystemComponentsGrid({ current, connection }) {
  const isOnline = Boolean(connection?.isOnline);
  const gasLevel = current?.gasLevel ?? 0;
  const flameDetected = Boolean(current?.flameDetected);
  const buzzerOn = Boolean(current?.buzzerOn);
  const ledOn = Boolean(current?.ledOn);
  const mqttStatus = connection?.mqtt || 'Connected';
  const backendStatus = connection?.backend || (isOnline ? 'Online' : 'Offline');

  const components = [
    {
      name: 'MQ-2 Gas Sensor',
      category: 'Sensor Input',
      status: isOnline ? (gasLevel >= 400 ? 'Hazard Detected' : 'Normal / Active') : 'Offline',
      statusType: !isOnline ? 'offline' : gasLevel >= 400 ? 'danger' : 'success',
      isActive: isOnline,
      description: isOnline
        ? `SnO2 semiconductor sensor actively measuring combustible gases & smoke. Current reading: ${gasLevel} PPM.`
        : 'Telemetry link inactive. Unable to verify real-time sensor response.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M16 18a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      name: 'IR Flame Sensor',
      category: 'Sensor Input',
      status: isOnline ? (flameDetected ? 'Flame Detected' : 'Standby / Clear') : 'Offline',
      statusType: !isOnline ? 'offline' : flameDetected ? 'danger' : 'success',
      isActive: isOnline,
      description: isOnline
        ? flameDetected
          ? 'Infrared phototransistor detected 760nm-1100nm flame radiation in coverage zone!'
          : 'High-sensitivity optical phototransistor actively monitoring for flame radiation.'
        : 'Telemetry link inactive. Sensor status cannot be verified.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      name: 'ESP32 Microcontroller',
      category: 'Edge Compute',
      status: isOnline ? 'Running / Connected' : 'Disconnected',
      statusType: isOnline ? 'success' : 'danger',
      isActive: isOnline,
      description: isOnline
        ? 'Dual-core 240 MHz MCU processing analog sensor inputs and publishing MQTT JSON frames via Wi-Fi.'
        : 'ESP32 edge node is not reaching the communication broker or gateway.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      category: 'Safety Actuator',
      status: isOnline ? (buzzerOn ? 'Sounding (Active Hazard)' : 'Standby / Silent') : 'Unknown',
      statusType: !isOnline ? 'offline' : buzzerOn ? 'danger' : 'neutral',
      isActive: buzzerOn,
      description: isOnline
        ? buzzerOn
          ? 'Audible 85dB alarm active to alert personnel of immediate hazard conditions.'
          : 'Acoustic emergency transducer in standby mode, ready to trigger on hazard events.'
        : 'Actuator status unknown while edge hardware is offline.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ),
    },
    {
      name: 'Visual LED Alert',
      category: 'Safety Actuator',
      status: isOnline ? (ledOn ? 'Illuminated (Danger)' : 'Standby / Inactive') : 'Unknown',
      statusType: !isOnline ? 'offline' : ledOn ? 'danger' : 'neutral',
      isActive: ledOn,
      description: isOnline
        ? ledOn
          ? 'Emergency strobe / high-intensity LED illuminated for visual danger notification.'
          : 'Visual warning beacon in ready state, calibrated to illuminate during alert states.'
        : 'Actuator state cannot be polled while node is disconnected.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
    },
    {
      name: 'HiveMQ MQTT Broker',
      category: 'Cloud Transport',
      status: mqttStatus,
      statusType: mqttStatus === 'Connected' ? 'success' : mqttStatus === 'Connecting' ? 'warning' : 'danger',
      isActive: mqttStatus === 'Connected',
      description:
        'Standard OASIS IoT pub/sub broker on port 1883 with topic subscription iotap/sensor/data.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
    },
    {
      name: 'Backend REST & WS Server',
      category: 'Application Server',
      status: backendStatus,
      statusType: backendStatus === 'Online' ? 'success' : 'danger',
      isActive: backendStatus === 'Online',
      description:
        'Node.js Express engine with Socket.IO bidirectional stream and MongoDB telemetry persistence.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
  ];

  return (
    <section id="system" className="dashboard-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Hardware & Software System Components</h2>
          <p className="section-subtitle">
            Component health, operating state, and functional summary of all sensors, edge actuators, and pipelines
          </p>
        </div>
      </div>

      <div className="components-grid">
        {components.map((comp, idx) => (
          <div key={idx} className="component-card">
            <div className="component-card-top">
              <div className="component-icon-badge">
                <span className="component-icon">{comp.icon}</span>
                <div>
                  <h3 className="component-name">{comp.name}</h3>
                  <span className="component-category">{comp.category}</span>
                </div>
              </div>
              <span className={`badge badge-sm badge-${comp.statusType}`}>{comp.status}</span>
            </div>
            <p className="component-desc">{comp.description}</p>
            <div className="component-footer">
              <span className="component-telemetry-indicator">
                <span className={`status-dot ${comp.isActive ? 'dot-success' : 'dot-neutral'}`} />
                <span>{comp.isActive ? 'Active Pipeline' : 'Idle / Inactive'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
