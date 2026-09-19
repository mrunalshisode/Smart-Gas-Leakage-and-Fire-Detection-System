function SensorLineChart({
  data,
  title,
  eyebrow,
  thresholdLabel,
  thresholdValue,
  maxValue,
  unit,
  gradientId,
  lineClass = 'gas-line',
}) {
  const width = 720;
  const height = 270;
  const padding = 36;
  const chartMax = Math.max(maxValue, ...data.map((item) => item.value));
  const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);

  const points = data.map((item, index) => {
    const x = padding + index * xStep;
    const y = height - padding - (item.value / chartMax) * (height - padding * 2);
    return { ...item, x, y };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((chartMax / 4) * index));

  return (
    <section className="panel chart-panel" aria-label={title}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="threshold-label">{thresholdLabel}</span>
      </div>

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} line chart`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#1f9d73" />
              <stop offset="55%" stopColor="#d89d13" />
              <stop offset="100%" stopColor="#d64545" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y = height - padding - (tick / chartMax) * (height - padding * 2);
            return (
              <g key={tick}>
                <line x1={padding} x2={width - padding} y1={y} y2={y} className="grid-line" />
                <text x={padding - 12} y={y + 4} className="axis-label" textAnchor="end">
                  {tick}
                </text>
              </g>
            );
          })}

          <line
            x1={padding}
            x2={width - padding}
            y1={height - padding - (thresholdValue / chartMax) * (height - padding * 2)}
            y2={height - padding - (thresholdValue / chartMax) * (height - padding * 2)}
            className="warning-line"
          />

          <path d={path} className={lineClass} style={{ stroke: `url("#${gradientId}")` }} />

          {points.map((point) => (
            <g key={`${point.time}-${point.value}`}>
              <circle cx={point.x} cy={point.y} r="5" className="chart-point" />
              <text x={point.x} y={height - 10} className="axis-label" textAnchor="middle">
                {point.time}
              </text>
              <title>{`${point.value} ${unit}`}</title>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

export default SensorLineChart;
