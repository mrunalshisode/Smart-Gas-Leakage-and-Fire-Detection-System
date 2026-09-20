import React, { useState, useMemo } from 'react';
import { exportHistoryToCSV } from '../services/safetyDataService.js';

/**
 * Compact, polished HistoryPage:
 * - Search by Device ID
 * - Filter by System Status (All, Safe, Warning, Hazard)
 * - Page size selector (10, 25, 50)
 * - Pagination controls (Previous, Next, page count)
 * - One-click CSV Export
 * - Clean table formatting with monospace alignment & responsive overflow
 */
export default function HistoryPage({ history = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter history records
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const devId = (item.deviceId || '').toLowerCase();
        if (!devId.includes(term)) return false;
      }

      if (statusFilter !== 'ALL') {
        const st = (item.systemStatus || '').toUpperCase();
        if (statusFilter === 'SAFE' && !st.includes('SAFE')) return false;
        if (statusFilter === 'WARNING' && !st.includes('WARNING') && !st.includes('LEAK')) return false;
        if (statusFilter === 'HAZARD' && !st.includes('HAZARD') && !st.includes('FIRE') && !st.includes('DANGER')) return false;
      }

      return true;
    });
  }, [history, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, safeCurrentPage, pageSize]);

  return (
    <div className="page-container history-page">
      {/* Page Header */}
      <div className="page-intro-header">
        <div>
          <h2 className="page-main-title">Sensor History &amp; Audit Trail</h2>
          <p className="page-main-subtitle">
            Historical environmental sensor log recorded continuously into database
          </p>
        </div>

        {/* Export to CSV Action */}
        <button
          className="export-csv-action-btn"
          onClick={() => exportHistoryToCSV(history)}
          title="Download complete telemetry log as a CSV spreadsheet"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="filter-controls-bar">
        {/* Search by Device ID */}
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by Device ID (e.g. ESP32)..."
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

        {/* Status Filter */}
        <div className="filter-select-group">
          <label htmlFor="historyStatusFilter">Status:</label>
          <select
            id="historyStatusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="ALL">All Statuses</option>
            <option value="SAFE">Safe Readings</option>
            <option value="WARNING">Gas Warnings</option>
            <option value="HAZARD">Critical Hazards</option>
          </select>
        </div>

        {/* Page Size Selector */}
        <div className="filter-select-group">
          <label htmlFor="pageSizeSelect">Rows:</label>
          <select
            id="pageSizeSelect"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value={10}>10 records</option>
            <option value={25}>25 records</option>
            <option value={50}>50 records</option>
          </select>
        </div>
      </div>

      {/* History Table Container */}
      <div className="history-table-card">
        {paginatedRows.length === 0 ? (
          <div className="empty-history-state">
            <span className="empty-icon">📊</span>
            <h3 className="empty-title">No Historical Records Found</h3>
            <p className="empty-text">
              {history.length === 0
                ? 'No telemetry records logged into database yet. Awaiting live readings.'
                : 'No records match your search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="telemetry-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Device ID</th>
                  <th>Gas Level (PPM)</th>
                  <th>Flame Sensor</th>
                  <th>System Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  const gas = row.gasLevel ?? row.gasValue ?? 0;
                  const isFlame = row.flameStatus === 'Flame Detected' || row.flameDetected;
                  const statusText = row.systemStatus || 'SYSTEM SAFE';

                  const isCritical = statusText.includes('HAZARD') || statusText.includes('FIRE') || statusText.includes('DANGER');
                  const isWarning = statusText.includes('WARNING') || statusText.includes('LEAK');
                  const statusBadgeClass = isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-safe';

                  return (
                    <tr key={row._id || idx} className="telemetry-row">
                      <td className="time-cell font-mono">{row.time}</td>
                      <td className="device-cell font-medium">{row.deviceId || 'ESP32'}</td>
                      <td className="gas-cell font-mono">
                        <span className={gas >= 400 ? 'text-danger font-bold' : 'text-safe font-semibold'}>
                          {gas} <small>PPM</small>
                        </span>
                      </td>
                      <td className="flame-cell">
                        <span className={`badge badge-sm ${isFlame ? 'badge-danger' : 'badge-neutral'}`}>
                          {isFlame ? 'DETECTED' : 'CLEAR'}
                        </span>
                      </td>
                      <td className="status-cell">
                        <span className={`badge badge-sm ${statusBadgeClass}`}>{statusText}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredHistory.length > 0 && (
          <div className="table-pagination-footer">
            <div className="pagination-info">
              Showing {(safeCurrentPage - 1) * pageSize + 1} to {Math.min(safeCurrentPage * pageSize, filteredHistory.length)} of {filteredHistory.length} records
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
