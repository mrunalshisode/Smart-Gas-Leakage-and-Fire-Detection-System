function AlertsPanel({ alerts }) {
  return (
    <section className="panel alerts-panel" aria-label="Recent alerts">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Recent Alerts</p>
          <h2>Safety Events</h2>
        </div>
      </div>

      <div className="alerts-list">
        {alerts.map((alert) => (
          <article key={alert.id} className={`alert-item severity-${alert.severity.toLowerCase()}`}>
            <div className="alert-row">
              <strong>{alert.type}</strong>
              <span>{alert.time}</span>
            </div>
            <div className="alert-row">
              <span className="severity-badge">{alert.severity}</span>
            </div>
            <p>{alert.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AlertsPanel;
