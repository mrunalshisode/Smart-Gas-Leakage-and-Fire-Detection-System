const statusCopy = {
  SAFE: {
    title: 'SAFE',
    detail: 'All sensors are within the normal safety range.',
  },
  WARNING: {
    title: 'WARNING',
    detail: 'Gas level is elevated. Monitor the area and improve ventilation.',
  },
  DANGER: {
    title: 'DANGER',
    detail: 'High gas concentration detected. Take immediate safety action.',
  },
  'FIRE DETECTED': {
    title: 'FIRE DETECTED',
    detail: 'Flame sensor is active. Evacuate and trigger emergency response.',
  },
  'COMBINED HAZARD': {
    title: 'COMBINED HAZARD',
    detail: 'Simultaneous gas leak and fire detected! Evacuate immediately!',
  },
};

function SafetyStatusCard({ status, reading }) {
  const copy = statusCopy[status] ?? statusCopy.SAFE;
  const statusClass = (status || 'SAFE').toLowerCase().replaceAll(' ', '-');
  const gas = reading?.gasLevel ?? reading?.gasValue ?? 0;

  return (
    <article className={`safety-card ${statusClass}`} aria-live="polite">
      <div className="status-label">Overall Safety Status</div>
      <div className="status-value">{copy.title}</div>
      <p>{copy.detail}</p>

      <div className="status-metrics">
        <div>
          <span>Gas</span>
          <strong>{gas} ppm</strong>
        </div>
        <div>
          <span>Temperature</span>
          <strong>{typeof reading?.temperature === 'number' ? `${reading.temperature.toFixed(1)} C` : '28.0 C'}</strong>
        </div>
        <div>
          <span>Flame</span>
          <strong>{reading?.flameDetected ? 'Detected' : 'Clear'}</strong>
        </div>
      </div>
    </article>
  );
}

export default SafetyStatusCard;
