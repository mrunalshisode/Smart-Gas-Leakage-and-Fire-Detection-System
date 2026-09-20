import React, { useState, useEffect } from 'react';

/**
 * Compact, polished Header bar:
 * - Brand title & subtitle
 * - Live digital clock
 * - 3 clean status indicators: ESP32, MQTT, API
 * - Siren audio toggle & manual refresh button
 * - Mobile navigation hamburger toggle
 */
export default function Header({
  connection,
  soundEnabled,
  onToggleSound,
  onRefresh,
  isRefreshing,
  onToggleSidebar,
  sidebarOpen,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const formattedClock = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const esp32Online = Boolean(connection?.isOnline);
  const mqttConnected = connection?.mqtt === 'Connected';
  const backendOnline = connection?.backend === 'Online' || connection?.isOnline;

  return (
    <header className="site-header">
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          title="Toggle Navigation"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {sidebarOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <div className="brand-badge">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c1.5 3 4 5 4 8a4 4 0 1 1-8 0c0-3 2.5-5 4-8z" />
              <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="header-title">Smart Gas &amp; Fire Detection</h1>
            <span className="header-subtitle">Real-Time IoT Safety System</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Live Date and Time */}
        <div className="clock-widget" title="Local System Time">
          <span className="clock-date">{formattedDate}</span>
          <span className="clock-time">{formattedClock}</span>
        </div>

        {/* Status Indicators Group */}
        <div className="status-indicators-group">
          <div className={`status-pill ${esp32Online ? 'online' : 'offline'}`} title="ESP32 Microcontroller Node">
            <span className="status-dot-pulse" aria-hidden="true" />
            <span className="pill-name">ESP32:</span>
            <span className="pill-value">{esp32Online ? 'Online' : 'Offline'}</span>
          </div>

          <div className={`status-pill ${mqttConnected ? 'online' : 'offline'}`} title="HiveMQ MQTT Broker Link">
            <span className="status-dot-pulse" aria-hidden="true" />
            <span className="pill-name">MQTT:</span>
            <span className="pill-value">{connection?.mqtt || 'Offline'}</span>
          </div>

          <div className={`status-pill ${backendOnline ? 'online' : 'offline'}`} title="Express REST & WebSocket Server">
            <span className="status-dot-pulse" aria-hidden="true" />
            <span className="pill-name">API:</span>
            <span className="pill-value">{backendOnline ? 'Connected' : 'Offline'}</span>
          </div>
        </div>

        {/* Audio Siren Toggle */}
        <button
          className={`control-btn ${soundEnabled ? 'active' : ''}`}
          onClick={onToggleSound}
          title={soundEnabled ? 'Hazard siren is enabled. Click to mute.' : 'Muted. Click to enable hazard siren.'}
          aria-label="Toggle alert siren audio"
        >
          {soundEnabled ? (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-4 0v17.54l-5-5H1v-7.54h4l5-5zm-2 4.41L5.59 10H3v4h2.59L8 16.35V7.64zm8.5 4.36c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
              <span>Siren ON</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
              <span>Muted</span>
            </>
          )}
        </button>

        {/* Manual Refresh Button */}
        <button
          className={`control-btn refresh-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh latest data snapshot"
          aria-label="Refresh data"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span className="refresh-label">Refresh</span>
        </button>
      </div>
    </header>
  );
}
