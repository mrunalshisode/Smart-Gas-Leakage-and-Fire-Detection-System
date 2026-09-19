function MetricCardsGrid({ reading, current, connection }) {
  const activeReading = reading || current;
  const gas = Number(activeReading?.gasLevel ?? activeReading?.gasValue ?? 0);
  const isFlame = Boolean(activeReading?.flameDetected);
  const temp = activeReading?.temperature;
  const buzzerOn = Boolean(activeReading?.buzzerOn);
  const ledOn = Boolean(activeReading?.ledOn);
  const isOnline = Boolean(connection?.isOnline);

  const gasStatus =
    gas >= 700
      ? { tone: 'danger', label: 'Critical Danger', desc: 'Severe gas concentration detected' }
      : gas >= 400
      ? { tone: 'warning', label: 'Leak Warning', desc: 'Exceeds 400 PPM threshold' }
      : { tone: 'safe', label: 'Normal / Safe', desc: 'Below 400 PPM threshold' };

  const flameStatus = isFlame
    ? { tone: 'danger', label: 'Fire Detected', desc: 'Optical flame sensor active' }
    : { tone: 'safe', label: 'No Flame', desc: 'No fire infrared detected' };

  const tempStatus =
    temp !== null && temp !== undefined
      ? temp >= 38
        ? { tone: 'danger', label: 'High Heat', desc: 'Temperature above safe range' }
        : temp >= 32
        ? { tone: 'warning', label: 'Warm', desc: 'Slightly elevated ambient heat' }
        : { tone: 'safe', label: 'Normal', desc: 'Ambient temperature is normal' }
      : { tone: 'neutral', label: 'Unavailable', desc: 'Sensor module not connected' };

  const buzzerStatus = buzzerOn
    ? { tone: 'danger', label: 'ALARM ACTIVE', desc: 'Acoustic buzzer sounder triggered' }
    : { tone: 'neutral', label: 'Standby', desc: 'Acoustic alarm muted in safe state' };

  const ledStatus = ledOn
    ? { tone: 'warning', label: 'WARNING ACTIVE', desc: 'Visual strobe warning LED on' }
    : { tone: 'safe', label: 'Normal Indicator', desc: 'Green heartbeat beacon active' };

  const esp32Status = isOnline
    ? { tone: 'safe', label: 'Online & Connected', desc: `Node ID: ${connection?.deviceId || 'ESP32'}` }
    : { tone: 'offline', label: 'Disconnected', desc: 'Hardware link offline' };

  const cards = [
    {
      id: 'gas',
      title: 'Gas Level (MQ-2)',
      value: `${gas} PPM`,
      badge: gasStatus.label,
      desc: gasStatus.desc,
      tone: gasStatus.tone,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      progress: Math.min(100, Math.round((gas / 800) * 100)),
    },
    {
      id: 'flame',
      title: 'Flame Sensor',
      value: isFlame ? 'FIRE DETECTED' : 'Clear',
      badge: flameStatus.label,
      desc: flameStatus.desc,
      tone: flameStatus.tone,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      ),
    },
    {
      id: 'temperature',
      title: 'Temperature',
      value: temp !== null && temp !== undefined ? `${temp.toFixed(1)} °C` : 'Unavailable',
      badge: tempStatus.label,
      desc: tempStatus.desc,
      tone: tempStatus.tone,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0a3 3 0 100 6 3 3 0 000-6zm0-15a3 3 0 00-3 3v8.586a5 5 0 106 0V3a3 3 0 00-3-3z" />
        </svg>
      ),
    },
    {
      id: 'buzzer',
      title: 'Buzzer Siren',
      value: buzzerOn ? 'ON (ALARMING)' : 'OFF (STANDBY)',
      badge: buzzerStatus.label,
      desc: buzzerStatus.desc,
      tone: buzzerStatus.tone,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
    {
      id: 'led',
      title: 'Safety LED Indicator',
      value: ledOn ? 'ON (STROBING)' : 'NORMAL (GREEN)',
      badge: ledStatus.label,
      desc: ledStatus.desc,
      tone: ledStatus.tone,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
        </svg>
      ),
    },
    {
      id: 'esp32',
      title: 'ESP32 IoT Node',
      value: isOnline ? 'ONLINE' : 'OFFLINE',
      badge: esp32Status.label,
      desc: esp32Status.desc,
      tone: esp32Status.tone,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="metric-cards-grid">
      {cards.map((card) => (
        <article key={card.id} className={`metric-card border-${card.tone}`}>
          <div className="card-header">
            <span className={`card-icon-wrap icon-${card.tone}`}>{card.icon}</span>
            <span className={`card-badge badge-${card.tone}`}>{card.badge}</span>
          </div>

          <div className="card-body">
            <h3 className="card-title">{card.title}</h3>
            <div className={`card-value ${card.tone === 'danger' ? 'text-danger' : ''}`}>
              {card.value}
            </div>
            <p className="card-desc">{card.desc}</p>
          </div>

          {card.progress !== undefined && (
            <div className="card-progress-track" title={`Gas range level: ${card.progress}%`}>
              <div
                className={`card-progress-fill fill-${card.tone}`}
                style={{ width: `${Math.max(5, card.progress)}%` }}
              />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export default MetricCardsGrid;
