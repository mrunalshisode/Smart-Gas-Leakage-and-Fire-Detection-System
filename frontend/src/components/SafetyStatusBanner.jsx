function SafetyStatusBanner({ status, reading, connection }) {
  const isFlame = Boolean(reading?.flameDetected);
  const gas = Number(reading?.gasLevel ?? reading?.gasValue ?? 0);
  const isOnline = Boolean(connection?.isOnline);

  // Status configuration matrix with explicit recommended actions
  const statusConfig = {
    'COMBINED HAZARD': {
      label: 'COMBINED HAZARD (CRITICAL)',
      type: 'critical',
      headline: 'Simultaneous combustible gas leakage and flame detected in monitored zone.',
      action: 'CRITICAL EVACUATION: Evacuate the premises immediately. Do not operate light switches or electrical equipment. Alert emergency services.',
      icon: '🚨',
    },
    'FIRE DETECTED': {
      label: 'FIRE DETECTED (EMERGENCY)',
      type: 'danger',
      headline: 'Active flame detected by optical infrared sensor in monitored zone.',
      action: 'FIRE EMERGENCY: Evacuate the building immediately, sound manual fire alarm, and contact the local fire brigade.',
      icon: '🔥',
    },
    'DANGER': {
      label: 'CRITICAL GAS LEAKAGE (DANGER)',
      type: 'danger',
      headline: `Severe gas concentration (${gas} PPM) significantly exceeding 700 PPM safety ceiling.`,
      action: 'DANGER: Shut down main gas line valve immediately, ventilate all doors and windows, avoid sparks or friction.',
      icon: '⚠️',
    },
    'GAS LEAK DETECTED': {
      label: 'GAS LEAK DETECTED (WARNING)',
      type: 'warning',
      headline: `Gas concentration (${gas} PPM) has breached the 400 PPM threshold.`,
      action: 'WARNING: Improve area ventilation immediately, inspect gas appliances/cylinders for leaks, maintain surveillance.',
      icon: '⚠️',
    },
    'WARNING': {
      label: 'GAS LEVEL ELEVATED (WARNING)',
      type: 'warning',
      headline: `Gas concentration (${gas} PPM) is higher than normal.`,
      action: 'WARNING: Ensure continuous air exhaust ventilation. Verify burner ignition and cylinder fittings.',
      icon: '⚠️',
    },
    'DEVICE OFFLINE': {
      label: 'HARDWARE NODE OFFLINE',
      type: 'offline',
      headline: 'No communication link established with ESP32 or MQTT message broker.',
      action: 'INSPECTION: Verify ESP32 microcontroller power supply, Wi-Fi router connectivity, and MQTT broker status.',
      icon: '📡',
    },
    'SENSOR DATA UNAVAILABLE': {
      label: 'SENSOR DATA UNAVAILABLE',
      type: 'offline',
      headline: 'Awaiting initial telemetry stream from hardware sensors.',
      action: 'NOTICE: Please wait while the system establishes live WebSocket & MQTT handshake with sensors.',
      icon: '⏳',
    },
    'SYSTEM SAFE': {
      label: 'SYSTEM SAFE (ALL CLEAR)',
      type: 'safe',
      headline: 'All environmental sensors are operating within nominal, safe operating parameters.',
      action: 'NORMAL: Continuous 24/7 real-time telemetry logging active. No hazardous gas or flame signals detected.',
      icon: '🛡️',
    },
  };

  const currentConfig = statusConfig[status] || statusConfig['SYSTEM SAFE'];

  return (
    <section className={`safety-status-banner theme-${currentConfig.type}`} aria-live="assertive">
      <div className="banner-left">
        <div className="status-badge-container">
          <span className="status-icon" role="img" aria-label="Status Indicator">{currentConfig.icon}</span>
          <div>
            <div className="status-eyebrow">Overall Hazard Assessment</div>
            <h2 className="status-title">{currentConfig.label}</h2>
          </div>
        </div>
        <p className="status-headline">{currentConfig.headline}</p>

        {/* Action Callout */}
        <div className="action-callout">
          <span className="action-tag">RECOMMENDED SAFETY ACTION</span>
          <p className="action-text">{currentConfig.action}</p>
        </div>
      </div>

      <div className="banner-right">
        <div className="quick-metrics-box">
          <div className="quick-metric">
            <span className="qm-label">Gas Level</span>
            <span className={`qm-val ${gas >= 400 ? 'text-danger' : 'text-safe'}`}>
              {gas} <small>PPM</small>
            </span>
          </div>

          <div className="quick-metric">
            <span className="qm-label">Flame Sensor</span>
            <span className={`qm-val ${isFlame ? 'text-danger' : 'text-safe'}`}>
              {isFlame ? 'DETECTED' : 'CLEAR'}
            </span>
          </div>

          <div className="quick-metric">
            <span className="qm-label">Hardware Link</span>
            <span className={`qm-val ${isOnline ? 'text-safe' : 'text-offline'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SafetyStatusBanner;
