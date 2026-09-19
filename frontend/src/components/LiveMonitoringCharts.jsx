import { useState, useMemo } from 'react';

function LiveMonitoringCharts({ gasTrend, temperatureTrend }) {
  const [timeRange, setTimeRange] = useState('all'); // '5m', '15m', '1h', 'all'

  // Filter data points based on time range
  const filteredGasData = useMemo(() => {
    if (!gasTrend || gasTrend.length === 0) return [];
    if (timeRange === '5m') return gasTrend.slice(-10);
    if (timeRange === '15m') return gasTrend.slice(-20);
    if (timeRange === '1h') return gasTrend.slice(-30);
    return gasTrend;
  }, [gasTrend, timeRange]);

  const filteredTempData = useMemo(() => {
    if (!temperatureTrend || temperatureTrend.length === 0) return [];
    if (timeRange === '5m') return temperatureTrend.slice(-10);
    if (timeRange === '15m') return temperatureTrend.slice(-20);
    if (timeRange === '1h') return temperatureTrend.slice(-30);
    return temperatureTrend;
  }, [temperatureTrend, timeRange]);

  const hasTemperatureData = filteredTempData.length > 0;

  // Chart configuration
  const width = 640;
  const height = 230;
  const padding = 34;

  // Calculate SVG line points for gas
  const gasMax = Math.max(800, ...(filteredGasData.map((d) => Number(d.value) || 0)));
  const gasStep = filteredGasData.length > 1 ? (width - padding * 2) / (filteredGasData.length - 1) : width - padding * 2;

  const gasPoints = filteredGasData.map((d, index) => {
    const val = Number(d.value) || 0;
    const x = padding + index * gasStep;
    const y = height - padding - (val / gasMax) * (height - padding * 2);
    return { ...d, value: val, x, y };
  });

  const gasPath = gasPoints.length > 0
    ? gasPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  const gasArea = gasPoints.length > 0
    ? `${gasPath} L ${gasPoints[gasPoints.length - 1].x.toFixed(1)} ${height - padding} L ${gasPoints[0].x.toFixed(1)} ${height - padding} Z`
    : '';

  // Calculate SVG line points for temperature
  const tempMax = Math.max(50, ...(filteredTempData.map((d) => Number(d.value) || 0)));
  const tempStep = filteredTempData.length > 1 ? (width - padding * 2) / (filteredTempData.length - 1) : width - padding * 2;

  const tempPoints = filteredTempData.map((d, index) => {
    const val = Number(d.value) || 0;
    const x = padding + index * tempStep;
    const y = height - padding - (val / tempMax) * (height - padding * 2);
    return { ...d, value: val, x, y };
  });

  const tempPath = tempPoints.length > 0
    ? tempPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  // Generate sparse x-axis labels to avoid label overcrowding
  const labelInterval = Math.max(1, Math.ceil(filteredGasData.length / 6));

  return (
    <section className="dashboard-section" id="monitoring" aria-label="Real-time Monitoring Charts">
      <div className="section-header-wrap">
        <div>
          <span className="section-eyebrow">Telemetry Stream</span>
          <h2 className="section-title">Live Sensor Monitoring</h2>
        </div>

        {/* Time-Range Filter Buttons */}
        <div className="time-range-group" role="group" aria-label="Time range selector">
          <span className="range-label">Window:</span>
          {['5m', '15m', '1h', 'all'].map((range) => (
            <button
              key={range}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === '5m' ? '5 Min' : range === '15m' ? '15 Min' : range === '1h' ? '1 Hour' : 'All Points'}
            </button>
          ))}
        </div>
      </div>

      <div className="charts-grid-two">
        {/* Gas Level Chart */}
        <article className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Gas Concentration (MQ-2 Sensor)</h3>
              <p className="chart-sub">Real-time PPM level with 400 PPM safety threshold</p>
            </div>
            <div className="chart-badges">
              <span className="legend-indicator gas-legend">Live PPM</span>
              <span className="threshold-legend warning">Threshold: 400 PPM</span>
            </div>
          </div>

          <div className="svg-container">
            {filteredGasData.length === 0 ? (
              <div className="empty-chart-state">
                <span>📡</span>
                <p>Waiting for live telemetry stream...</p>
              </div>
            ) : (
              <svg viewBox={`0 0 ${width} ${height}`} className="sensor-svg-chart" role="img" aria-label="Gas level live chart">
                <defs>
                  <linearGradient id="gasFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 200, 400, 600, 800].map((tick) => {
                  const y = height - padding - (tick / gasMax) * (height - padding * 2);
                  return (
                    <g key={tick}>
                      <line x1={padding} y1={y} x2={width - padding} y2={y} className="svg-grid-line" />
                      <text x={padding - 8} y={y + 4} className="svg-axis-text" textAnchor="end">{tick}</text>
                    </g>
                  );
                })}

                {/* 400 PPM Warning Threshold Line */}
                <line
                  x1={padding}
                  y1={height - padding - (400 / gasMax) * (height - padding * 2)}
                  x2={width - padding}
                  y2={height - padding - (400 / gasMax) * (height - padding * 2)}
                  className="svg-threshold-line warning"
                />

                {/* Area and Line */}
                <path d={gasArea} fill="url(#gasFillGradient)" />
                <path d={gasPath} className="svg-data-path gas-stroke" />

                {/* Data Points */}
                {gasPoints.map((pt, idx) => (
                  <g key={`${pt.time}-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={idx === gasPoints.length - 1 ? '5' : '3'}
                      className={`svg-data-point ${idx === gasPoints.length - 1 ? 'latest' : ''}`}
                    >
                      <title>{`${pt.time}: ${pt.value} PPM`}</title>
                    </circle>
                    {idx % labelInterval === 0 && (
                      <text x={pt.x} y={height - 10} className="svg-axis-text" textAnchor="middle">
                        {pt.time}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>
        </article>

        {/* Temperature Chart or Graceful Unavailable Card */}
        <article className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Thermal Monitoring</h3>
              <p className="chart-sub">Hardware sensor telemetry</p>
            </div>
            {hasTemperatureData && (
              <div className="chart-badges">
                <span className="legend-indicator temp-legend">Temp (°C)</span>
                <span className="threshold-legend warning">Heat Alert: 38°C</span>
              </div>
            )}
          </div>

          <div className="svg-container">
            {hasTemperatureData ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="sensor-svg-chart" role="img" aria-label="Temperature live chart">
                <defs>
                  <linearGradient id="tempFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 15, 30, 45].map((tick) => {
                  const y = height - padding - (tick / tempMax) * (height - padding * 2);
                  return (
                    <g key={tick}>
                      <line x1={padding} y1={y} x2={width - padding} y2={y} className="svg-grid-line" />
                      <text x={padding - 8} y={y + 4} className="svg-axis-text" textAnchor="end">{tick}°</text>
                    </g>
                  );
                })}

                <path d={tempPath} className="svg-data-path temp-stroke" />

                {tempPoints.map((pt, idx) => (
                  <g key={`${pt.time}-${idx}`}>
                    <circle cx={pt.x} cy={pt.y} r="3" className="svg-data-point temp" />
                    {idx % labelInterval === 0 && (
                      <text x={pt.x} y={height - 10} className="svg-axis-text" textAnchor="middle">
                        {pt.time}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            ) : (
              <div className="temp-unavailable-banner">
                <div className="temp-unavailable-icon">🌡️</div>
                <div className="temp-unavailable-content">
                  <h4>Temperature Sensor Data Unavailable</h4>
                  <p>
                    The physical ESP32 node is currently running the primary <strong>MQ-2 Gas Leakage</strong> and <strong>IR Optical Flame</strong> sensor channels.
                  </p>
                  <span className="temp-notice-pill">
                    System actively safeguarding gas and flame hazards
                  </span>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export default LiveMonitoringCharts;
