import SensorLineChart from './SensorLineChart.jsx';

function TemperatureLineChart({ data }) {
  return (
    <SensorLineChart
      data={data}
      title="Temperature Over Time"
      eyebrow="Live Temperature Graph"
      thresholdLabel="Warning: 38 C"
      thresholdValue={38}
      maxValue={55}
      unit="C"
      gradientId="temperatureLineGradient"
      lineClass="temperature-line"
    />
  );
}

export default TemperatureLineChart;
