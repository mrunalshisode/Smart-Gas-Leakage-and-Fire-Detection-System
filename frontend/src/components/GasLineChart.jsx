import SensorLineChart from './SensorLineChart.jsx';

function GasLineChart({ data }) {
  return (
    <SensorLineChart
      data={data}
      title="Gas Level Over Time"
      eyebrow="Live Gas Graph"
      thresholdLabel="Warning: 400 ppm"
      thresholdValue={400}
      maxValue={800}
      unit="ppm"
      gradientId="gasLineGradient"
      lineClass="gas-line"
    />
  );
}

export default GasLineChart;
