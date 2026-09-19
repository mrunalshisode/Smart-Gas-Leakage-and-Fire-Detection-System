function SensorCard({ title, value, helper, tone }) {
  return (
    <article className={`sensor-card ${tone}`}>
      <div className="sensor-card-top">
        <h2>{title}</h2>
        <span className="sensor-dot" aria-hidden="true" />
      </div>
      <div className="sensor-value">{value}</div>
      <p>{helper}</p>
    </article>
  );
}

export default SensorCard;
