const overviewItems = [
  {
    title: 'MQ-2 Gas Sensor',
    text: 'Measures LPG, smoke, and gas concentration. Higher ppm means leakage risk is increasing.',
  },
  {
    title: 'Flame Sensor',
    text: 'Detects direct flame or strong fire radiation and changes the status to fire alert.',
  },
  {
    title: 'Temperature Sensor',
    text: 'Tracks heat near the device. Sudden increase supports fire or overheating detection.',
  },
  {
    title: 'Buzzer and LED',
    text: 'Provide local warning output when the system enters danger or fire condition.',
  },
];

function SystemOverview() {
  return (
    <section className="panel overview-panel" aria-label="System overview">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">System Overview</p>
          <h2>What This IoT Safety System Monitors</h2>
        </div>
      </div>
      <div className="overview-grid">
        {overviewItems.map((item) => (
          <article className="overview-item" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SystemOverview;
