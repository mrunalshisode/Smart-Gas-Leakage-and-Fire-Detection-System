function SensorHistoryTable({ rows }) {
  return (
    <section className="panel history-panel" aria-label="Sensor history">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Sensor History</p>
          <h2>Latest Readings</h2>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Gas Level</th>
              <th>Temperature</th>
              <th>Flame Status</th>
              <th>System Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const gas = row.gasLevel ?? row.gasValue ?? 0;
              const status = row.systemStatus || 'SAFE';
              return (
                <tr key={`${row.time}-${gas}-${idx}`}>
                  <td>{row.time}</td>
                  <td>{gas} ppm</td>
                  <td>{typeof row.temperature === 'number' ? `${row.temperature.toFixed(1)} C` : '28.0 C'}</td>
                  <td>{row.flameStatus}</td>
                  <td>
                    <span className={`table-status ${status.toLowerCase().replaceAll(' ', '-')}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SensorHistoryTable;
