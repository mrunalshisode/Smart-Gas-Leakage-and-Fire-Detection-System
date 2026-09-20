import React, { useState, useMemo } from 'react';

/**
 * Compact, clean AlertsPage:
 * - Search by keyword or device
 * - Severity filter (All, Critical, High, Warning)
 * - Hazard type filter
 * - Sort order (Newest / Oldest)
 * - Compact, readable table rows with proper alignment
 * - Responsive table overflow wrapper
 * - Clear empty state & pagination
 */
export default function AlertsPage({ alerts = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Recommended action helper
  const getActionForAlert = (type) => {
    switch (type) {
      case 'COMBINED_HAZARD':
        return 'Evacuate immediately. Avoid electrical switches. Contact emergency services.';
      case 'FIRE_DETECTED':
        return 'Evacuate via safe fire exits. Alert building emergency personnel.';
      case 'GAS_LEAK':
      case 'GAS_LEAK_DETECTED':
        return 'Ventilate the area. Shut off main gas cylinder valve. Eliminate ignition sources.';
      default:
        return 'Inspect localized sensor zone and monitor telemetry readings.';
    }
  };

  // Filtered & sorted alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((item) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchMsg = item.message?.toLowerCase().includes(term);
          const matchType = item.type?.toLowerCase().includes(term);
          if (!matchMsg && !matchType) return false;
        }
        if (severityFilter !== 'ALL') {
          if (item.severity?.toUpperCase() !== severityFilter) return false;
        }
        if (typeFilter !== 'ALL') {
          if (item.type !== typeFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dateTime || a.time).getTime() || 0;
        const timeB = new Date(b.dateTime || b.time).getTime() || 0;
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [alerts, searchTerm, severityFilter, typeFilter, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAlerts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, safeCurrentPage, pageSize]);

  return (
    <div className="page-container alerts-page">
      {/* Page Header */}
      <div className="page-intro-header">
        <div>
          <h2 className="page-main-title">Safety Hazard Alerts</h2>
          <p className="page-main-subtitle">
            Chronological incident log and real-time hazard notifications recorded by the system
          </p>
        </div>

        <div className="alerts-count-badge">
          <span className="count-number">{filteredAlerts.length}</span>
          <span className="count-label">Logged Incidents</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="filter-controls-bar">
        {/* Search */}
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search alerts by keyword..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-search-input"
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        {/* Severity Filter */}
        <div className="filter-select-group">
          <label htmlFor="severitySelect">Severity:</label>
          <select
            id="severitySelect"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="filter-select-group">
          <label htmlFor="typeSelect">Hazard Type:</label>
          <select
            id="typeSelect"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="ALL">All Hazard Types</option>
            <option value="COMBINED_HAZARD">Combined Hazard</option>
            <option value="FIRE_DETECTED">Fire Detected</option>
            <option value="GAS_LEAK">Gas Leak</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="filter-select-group">
          <label htmlFor="sortSelect">Sort:</label>
          <select
            id="sortSelect"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Alerts Table Container */}
      <div className="alerts-container-card">
        {paginatedAlerts.length === 0 ? (
          <div className="empty-alerts-state">
            <span className="empty-shield">🛡️</span>
            <h3 className="empty-title">No Hazard Alerts Found</h3>
            <p className="empty-text">
              {alerts.length === 0
                ? 'All sensors report safe conditions. Zero safety hazards logged.'
                : 'No alerts match your current search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Hazard Type</th>
                  <th>Severity</th>
                  <th>Gas Level</th>
                  <th>Flame</th>
                  <th>Incident Details &amp; Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAlerts.map((alt, idx) => {
                  const isCritical = alt.severity === 'CRITICAL' || alt.type === 'COMBINED_HAZARD' || alt.type === 'FIRE_DETECTED';
                  const isWarning = alt.severity === 'WARNING' || alt.severity === 'MEDIUM';
                  const badgeClass = isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-danger';
                  const gasVal = alt.gasLevel !== null && alt.gasLevel !== undefined ? `${alt.gasLevel} PPM` : '--';
                  const isFlame = alt.type === 'FIRE_DETECTED' || alt.type === 'COMBINED_HAZARD';
                  const action = getActionForAlert(alt.type);

                  return (
                    <tr key={alt.id || idx} className="alert-row">
                      <td className="alert-time-cell font-mono">
                        {alt.time || alt.dateTime}
                      </td>
                      <td className="alert-type-cell">
                        <span className="alert-type-badge">
                          <span className="type-icon">{isFlame ? '🔥' : '⚠️'}</span>
                          {alt.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="alert-severity-cell">
                        <span className={`badge badge-sm ${badgeClass}`}>{alt.severity || 'HIGH'}</span>
                      </td>
                      <td className="alert-gas-cell font-mono">
                        <span className={alt.gasLevel >= 400 ? 'text-danger font-bold' : ''}>{gasVal}</span>
                      </td>
                      <td className="alert-flame-cell">
                        <span className={`badge badge-sm ${isFlame ? 'badge-danger' : 'badge-neutral'}`}>
                          {isFlame ? 'DETECTED' : 'CLEAR'}
                        </span>
                      </td>
                      <td className="alert-action-cell">
                        <span className="alert-main-text">{alt.message}</span>
                        <span className="alert-action-text"><strong>Action:</strong> {action}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredAlerts.length > 0 && (
          <div className="table-pagination-footer">
            <div className="pagination-info">
              Showing {(safeCurrentPage - 1) * pageSize + 1} to {Math.min(safeCurrentPage * pageSize, filteredAlerts.length)} of {filteredAlerts.length} entries
            </div>

            <div className="pagination-controls">
              <button
                className="page-nav-btn"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="page-number-indicator">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                className="page-nav-btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
