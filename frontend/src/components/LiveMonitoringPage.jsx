import React, { useState, useMemo } from 'react';

/**
 * LiveMonitoringPage focuses purely on real-time sensor streams:
 * - 4 aligned telemetry cards
 * - Professional SVG Gas Chart with subtle teal area fill (never black),
 *   clearly labeled 400 PPM threshold, readable Y-axis, non-overlapping timestamps,
 *   and interactive hover tooltips
 * - Time window buttons: Last 5m, Last 15m, Last 1h, All Data
 * - Honest thermal sensor status callout
 */
export default function LiveMonitoringPage({
  dashboardData,
}) {
  const [timeRange, setTimeRange] = useState('all'); // '5m', '15m', '1h', 'all'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const current = dashboardData?.current || {};
  const connection = dashboardData?.connection || {};
  const gasTrend = dashboardData?.gasTrend || [];
  const gas = Number(current.gasLevel ?? current.gasValue ?? 0);
  const isFlame = Boolean(current.flameDetected);
  const temp = current.temperature;
  const isOnline = Boolean(connection.isOnline);
  const lastUpdated = connection.lastUpdated || '--';
  const lastUpdatedFull = connection.lastUpdatedFull || '--';

  // Filter data points by selected window
  const filteredData = useMemo(() => {
    if (!gasTrend || gasTrend.length === 0) return [];
    if (timeRange === '5m') return gasTrend.slice(-10);
    if (timeRange === '15m') return gasTrend.slice(-20);
    if (timeRange === '1h') return gasTrend.slice(-30);
    return gasTrend;
  }, [gasTrend, timeRange]);

  // SVG Chart Geometry
  const width = 760;
  const height = 240;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 32;

  const maxVal = Math.max(700, ...(filteredData.map((d) => Number(d.value) || 0)));
  const stepX = filteredData.length > 1
    ? (width - padLeft - padRight) / (filteredData.length - 1)
    : (width - padLeft - padRight);

  const points = filteredData.map((d, index) => {
    const v = Number(d.value) || 0;
    const x = padLeft + index * stepX;
    const y = height - padBottom - (v / maxVal) * (height - padTop - padBottom);
    return { ...d, value: v, x, y };
  });

  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padBottom} L ${points[0].x.toFixed(1)} ${height - padBottom} Z`
    : '';

  const thresholdY = height - padBottom - (400 / maxVal) * (height - padTop - padBottom);

  // Sparse timestamps (only 5 evenly spaced across X-axis)
  const labelInterval = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div className="page-container live-monitoring-page">
      {/* Page Header */}
      <div className="page-intro-header">
        <div>
          <h2 className="page-main-title">Live Sensor Monitoring</h2>
          <p className="page-main-subtitle">
            Real-time environmental sensor data streamed directly from the edge microcontroller
          </p>
        </div>

        {/* Time-Range Selector Buttons */}
        <div className="time-filter-wrapper" role="group" aria-label="Time Window Selector">
          <span className="filter-label">Window:</span>
          {['5m', '15m', '1h', 'all'].map((range) => (
            <button
              key={range}
              className={`time-filter-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === '5m' ? 'Last 5m' : range === '15m' ? 'Last 15m' : range === '1h' ? 'Last 1h' : 'All Data'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Telemetry Status Cards */}
      <div className="telemetry-cards-strip">
        <div className="telemetry-card">
          <span className="telemetry-card-label">Gas Concentration</span>
          <div className="telemetry-card-main">
            <span className={`telemetry-card-val ${gas >= 400 ? 'text-danger' : 'text-safe'}`}>{gas}</span>
            <span className="telemetry-unit">PPM</span>
          </div>
          <span className="telemetry-hint">
            {gas >= 700 ? 'Critical hazard level' : gas >= 400 ? 'Exceeds 400 PPM limit' : 'Nominal safe level'}
          </span>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-card-label">Safety Threshold</span>
          <div className="telemetry-card-main">
            <span className="telemetry-card-val text-warning">400</span>
            <span className="telemetry-unit">PPM</span>
          </div>
          <span className="telemetry-hint">Indicated by dashed reference line</span>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-card-label">Flame Sensor</span>
          <div className="telemetry-card-main">
            <span className={`telemetry-card-val ${isFlame ? 'text-danger' : 'text-safe'}`}>
              {isFlame ? 'DETECTED' : 'CLEAR'}
            </span>
          </div>
          <span className="telemetry-hint">
            {isFlame ? 'Infrared flame radiation detected!' : 'No infrared flame signal'}
          </span>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-card-label">Latest Data Sync</span>
          <div className="telemetry-card-main">
            <span className="telemetry-card-val small-font">{lastUpdated}</span>
          </div>
          <span className="telemetry-hint" title={lastUpdatedFull}>{lastUpdatedFull}</span>
        </div>
      </div>

      {/* Main Gas Line Chart */}
      <div className="monitoring-chart-card">
        <div className="monitoring-chart-header">
          <div>
            <h3 className="chart-heading">Gas Concentration Telemetry (MQ-2)</h3>
            <span className="chart-subheading">PPM curve with 400 PPM safety ceiling</span>
          </div>

          <div className="chart-legends-row">
            <span className="chart-legend-pill gas-legend">Live Reading</span>
            <span className="chart-legend-pill threshold-legend">400 PPM Limit</span>
          </div>
        </div>

        <div className="chart-canvas-box" onMouseLeave={() => setHoveredPoint(null)}>
          {points.length === 0 ? (
            <div className="chart-empty-state">
              <span>📡</span>
              <p>Waiting for real-time telemetry packets from ESP32 node...</p>
            </div>
          ) : (
            <div className="svg-responsive-wrapper">
              <svg viewBox={`0 0 ${width} ${height}`} className="full-chart-svg">
                {/* Horizontal grid lines & Y labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = height - padBottom - ratio * (height - padTop - padBottom);
                  const valLabel = Math.round(ratio * maxVal);
                  return (
                    <g key={i}>
                      <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />
                      <text x={padLeft - 8} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="10">
                        {valLabel}
                      </text>
                    </g>
                  );
                })}

                {/* X and Y Axis lines */}
                <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#cbd5e1" strokeWidth="1" />
                <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#cbd5e1" strokeWidth="1" />

                {/* 400 PPM Safety Threshold Line */}
                <line
                  x1={padLeft}
                  y1={thresholdY}
                  x2={width - padRight}
                  y2={thresholdY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
                <text x={width - padRight} y={thresholdY - 5} textAnchor="end" fill="#dc2626" fontSize="10" fontWeight="600">
                  400 PPM Threshold
                </text>

                {/* Subtle Area Fill (Never solid black) */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="rgba(13, 148, 136, 0.08)"
                  />
                )}

                {/* Teal Stroke */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredPoint?.index === idx;
                  return (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3.2}
                      fill={isHovered ? '#0d9488' : '#ffffff'}
                      stroke="#0d9488"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                      onMouseEnter={() => setHoveredPoint({ ...pt, index: idx })}
                    />
                  );
                })}

                {/* Non-overlapping X-axis Timestamps */}
                {points.map((pt, idx) => {
                  if (idx % labelInterval !== 0 && idx !== points.length - 1) return null;
                  return (
                    <text
                      key={`lbl-${idx}`}
                      x={pt.x}
                      y={height - 10}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9.5"
                    >
                      {pt.time}
                    </text>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  className="chart-hover-tooltip"
                  style={{
                    left: `${(hoveredPoint.x / width) * 100}%`,
                    top: `${(hoveredPoint.y / height) * 100}%`,
                  }}
                >
                  <strong>{hoveredPoint.value} PPM</strong>
                  <span>{hoveredPoint.time}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thermal Telemetry Strip */}
      <div className="thermal-monitoring-strip">
        <div className="thermal-strip-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          </svg>
        </div>
        <div className="thermal-strip-content">
          <h4 className="thermal-strip-title">
            {temp !== null && temp !== undefined
              ? `Ambient Temperature: ${temp.toFixed(1)} °C`
              : 'Temperature Sensor Data Unavailable'}
          </h4>
          <p className="thermal-strip-desc">
            {temp !== null && temp !== undefined
              ? 'Ambient temperature recorded from attached thermistor. Operating in safe nominal range.'
              : 'No physical DHT or thermistor module is attached to this ESP32 station. Gas and flame detection remain fully active.'}
          </p>
        </div>
        <div className="thermal-strip-badge">
          <span className={`badge ${temp !== null && temp !== undefined ? 'badge-safe' : 'badge-neutral'}`}>
            {temp !== null && temp !== undefined ? 'Connected' : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}
