import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getInitialDashboardData,
  fetchDashboardSnapshot,
  subscribeToRealtimeService,
} from './services/safetyDataService.js';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import LiveMonitoringPage from './components/LiveMonitoringPage.jsx';
import AlertsPage from './components/AlertsPage.jsx';
import HistoryPage from './components/HistoryPage.jsx';
import SystemPage from './components/SystemPage.jsx';

/**
 * Main Application Shell:
 * Manages modular 5-page state, real-time WebSocket subscriptions,
 * acoustic buzzer alert tones, and responsive navigation drawer.
 */
function App() {
  const [dashboardData, setDashboardData] = useState(() => getInitialDashboardData());
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' | 'monitoring' | 'alerts' | 'history' | 'system'
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const audioContextRef = useRef(null);
  const previousStatusRef = useRef(dashboardData.overallStatus);

  // 1. Initial snapshot fetch and real-time Socket.IO subscription
  useEffect(() => {
    let isMounted = true;

    fetchDashboardSnapshot().then((snapshot) => {
      if (isMounted && snapshot) {
        setDashboardData(snapshot);
      }
    });

    const unsubscribe = subscribeToRealtimeService(
      (updater) => {
        setDashboardData((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      },
      (hazardAlert) => {
        console.warn('[Realtime Alert Ingested]', hazardAlert);
        if (soundEnabledRef.current && audioContextRef.current) {
          playBuzzer(audioContextRef.current);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Play acoustic alarm tone on critical hazard state transitions
  useEffect(() => {
    const status = dashboardData.overallStatus;
    const isHazard =
      status === 'DANGER' ||
      status === 'FIRE DETECTED' ||
      status === 'COMBINED HAZARD' ||
      status === 'GAS LEAK DETECTED';

    if (soundEnabled && isHazard && previousStatusRef.current !== status) {
      playBuzzer(audioContextRef.current);
    }

    previousStatusRef.current = status;
  }, [dashboardData.overallStatus, soundEnabled]);

  // Toggle browser acoustic alarm sound
  const handleToggleSound = async () => {
    if (!soundEnabled) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const context = audioContextRef.current ?? new AudioCtx();
        audioContextRef.current = context;
        if (context.state === 'suspended') {
          await context.resume();
        }
        playReadyTone(context);
      }
      setSoundEnabled(true);
    } else {
      setSoundEnabled(false);
    }
  };

  // Manual refresh from backend REST endpoints
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const snapshot = await fetchDashboardSnapshot();
      if (snapshot) {
        setDashboardData(snapshot);
      }
    } catch (err) {
      console.warn('[Refresh] Manual sync error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, []);

  // Navigate to target page and scroll to top
  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      {/* 1. Collapsible Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        sidebarOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        alertCount={dashboardData.alerts.length}
      />

      {/* 2. Main Viewport Container */}
      <div className="main-content-wrapper">
        {/* Compact Header Bar */}
        <Header
          connection={dashboardData.connection}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
        />

        {/* Dynamic Page Rendering */}
        <main className="dashboard-main-content">
          {currentPage === 'dashboard' && (
            <DashboardPage
              dashboardData={dashboardData}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'monitoring' && (
            <LiveMonitoringPage
              dashboardData={dashboardData}
            />
          )}

          {currentPage === 'alerts' && (
            <AlertsPage
              alerts={dashboardData.alerts}
            />
          )}

          {currentPage === 'history' && (
            <HistoryPage
              history={dashboardData.history}
            />
          )}

          {currentPage === 'system' && (
            <SystemPage
              dashboardData={dashboardData}
            />
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-info">
              <span className="footer-title">Smart Gas Leakage &amp; Fire Detection System</span>
              <span className="footer-meta">
                IoT Edge Architecture • ESP32 • MQ-2 Sensor • HiveMQ MQTT • Node.js Express • Socket.IO • MongoDB
              </span>
            </div>
            <div className="footer-status">
              <span className="footer-status-pill">
                <span className={`status-dot ${dashboardData.connection.isOnline ? 'dot-success' : 'dot-danger'}`} />
                <span>{dashboardData.connection.isOnline ? 'Edge Node Streaming' : 'Edge Link Severed'}</span>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Web Audio API Tones
function playReadyTone(context) {
  playTone(context, 620, 0.12, 0);
}

function playBuzzer(context) {
  if (!context) return;
  [0, 0.2, 0.4, 0.6].forEach((offset) => {
    playTone(context, 780, 0.14, offset);
  });
}

function playTone(context, frequency, duration, delay) {
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  } catch (err) {
    console.warn('[WebAudio] Tone exception:', err.message);
  }
}

export default App;
