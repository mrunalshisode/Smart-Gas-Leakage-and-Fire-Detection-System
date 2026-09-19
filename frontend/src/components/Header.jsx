function Header({ connection }) {
  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">College IoT Safety Project</p>
        <h1>Smart Gas Leakage &amp; Fire Detection System</h1>
        <p className="subtitle">Real-Time IoT Safety Monitoring</p>
      </div>

      <div className={`connection-pill ${connection.isOnline ? 'is-online' : 'is-offline'}`}>
        <span className="pulse-dot" aria-hidden="true" />
        <span>{connection.isOnline ? 'Live' : 'Offline'}</span>
      </div>
    </header>
  );
}

export default Header;
