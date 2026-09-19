const alertMessages = {
  SAFE: 'System is normal. Gas, temperature, and flame sensors are within safe limits.',
  WARNING: 'Warning level detected. Keep the area ventilated and continue monitoring.',
  DANGER: 'Danger level detected. Buzzer and LED indicators are active for safety response.',
  'FIRE DETECTED': 'Fire detected. Evacuate immediately and disconnect nearby power sources.',
};

function ActiveAlertBanner({ status, alertCount }) {
  const bannerClass = status.toLowerCase().replaceAll(' ', '-');

  return (
    <section className={`active-alert ${bannerClass}`} aria-live="polite">
      <div>
        <p className="eyebrow">Current Active Alert</p>
        <h2>{status}</h2>
        <p>{alertMessages[status] ?? alertMessages.SAFE}</p>
      </div>
      <div className="alert-count">
        <span>{alertCount}</span>
        <strong>Total Alerts</strong>
      </div>
    </section>
  );
}

export default ActiveAlertBanner;
