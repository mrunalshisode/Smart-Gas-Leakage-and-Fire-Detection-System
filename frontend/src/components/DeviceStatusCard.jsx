import React from 'react';

/**
 * DeviceStatusCard displays hardware identity, communication protocol status,
 * network connectivity, and uptime telemetry.
 */
export default function DeviceStatusCard({ connection, uptime, current }) {
  const isOnline = Boolean(connection?.isOnline);
  const esp32Status = connection?.esp32 || (isOnline ? 'Online' : 'Offline');
  const wifiStatus = connection?.wifi || (isOnline ? 'Connected' : 'Offline');
  const mqttStatus = connection?.mqtt || 'Connected';
  const backendStatus = connection?.backend || (isOnline ? 'Online' : 'Offline');
  const deviceId = connection?.deviceId || current?.deviceId || 'ESP32_NODE_01';
  const lastSync = connection?.lastUpdatedFull || connection?.lastUpdated || 'Waiting for telemetry';
  // IP address is not broadcast in standard MQTT telemetry topic, display 'Not available' per instructions
  const ipAddress = current?.ipAddress || 'Not available';

  const statusItems = [
    {
      label: 'Device Identifier',
      value: deviceId,
      subtext: 'Hardware Node ID',
      badge: 'Active ID',
      badgeType: 'neutral',
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
      label: 'ESP32 Status',
      value: esp32Status,
      subtext: isOnline ? 'Microcontroller operational' : 'Hardware node offline',
      badge: esp32Status === 'Online' ? 'ONLINE' : 'OFFLINE',
      badgeType: esp32Status === 'Online' ? 'success' : 'danger',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Wi-Fi Network',
      value: wifiStatus,
      subtext: isOnline ? '2.4 GHz IoT Subnet' : 'Interface disconnected',
      badge: wifiStatus === 'Connected' ? 'CONNECTED' : 'DISCONNECTED',
      badgeType: wifiStatus === 'Connected' ? 'success' : 'danger',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      ),
    },
    {
      label: 'MQTT Broker',
      value: mqttStatus,
      subtext: 'broker.hivemq.com:1883',
      badge: mqttStatus === 'Connected' ? 'CONNECTED' : mqttStatus === 'Connecting' ? 'CONNECTING' : 'OFFLINE',
      badgeType: mqttStatus === 'Connected' ? 'success' : mqttStatus === 'Connecting' ? 'warning' : 'danger',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Backend REST & WS',
      value: backendStatus,
      subtext: 'localhost:5000 (Express/Socket.io)',
      badge: backendStatus === 'Online' ? 'ONLINE' : 'UNREACHABLE',
      badgeType: backendStatus === 'Online' ? 'success' : 'danger',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
    {
      label: 'IP Address',
      value: ipAddress,
      subtext: ipAddress === 'Not available' ? 'DHCP IP not in payload' : 'DHCP Assigned',
      badge: ipAddress === 'Not available' ? 'N/A' : 'ASSIGNED',
      badgeType: ipAddress === 'Not available' ? 'neutral' : 'success',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      label: 'Last Telemetry Received',
      value: lastSync,
      subtext: isOnline ? 'Streaming via HiveMQ & Socket.IO' : 'No recent packet received',
      badge: isOnline ? 'SYNCED' : 'STALE',
      badgeType: isOnline ? 'success' : 'neutral',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Monitoring Uptime',
      value: uptime || '00:00:00',
      subtext: 'Continuous service runtime',
      badge: 'ACTIVE',
      badgeType: 'success',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },
  ];

  return (
    <section id="device" className="dashboard-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Device Status & Infrastructure Telemetry</h2>
          <p className="section-subtitle">
            Diagnostic verification for ESP32 edge microcontroller, wireless network, MQTT transport, and API services
          </p>
        </div>
        <div className="device-health-pill">
          <span className={`status-dot ${isOnline ? 'dot-success' : 'dot-danger'}`} />
          <span className="health-pill-text">{isOnline ? 'Edge System Active' : 'Edge Link Severed'}</span>
        </div>
      </div>

      <div className="device-status-grid">
        {statusItems.map((item, index) => (
          <div key={index} className="device-item-card">
            <div className="device-item-icon-wrapper">
              <span className="device-item-icon">{item.icon}</span>
            </div>
            <div className="device-item-content">
              <div className="device-item-header">
                <span className="device-item-label">{item.label}</span>
                <span className={`badge badge-sm badge-${item.badgeType}`}>{item.badge}</span>
              </div>
              <div className="device-item-value">{item.value}</div>
              <div className="device-item-subtext">{item.subtext}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
