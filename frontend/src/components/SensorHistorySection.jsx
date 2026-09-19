import { useState } from 'react';
import { exportHistoryToCSV } from '../services/safetyDataService.js';

function SensorHistorySection({ rows = [] }) {
  const [displayCount, setDisplayCount] = useState(10);

  const visibleRows = rows.slice(0, displayCount);

  return (
    <section className="dashboard-section" id="history" aria-label="Historical Sensor Readings">
      <div className="section-header-wrap">
        <div>
          <span className="section-eyebrow">Database Records</span>
          <h2 className="section-title">Sensor History &amp; Audit Trail</h2>
        </div>

        <div className="table-actions-group">
          {/* Row limit selector */}
          <div className="row-selector">
            <span className="selector-label">Show:</span>
            {[10, 25, 50].map((count) => (
              <button
                key={count}
                className={`selector-btn ${displayCount === count ? 'active' : ''}`}
                onClick={() => setDisplayCount(count)}
              >
                {count}
              </button>
            ))}
          </div>

          {/* Export to CSV Button */}
          <button
            className="export-csv-btn"
            onClick={() => exportHistoryToCSV(rows)}
            title="Download full telemetry log as a CSV spreadsheet"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="history-table-container">
        {rows.length === 0 ? (
          <div className="empty-table-msg">
            <p>No historical telemetry records logged in database yet.</p>
          </div>
        ) : (
          <div className="table-scroll-wrap">
            <table className="modern-telemetry-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Device Node</th>
                  <th>Gas Concentration</th>
                  <th>Temperature</th>
                  <th>Flame Sensor</th>
                  <th>Safety Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, idx) => {
                  const gas = Number(row.gasLevel ?? row.gasValue ?? 0);
                  const isFlame = row.flameStatus === 'Flame Detected' || row.flameDetected;
                  const status = row.systemStatus || 'SAFE';

                  let statusBadgeClass = 'badge-safe';
                  if (status === 'COMBINED HAZARD') statusBadgeClass = 'badge-critical';
                  else if (status === 'FIRE DETECTED') statusBadgeClass = 'badge-danger';
                  else if (status === 'DANGER') statusBadgeClass = 'badge-danger';
                  else if (status.includes('WARNING') || status.includes('GAS LEAK')) statusBadgeClass = 'badge-warning';

                  return (
                    <tr key={`${row.rawTimestamp || row.time}-${idx}`}>
                      <td className="cell-time">{row.time}</td>
                      <td className="cell-device">
                        <span className="device-chip">{row.deviceId || 'ESP32'}</span>
                      </td>
                      <td className="cell-gas">
                        <strong className={gas >= 400 ? 'text-danger' : 'text-navy'}>
                          {gas} PPM
                        </strong>
                      </td>
                      <td className="cell-temp">
                        {row.temperature !== null && row.temperature !== undefined ? (
                          `${row.temperature.toFixed(1)} °C`
                        ) : (
                          <span className="text-muted">Unavailable</span>
                        )}
                      </td>
                      <td className="cell-flame">
                        <span className={`flame-indicator ${isFlame ? 'flame-active' : 'flame-clear'}`}>
                          {isFlame ? '🔥 Detected' : '🛡️ Clear'}
                        </span>
                      </td>
                      <td className="cell-status">
                        <span className={`table-status-pill ${statusBadgeClass}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer-meta">
          <span>Showing {Math.min(displayCount, rows.length)} of {rows.length} total recorded logs</span>
          {rows.length > displayCount && (
            <button
              className="view-more-link"
              onClick={() => setDisplayCount((prev) => Math.min(prev + 15, rows.length))}
            >
              Load more rows ↓
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default SensorHistorySection;
