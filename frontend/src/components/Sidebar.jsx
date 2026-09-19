import React from 'react';

/**
 * Clean, compact sidebar navigation drawer with 5 primary sections:
 * - Dashboard
 * - Live Monitoring
 * - Alerts
 * - History
 * - System
 */
export default function Sidebar({
  currentPage,
  onNavigate,
  sidebarOpen,
  onCloseMobile,
  alertCount = 0,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      id: 'monitoring',
      label: 'Live Monitoring',
      icon: (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      badge: alertCount > 0 ? alertCount : null,
      icon: (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'system',
      label: 'System',
      icon: (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
  ];

  const handleSelect = (pageId) => {
    onNavigate(pageId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Main Navigation">
        <div className="sidebar-brand">
          <div className="sidebar-logo-mark">
            <span className="logo-flame">🔥</span>
            <span className="logo-shield">🛡️</span>
          </div>
          <div className="sidebar-brand-text">
            <strong>IoT Safety Panel</strong>
            <span>College Project</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-title">Navigation</span>
          <ul>
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-link-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="college-project-card">
            <p className="project-tag">Smart Gas &amp; Fire</p>
            <p className="project-name">IoT Safety Monitoring</p>
            <span className="project-version">ESP32 • HiveMQ MQTT • Node.js</span>
          </div>
        </div>
      </aside>
    </>
  );
}
