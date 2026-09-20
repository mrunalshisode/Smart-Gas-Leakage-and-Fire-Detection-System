import { useState } from 'react';

function RecentAlertsPanel({ alerts = [] }) {
  const [showAll, setShowAll] = useState(false);

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 5);

  return (
    <section className="dashboard-section" id="alerts" aria-label="Recent Safety Incidents">
      <div className="section-header-wrap">
        <div>
          <span className="section-eyebrow">Event Logs</span>
          <h2 className="section-title">Safety Hazard Alerts</h2>
        </div>

        {alerts.length > 5 && (
          <button
            className="text-btn-toggle"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Recent (5)' : `View All Alerts (${alerts.length})`}
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="empty-alerts-card">
          <div className="empty-shield-icon">🛡️</div>
          <div className="empty-alerts-text">
            <h3>No Active or Historical Hazards</h3>
            <p>All safety logs report normal nominal levels. No gas breaches or fire alerts recorded.</p>
          </div>
        </div>
      ) : (
        <div className="alerts-list-compact">
          {displayedAlerts.map((alert, idx) => {
            const isCritical = alert.severity === 'CRITICAL' || alert.type === 'FIRE_DETECTED' || alert.type === 'COMBINED_HAZARD';
            const severityClass = isCritical ? 'severity-critical' : 'severity-high';

            return (
              <article key={alert.id || idx} className={`alert-card-item ${severityClass}`}>
                <div className="alert-left-indicator" aria-hidden="true" />

                <div className="alert-content-wrap">
                  <div className="alert-meta-top">
                    <div className="alert-type-group">
                      <span className="alert-icon-mini">
                        {alert.type === 'FIRE_DETECTED' ? '🔥' : alert.type === 'COMBINED_HAZARD' ? '🚨' : '⚠️'}
                      </span>
                      <strong className="alert-type-name">{alert.type.replace('_', ' ')}</strong>
                      <span className={`alert-severity-tag ${severityClass}`}>{alert.severity}</span>
                    </div>

                    <div className="alert-time-group">
                      <span className="alert-time-text">{alert.dateTime || alert.time}</span>
                    </div>
                  </div>

                  <p className="alert-msg-text">{alert.message}</p>

                  {alert.gasLevel !== null && alert.gasLevel !== undefined && (
                    <div className="alert-trigger-metric">
                      <span>Recorded Gas Concentration: </span>
                      <strong>{alert.gasLevel} PPM</strong>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default RecentAlertsPanel;
