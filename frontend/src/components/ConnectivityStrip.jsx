function ConnectivityStrip({ connection, mode, uptime }) {
  const items = [
    { label: 'ESP32', value: connection.esp32 },
    { label: 'Wi-Fi', value: connection.wifi },
    { label: 'MQTT', value: connection.mqtt },
    { label: 'Backend', value: connection.backend },
    { label: 'Last Data Received', value: connection.lastUpdated },
    { label: 'Monitoring Uptime', value: uptime },
  ];

  return (
    <section className="connectivity-strip" aria-label="Device and connection status">
      <div className="mode-badge">{mode}</div>
      {items.map((item) => (
        <div className="connection-tile" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
      <div className={`connection-tile ${connection.reconnecting ? 'warning' : 'safe'}`}>
        <span>Auto Reconnect</span>
        <strong>{connection.reconnecting ? 'Checking link' : 'Ready'}</strong>
      </div>
    </section>
  );
}

export default ConnectivityStrip;
