import React from 'react';

/**
 * Clean & Polished DashboardPage:
 * - Clear Safety Status Banner (understandable in <3 seconds)
 * - Exactly 3 compact metric cards (Gas Level, Flame Sensor, Device Link)
 * - Balanced 2-Column layout:
 *     Left: Gas Level Telemetry (SVG with 400 PPM threshold, clean area fill)
 *     Right: Recent Safety Alerts (3 compact rows) + System Infrastructure chips
 * - Direct navigation action buttons to deep-dive pages.
 */
export default function DashboardPage({
  dashboardData,
  onNavigate,
}) {
  const current = dashboardData?.current || {};
  const connection = dashboardData?.connection || {};
  const alerts = dashboardData?.alerts || [];
  const gasTrend = dashboardData?.gasTrend || [];
  const status = dashboardData?.overallStatus || 'SYSTEM SAFE';

  const gas = Number(current.gasLevel ?? current.gasValue ?? 0);
  const isFlame = Boolean(current.flameDetected);
  const isOnline = Boolean(connection.isOnline);
  const buzzerOn = Boolean(current.buzzerOn);
  const ledOn = Boolean(current.ledOn);

  // Safety Status Banner configuration (clean, punchy, understandable in <3 seconds)
  const getBannerConfig = (st) => {
    switch (st) {
      case 'COMBINED HAZARD':
        return {
          title: 'COMBINED HAZARD',
          badge: 'CRITICAL DANGER',
          theme: 'critical',
          icon: '🚨',
          explanation: `Gas leakage (${gas} PPM) and active flame detected simultaneously.`,
          action: 'Evacuate the area immediately. Do not operate electrical switches.',
        };
      case 'FIRE DETECTED':
        return {
          title: 'FIRE DETECTED',
          badge: 'EMERGENCY',
          theme: 'danger',
          icon: '🔥',
          explanation: 'Optical infrared sensor detected active flame radiation.',
          action: 'Evacuate immediately via fire exits and contact emergency fire rescue.',
        };
      case 'DANGER':
      case 'GAS LEAK DETECTED':
        return {
          title: 'GAS LEAK DETECTED',
          badge: 'WARNING',
          theme: 'warning',
          icon: '⚠️',
          explanation: `Combustible gas concentration (${gas} PPM) exceeds 400 PPM safety ceiling.`,
          action: 'Ventilate the room immediately and shut off the main gas cylinder valve.',
        };
      case 'WARNING':
        return {
          title: 'ELEVATED GAS READING',
          badge: 'ADVISORY',
          theme: 'warning',
          icon: '⚠️',
          explanation: `Gas concentration (${gas} PPM) is slightly above baseline.`,
          action: 'Verify ventilation and inspect gas appliances.',
        };
      case 'DEVICE OFFLINE':
        return {
          title: 'HARDWARE NODE OFFLINE',
          badge: 'DISCONNECTED',
          theme: 'offline',
          icon: '📡',
          explanation: 'No telemetry communication link with ESP32 or MQTT broker.',
          action: 'Check ESP32 power supply, Wi-Fi router, and HiveMQ connection.',
        };
      default:
        return {
          title: 'SYSTEM SAFE',
          badge: 'NORMAL',
          theme: 'safe',
          icon: '🛡️',
          explanation: 'All environmental sensors are operating within safe nominal parameters.',
          action: 'Continuous real-time safety monitoring is active. No hazards detected.',
        };
    }
  };

  const banner = getBannerConfig(status);

  // 3 Compact Summary Cards
  const summaryCards = [
    {
      id: 'gas',
      label: 'Gas Level',
      value: `${gas} PPM`,
      statusText: gas >= 700 ? 'Critical hazard' : gas >= 400 ? 'Above 400 PPM limit' : 'Normal safe level',
      tone: gas >= 700 ? 'danger' : gas >= 400 ? 'warning' : 'safe',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M16 18a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      id: 'flame',
      label: 'Flame Sensor',
      value: isFlame ? 'Detected' : 'Clear',
      statusText: isFlame ? 'Optical flame active' : 'No flame signal',
      tone: isFlame ? 'danger' : 'safe',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      id: 'device',
      label: 'Device Connection',
      value: isOnline ? 'Online' : 'Offline',
      statusText: isOnline ? `Node: ${connection.deviceId || 'ESP32'}` : 'Hardware disconnected',
      tone: isOnline ? 'safe' : 'danger',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  ];

  // Compact Gas SVG Chart Calculation
  const recentGas = gasTrend.slice(-12);
  const chartW = 540;
  const chartH = 200;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const maxPpm = Math.max(600, ...recentGas.map((d) => Number(d.value) || 0));
  const stepX = recentGas.length > 1 ? (chartW - padLeft - padRight) / (recentGas.length - 1) : (chartW - padLeft - padRight);
  const threshY = chartH - padBottom - (400 / maxPpm) * (chartH - padTop - padBottom);

  const points = recentGas.map((d, i) => {
    const v = Number(d.value) || 0;
    const x = padLeft + i * stepX;
    const y = chartH - padBottom - (v / maxPpm) * (chartH - padTop - padBottom);
    return { ...d, value: v, x, y };
  });

  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartH - padBottom} L ${points[0].x.toFixed(1)} ${chartH - padBottom} Z`
    : '';

  // 3-4 sparse timestamps for X-axis
  const labelInterval = Math.max(1, Math.ceil(points.length / 4));

  // Top 3 recent alerts
  const topAlerts = alerts.slice(0, 3);

  return (
    <div className="page-container dashboard-page">
      {/* 1. Main Safety Status Banner */}
      <section className={`safety-banner-compact theme-${banner.theme}`} aria-label="Current Hazard Assessment">
        <div className="safety-banner-inner">
          <div className="banner-status-header">
            <span className="banner-icon-large" role="img" aria-label="Status icon">{banner.icon}</span>
            <div className="banner-title-group">
              <div className="banner-title-row">
                <h2 className="banner-status-title">{banner.title}</h2>
                <span className={`badge badge-sm badge-${banner.theme === 'safe' ? 'safe' : banner.theme === 'warning' ? 'warning' : 'danger'}`}>
                  {banner.badge}
                </span>
              </div>
              <p className="banner-explanation">{banner.explanation}</p>
            </div>
          </div>

          <div className="banner-action-box">
            <span className="action-tag">SAFETY ACTION:</span>
            <span className="action-instruction">{banner.action}</span>
          </div>
        </div>

        <div className="banner-quick-stats">
          <div className="quick-stat-item">
            <span className="qs-label">Gas Level</span>
            <span className={`qs-value ${gas >= 400 ? 'text-danger' : 'text-safe'}`}>
              {gas} <small>PPM</small>
            </span>
          </div>

          <div className="quick-stat-item">
            <span className="qs-label">Flame Sensor</span>
            <span className={`qs-value ${isFlame ? 'text-danger' : 'text-safe'}`}>
              {isFlame ? 'DETECTED' : 'CLEAR'}
            </span>
          </div>

          <div className="quick-stat-item">
            <span className="qs-label">Device Link</span>
            <span className={`qs-value ${isOnline ? 'text-safe' : 'text-offline'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Sensor Summary (3 Compact Cards) */}
      <section className="summary-cards-section" aria-label="Summary Metric Cards">
        <div className="cards-grid-three">
          {summaryCards.map((card) => (
            <div key={card.id} className={`metric-card-compact tone-${card.tone}`}>
              <div className="card-header-row">
                <span className="card-label-small">{card.label}</span>
                <span className="card-icon-small">{card.icon}</span>
              </div>
              <div className="card-value-large">{card.value}</div>
              <div className="card-footer-row">
                <span className={`status-indicator-dot dot-${card.tone}`} />
                <span className="card-status-text">{card.statusText}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Dashboard Content (Balanced 2-Column Grid) */}
      <section className="dashboard-content-grid" aria-label="Dashboard Monitoring & Infrastructure">
        {/* Left Column: Live Visuals */}
        <div className="content-col left-col">
          {/* Compact Gas Trend Chart */}
          <div className="content-panel chart-panel-compact">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Gas Level Monitoring</h3>
                <span className="panel-subtitle">Real-time concentration with 400 PPM safety line</span>
              </div>
              <button
                className="panel-link-action"
                onClick={() => onNavigate('monitoring')}
                title="Open comprehensive telemetry view"
              >
                <span>Live Monitoring →</span>
              </button>
            </div>

            <div className="chart-wrapper-compact">
              {recentGas.length === 0 ? (
                <div className="chart-empty-state">
                  <span>📡</span>
                  <p>Awaiting live telemetry packets...</p>
                </div>
              ) : (
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="compact-svg">
                  {/* Grid lines */}
                  <line x1={padLeft} y1={padTop} x2={chartW - padRight} y2={padTop} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1={padLeft} y1={(chartH - padBottom + padTop) / 2} x2={chartW - padRight} y2={(chartH - padBottom + padTop) / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1={padLeft} y1={chartH - padBottom} x2={chartW - padRight} y2={chartH - padBottom} stroke="#e2e8f0" strokeWidth="1" />

                  {/* Y-axis labels */}
                  <text x={padLeft - 6} y={padTop + 3} textAnchor="end" fill="#94a3b8" fontSize="9">{maxPpm}</text>
                  <text x={padLeft - 6} y={chartH - padBottom} textAnchor="end" fill="#94a3b8" fontSize="9">0</text>

                  {/* 400 PPM Threshold line */}
                  <line
                    x1={padLeft}
                    y1={threshY}
                    x2={chartW - padRight}
                    y2={threshY}
                    stroke="#ef4444"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <text x={chartW - padRight} y={threshY - 4} textAnchor="end" fill="#dc2626" fontSize="9" fontWeight="600">
                    Threshold (400 PPM)
                  </text>

                  {/* Subtle Gradient Area Fill (never solid black!) */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="rgba(13, 148, 136, 0.08)"
                    />
                  )}

                  {/* Data Stroke */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Points */}
                  {points.map((pt, idx) => (
                    <circle key={idx} cx={pt.x} cy={pt.y} r="3" fill="#ffffff" stroke="#0d9488" strokeWidth="2" />
                  ))}

                  {/* Non-overlapping X-axis Timestamps */}
                  {points.map((pt, idx) => {
                    if (idx % labelInterval !== 0 && idx !== points.length - 1) return null;
                    return (
                      <text
                        key={`x-${idx}`}
                        x={pt.x}
                        y={chartH - 8}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                      >
                        {pt.time}
                      </text>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Alerts & System Status */}
        <div className="content-col right-col">
          {/* Recent Alerts Section */}
          <div className="content-panel alerts-panel-summary">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Recent Safety Alerts</h3>
                <span className="panel-subtitle">Latest detected safety incidents</span>
              </div>
              <button
                className="panel-link-action"
                onClick={() => onNavigate('alerts')}
                title="View full alert logs"
              >
                <span>View All ({alerts.length}) →</span>
              </button>
            </div>

            <div className="alerts-compact-list">
              {topAlerts.length === 0 ? (
                <div className="empty-alerts-box">
                  <span className="empty-box-icon">🛡️</span>
                  <div>
                    <h4 className="empty-box-title">No Active Hazards</h4>
                    <p className="empty-box-desc">All sensors report safe nominal levels. No incidents logged.</p>
                  </div>
                </div>
              ) : (
                topAlerts.map((alt, i) => {
                  const isCritical = alt.severity === 'CRITICAL' || alt.type === 'FIRE_DETECTED' || alt.type === 'COMBINED_HAZARD';
                  return (
                    <div key={alt.id || i} className={`alert-summary-item ${isCritical ? 'item-critical' : 'item-warning'}`}>
                      <div className="alert-item-top">
                        <span className="alert-item-type">{alt.type.replace('_', ' ')}</span>
                        <span className="alert-item-time font-mono">{alt.time}</span>
                      </div>
                      <p className="alert-item-msg">{alt.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick System Health Overview */}
          <div className="content-panel system-health-summary">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">System Infrastructure</h3>
                <span className="panel-subtitle">Protocol links &amp; actuators</span>
              </div>
              <button
                className="panel-link-action"
                onClick={() => onNavigate('system')}
                title="View system diagnostic details"
              >
                <span>System Details →</span>
              </button>
            </div>

            <div className="health-pills-grid">
              <div className="health-stat-pill">
                <span className="health-pill-label">ESP32 Edge Node</span>
                <span className={`badge badge-sm ${isOnline ? 'badge-safe' : 'badge-danger'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="health-stat-pill">
                <span className="health-pill-label">HiveMQ MQTT</span>
                <span className={`badge badge-sm ${connection.mqtt === 'Connected' ? 'badge-safe' : 'badge-warning'}`}>
                  {connection.mqtt || 'Offline'}
                </span>
              </div>

              <div className="health-stat-pill">
                <span className="health-pill-label">Backend API</span>
                <span className={`badge badge-sm ${connection.backend === 'Online' || isOnline ? 'badge-safe' : 'badge-danger'}`}>
                  {connection.backend || 'Online'}
                </span>
              </div>

              <div className="health-stat-pill">
                <span className="health-pill-label">Buzzer Siren</span>
                <span className={`badge badge-sm ${buzzerOn ? 'badge-danger' : 'badge-neutral'}`}>
                  {buzzerOn ? 'Sounding' : 'Standby'}
                </span>
              </div>
            </div>

            <div className="quick-history-link-wrap">
              <button
                className="quick-history-btn"
                onClick={() => onNavigate('history')}
              >
                <span>View Complete Telemetry History →</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
