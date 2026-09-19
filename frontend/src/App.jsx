import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getInitialDashboardData,
  fetchDashboardSnapshot,
  subscribeToRealtimeService,
} from './services/safetyDataService.js';
import Header from './components/Header.jsx';
import SafetyStatusCard from './components/SafetyStatusCard.jsx';
import SensorCard from './components/SensorCard.jsx';
import GasLineChart from './components/GasLineChart.jsx';
import TemperatureLineChart from './components/TemperatureLineChart.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';
import SensorHistoryTable from './components/SensorHistoryTable.jsx';
import ActiveAlertBanner from './components/ActiveAlertBanner.jsx';
import ConnectivityStrip from './components/ConnectivityStrip.jsx';
import BuzzerControl from './components/BuzzerControl.jsx';
import SystemOverview from './components/SystemOverview.jsx';

function App() {
  const [dashboardData, setDashboardData] = useState(() => getInitialDashboardData());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const previousStatusRef = useRef(dashboardData.overallStatus);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch initial real data snapshot from backend REST endpoints
    fetchDashboardSnapshot().then((snapshot) => {
      if (isMounted && snapshot) {
        setDashboardData(snapshot);
      }
    });

    // 2. Subscribe to real-time Socket.IO events ('sensor-data', 'alert') & health updates
    const unsubscribe = subscribeToRealtimeService(setDashboardData, () => {
      if (soundEnabled && audioContextRef.current) {
        playBuzzer(audioContextRef.current);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [soundEnabled]);

  useEffect(() => {
    const status = dashboardData.overallStatus;
    const becameCritical =
      soundEnabled &&
      (status === 'DANGER' || status === 'FIRE DETECTED') &&
      previousStatusRef.current !== status;

    if (becameCritical) {
      playBuzzer(audioContextRef.current);
    }

    previousStatusRef.current = status;
  }, [dashboardData.overallStatus, soundEnabled]);

  const enableSound = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;

    if (context.state === 'suspended') {
      await context.resume();
    }

    setSoundEnabled(true);
    playReadyTone(context);
  };

  const sensorCards = useMemo(
    () => [
      {
        title: 'Temperature',
        value: typeof dashboardData.current.temperature === 'number' ? `${dashboardData.current.temperature.toFixed(1)} C` : '28.0 C',
        helper:
          typeof dashboardData.current.temperature === 'number' && dashboardData.current.temperature >= 38
            ? 'Heat level is above safe range'
            : 'Room temperature is normal',
        tone: typeof dashboardData.current.temperature === 'number' && dashboardData.current.temperature >= 38 ? 'danger' : typeof dashboardData.current.temperature === 'number' && dashboardData.current.temperature >= 34 ? 'warning' : 'safe',
      },
      {
        title: 'Gas Level',
        value: `${dashboardData.current.gasLevel} ppm`,
        helper:
          dashboardData.current.gasLevel < 400
            ? 'Gas concentration is safe'
            : 'Gas leakage risk is increasing',
        tone: dashboardData.current.gasLevel >= 700 ? 'danger' : dashboardData.current.gasLevel >= 400 ? 'warning' : 'safe',
      },
      {
        title: 'Flame Detection',
        value: dashboardData.current.flameDetected ? 'Flame Detected' : 'No Flame',
        helper: dashboardData.current.flameDetected ? 'Immediate fire alert' : 'No flame signal detected',
        tone: dashboardData.current.flameDetected ? 'danger' : 'safe',
      },
      {
        title: 'ESP32 Device',
        value: dashboardData.connection.isOnline ? 'Online' : 'Offline',
        helper: dashboardData.connection.label,
        tone: dashboardData.connection.isOnline ? 'safe' : 'offline',
      },
      {
        title: 'Buzzer Status',
        value: dashboardData.current.buzzerOn ? 'ON' : 'OFF',
        helper: dashboardData.current.buzzerOn ? 'Alarm active' : 'Standby',
        tone: dashboardData.current.buzzerOn ? 'danger' : 'neutral',
      },
      {
        title: 'LED Status',
        value: dashboardData.current.ledOn ? 'ON' : 'OFF',
        helper: dashboardData.current.ledOn ? 'Warning indicator active' : 'Normal indicator',
        tone: dashboardData.current.ledOn ? 'warning' : 'neutral',
      },
    ],
    [dashboardData],
  );

  return (
    <main className="app-shell">
      <Header connection={dashboardData.connection} />
      <ActiveAlertBanner status={dashboardData.overallStatus} alertCount={dashboardData.alerts.length} />
      <ConnectivityStrip
        connection={dashboardData.connection}
        mode={dashboardData.mode}
        uptime={dashboardData.uptime}
      />
      <BuzzerControl
        enabled={soundEnabled}
        onEnable={enableSound}
        latestStatus={dashboardData.overallStatus}
      />

      <section className="dashboard-grid" aria-label="Safety monitoring dashboard">
        <div className="status-column">
          <SafetyStatusCard status={dashboardData.overallStatus} reading={dashboardData.current} />
        </div>

        <div className="sensor-grid" aria-label="Current sensor readings">
          {sensorCards.map((sensor) => (
            <SensorCard key={sensor.title} {...sensor} />
          ))}
        </div>
      </section>

      <section className="charts-grid">
        <GasLineChart data={dashboardData.gasTrend} />
        <TemperatureLineChart data={dashboardData.temperatureTrend} />
      </section>

      <section className="content-grid">
        <SystemOverview />
        <AlertsPanel alerts={dashboardData.alerts} />
      </section>

      <SensorHistoryTable rows={dashboardData.history} />
    </main>
  );
}

function playReadyTone(context) {
  playTone(context, 620, 0.12, 0);
}

function playBuzzer(context) {
  if (!context) {
    return;
  }

  [0, 0.22, 0.44, 0.66].forEach((offset) => {
    playTone(context, 760, 0.14, offset);
  });
}

function playTone(context, frequency, duration, delay) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.15, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

export default App;
