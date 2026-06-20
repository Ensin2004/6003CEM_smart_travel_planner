/**
 * Admin module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLoggingMonitoring } from '../../api/adminLogApi';
import useNotifications from '../../hooks/useNotifications';
import { getApiErrorMessage } from '../../utils/apiError';
import './SystemErrorsPage.css';

const monitoringRefreshIntervalMs = 20 * 1000;

// Status filter options for event outcomes
const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'fail', label: 'Failed' },
  { value: 'error', label: 'Error' },
];

// Category filter options for event sources
const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'api', label: 'API' },
  { value: 'system', label: 'System' },
  { value: 'auth', label: 'Auth' },
  { value: 'rate-limit', label: 'Rate limit' },
];

// Severity filter options for event impact levels
const severityOptions = [
  { value: '', label: 'All severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

// Format Date Time converts raw values into readable display text.
// Transforms ISO date strings into formatted date and time strings
const formatDateTime = (value) => {
  if (!value) return 'Unknown time';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

// Retrieves user-friendly error messages from API responses
const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to load logging and monitoring data.');

// Extracts the actor label from a log entry
const getActorLabel = (log) => log.actor?.email || log.attemptedEmail || 'System';

// Extracts metadata about the actor from a log entry
const getActorMeta = (log) => {
  if (log.actor?.role) return log.actor.role;
  if (log.attemptedEmail) return 'masked attempted email';
  return 'service event';
};

// Format Category Label converts raw values into readable display text.
// Transforms hyphen-separated category values into capitalized display text
const formatCategoryLabel = (category = 'api') =>
  category
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getLogDisplayTime = (log) => log.lastOccurredAt || log.createdAt;

// SystemErrorsPage renders the main screen and handles nearby interactions.
// Main component for monitoring system activity and investigating errors
function SystemErrorsPage() {
  const { subscribeToAdminLogEvents } = useNotifications();

  // State management for filters, monitoring data, and UI controls
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    severity: '',
    service: '',
    errorCode: '',
    requestId: '',
    from: '',
    to: '',
  });
  const [monitoring, setMonitoring] = useState(null);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // Builds query parameters from active filter values
  const params = useMemo(
    () =>
      Object.entries(filters).reduce((activeFilters, [key, value]) => {
        if (value) activeFilters[key] = value;
        return activeFilters;
      }, {}),
    [filters]
  );

  // Fetches monitoring data from the API with current filter parameters
  const fetchMonitoring = useCallback(async ({ showSuccess = false, showLoading = true, silent = false } = {}) => {
    if (showLoading) setIsLoading(true);
    if (!silent) setError('');
    if (showSuccess) setSuccessMessage('');
    try {
      const response = await getLoggingMonitoring({ ...params, limit: 50 });
      setMonitoring(response.data.data);
      setLastUpdatedAt(new Date());

      if (showSuccess) {
        setSuccessMessage('Logging and monitoring data refreshed.');
      }
    } catch (requestError) {
      if (!silent) setError(getErrorMessage(requestError));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [params]);

  // Triggers initial data fetch when the component mounts
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMonitoring();
    }, 0);
    // Cleanup prevents state updates after component unmount.
    return () => window.clearTimeout(timeoutId);
  }, [fetchMonitoring]);

  // Keeps the monitoring page fresh while the admin stays on it.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchMonitoring({ showLoading: false, silent: true });
    }, monitoringRefreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [fetchMonitoring]);

  // Reacts immediately when the server sends an admin operational alert.
  useEffect(() => subscribeToAdminLogEvents(() => {
    fetchMonitoring({ showLoading: false, silent: true });
  }), [fetchMonitoring, subscribeToAdminLogEvents]);

  // Extracts summary data and logs from the monitoring response
  const summary = monitoring?.summary || {};
  const logs = monitoring?.logs || [];
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const health = summary.health || 'healthy';
  const categoryCounts = summary.categoryCounts || [];
  const dailyCounts = summary.dailyCounts || [];
  const categoryMaxCount = Math.max(...categoryCounts.map((item) => item.count), 1);
  const dailyMaxCount = Math.max(...dailyCounts.map((item) => item.fail + item.error), 1);
  const latestEventLabel = logs[0] ? formatDateTime(getLogDisplayTime(logs[0])) : 'No events yet';
  const lastUpdatedLabel = lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Loading now';

  // Handles filter input changes and updates filter state
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  // Resets all filters to their default empty values
  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      severity: '',
      service: '',
      errorCode: '',
      requestId: '',
      from: '',
      to: '',
    });
  };

  // Renders the complete system monitoring interface
  return (
    <section className="logging-page" aria-labelledby="logging-title">
      {/* Hero section with title, health status, and quick actions */}
      <div className="logging-hero">
        <div>
          <p className="eyebrow">Admin monitoring</p>
          <h2 id="logging-title">System Activity & Issues</h2>
          <p>Check the system's health, find failed activity, and inspect technical details when an issue needs attention.</p>
          <div className="logging-hero-meta" aria-label="Monitoring status">
            <span className={`logging-health logging-health-${health}`}>
              {health === 'healthy' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              {health === 'healthy' ? 'Healthy' : 'Needs attention'}
            </span>
            <span>
              <Clock3 size={16} aria-hidden="true" />
              {logs[0] ? `Latest event ${formatDateTime(getLogDisplayTime(logs[0]))}` : 'No events yet'}
            </span>
          </div>
        </div>
        <div className="logging-hero-actions">
          <div className="logging-live-card" aria-label="Latest monitoring event">
            <span>Latest event</span>
            <strong>{latestEventLabel}</strong>
            <small>Auto-updated {lastUpdatedLabel}</small>
          </div>
          <button
            className="admin-icon-action"
            type="button"
            onClick={() => fetchMonitoring({ showSuccess: true })}
            disabled={isLoading}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status message display area */}
      {error && <p className="form-error logging-status">{error}</p>}
      {successMessage && <p className="form-success logging-status">{successMessage}</p>}

      {/* Primary metrics cards showing monitoring statistics */}
      <div className="monitoring-metrics" aria-label="Monitoring summary">
        <article className="monitoring-metric-total">
          <span className="monitoring-metric-icon"><Activity size={22} aria-hidden="true" /></span>
          <div>
            <span>Recorded events</span>
            <strong>{summary.totalLogs ?? 0}</strong>
            <small>All activity matching the filters</small>
          </div>
        </article>
        <article className="monitoring-metric-warning">
          <span className="monitoring-metric-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
          <div>
            <span>Failed requests</span>
            <strong>{summary.failures ?? 0}</strong>
            <small>Requests that could not complete</small>
          </div>
        </article>
        <article className="monitoring-metric-danger">
          <span className="monitoring-metric-icon"><ServerCrash size={22} aria-hidden="true" /></span>
          <div>
            <span>Unexpected errors</span>
            <strong>{summary.errors ?? 0}</strong>
            <small>Internal problems needing review</small>
          </div>
        </article>
        <article className="monitoring-metric-security">
          <span className="monitoring-metric-icon"><ShieldAlert size={22} aria-hidden="true" /></span>
          <div>
            <span>Issues in last 24 hours</span>
            <strong>{summary.recentFailures ?? 0}</strong>
            <small>Recent failures and errors</small>
          </div>
        </article>
      </div>

      {/* Guide section explaining how to interpret the monitoring data */}
      <section className="logging-guide" aria-labelledby="monitoring-guide-title">
        <div className="logging-guide-heading">
          <Info size={20} aria-hidden="true" />
          <div>
            <span>How to read this page</span>
            <h3 id="monitoring-guide-title">Start with the outcome, then check how serious it is.</h3>
          </div>
        </div>
        <div className="logging-guide-items">
          <p><strong>Status</strong> tells you the outcome: failed was rejected, and error was unexpected.</p>
          <p><strong>Severity</strong> tells you the impact: info is normal, warning needs checking, and error or critical needs attention.</p>
          <p><strong>Category</strong> tells you where it happened: authentication, API, system, or rate limiting.</p>
        </div>
      </section>

      {/* Charts section showing trends and category breakdowns */}
      <div className="logging-overview">
        <section className="logging-chart-panel" aria-labelledby="trend-chart-title">
          <div className="logging-panel-heading">
            <div>
              <span>Health trend</span>
              <h3 id="trend-chart-title">Activity during the last 7 days</h3>
            </div>
            <small>Orange: failed | Red: error</small>
          </div>
          <div className="logging-trend-chart">
            {dailyCounts.map((item) => {
              const total = item.fail + item.error;
              return (
                <div className="logging-trend-day" key={item.date}>
                  <span>{new Date(item.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                  <i style={{ '--bar-size': `${Math.max((total / dailyMaxCount) * 100, total ? 8 : 0)}%` }}>
                    <b className="logging-trend-fail" style={{ '--segment-size': `${(item.fail / Math.max(total, 1)) * 100}%` }} />
                    <b className="logging-trend-error" style={{ '--segment-size': `${(item.error / Math.max(total, 1)) * 100}%` }} />
                  </i>
                  <strong>{total}</strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="logging-insight-panel" aria-labelledby="category-breakdown-title">
          <div className="logging-panel-heading">
            <div>
              <span>Issue source</span>
              <h3 id="category-breakdown-title">Where events happened</h3>
            </div>
          </div>
          {categoryCounts.length === 0 ? (
            <p className="logging-muted">No category activity yet.</p>
          ) : (
            <div className="logging-category-list">
              {categoryCounts.map((item) => (
                <span
                  key={item.category}
                  style={{ '--category-share': `${Math.max((item.count / categoryMaxCount) * 100, 8)}%` }}
                >
                  <span>
                    {formatCategoryLabel(item.category)}
                    <strong>{item.count}</strong>
                  </span>
                  <i aria-hidden="true" />
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Filter section with basic and advanced search options */}
      <div className="logging-filters">
        <div className="logging-section-title">
          <div>
            <Filter size={17} aria-hidden="true" />
            <span>
              <strong>Find an event</strong>
              <small>Use the main filters first. Open advanced search only when tracing a technical issue.</small>
            </span>
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters}>
              <X size={15} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
        <label>
          Status
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select name="category" value={filters.category} onChange={handleFilterChange}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select name="severity" value={filters.severity} onChange={handleFilterChange}>
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          From date
          <input
            name="from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={handleFilterChange}
          />
        </label>
        <label>
          To date
          <input
            name="to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={handleFilterChange}
          />
        </label>
        <button
          className="logging-advanced-toggle"
          type="button"
          aria-expanded={isAdvancedFiltersOpen}
          onClick={() => setIsAdvancedFiltersOpen((current) => !current)}
        >
          Advanced search
          <ChevronDown size={17} aria-hidden="true" />
        </button>

        {/* Advanced filters section - collapsible */}
        {isAdvancedFiltersOpen && (
          <div className="logging-advanced-filters">
            <label>
              Service
              <span className="logging-search-field">
                <Search size={16} aria-hidden="true" />
                <input name="service" placeholder="Example: auth or weather" type="search" value={filters.service} onChange={handleFilterChange} />
              </span>
            </label>
            <label>
              Error code
              <span className="logging-search-field">
                <Search size={16} aria-hidden="true" />
                <input name="errorCode" placeholder="Example: INVALID_CREDENTIALS" type="search" value={filters.errorCode} onChange={handleFilterChange} />
              </span>
            </label>
            <label>
              Request ID
              <span className="logging-search-field">
                <Search size={16} aria-hidden="true" />
                <input name="requestId" placeholder="Trace one exact request" type="search" value={filters.requestId} onChange={handleFilterChange} />
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Table displaying the filtered event logs */}
      <div className="logging-table-wrap">
        <div className="logging-table-header">
          <div>
            <span>Investigation list</span>
            <h3>Recent events</h3>
          </div>
          <small>{monitoring?.pagination?.total ?? 0} grouped rows, {monitoring?.pagination?.totalOccurrences ?? summary.totalLogs ?? 0} events</small>
        </div>
        {isLoading ? (
          <p className="settings-empty">Loading logging and monitoring data...</p>
        ) : logs.length === 0 ? (
          <p className="settings-empty">No matching logs found.</p>
        ) : (
          <table className="logging-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>What happened</th>
                <th>Source</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <span className="logging-time">{formatDateTime(getLogDisplayTime(log))}</span>
                    <small>{formatCategoryLabel(log.category || 'api')}</small>
                  </td>
                  <td className="logging-event-summary">
                    <strong>
                      {log.message || 'No message recorded'}
                      {Number(log.occurrenceCount || 1) > 1 ? (
                        <span className="logging-repeat-badge">x{log.occurrenceCount}</span>
                      ) : null}
                    </strong>
                    <small>{log.errorCode || 'No error code'}</small>
                  </td>
                  <td>
                    <span className="logging-source">
                      <strong>{formatCategoryLabel(log.category || 'api')}</strong>
                      <small>{log.service || 'Unknown service'}</small>
                    </span>
                  </td>
                  <td>
                    <span className={`logging-badge logging-badge-${log.status}`}>{log.status}</span>
                  </td>
                  <td>
                    <span className={`logging-severity logging-severity-${log.severity || 'info'}`}>
                      {log.severity || 'info'}
                    </span>
                  </td>
                  <td>
                    <button className="logging-view-action" type="button" onClick={() => setSelectedLog(log)}>
                      <Eye size={15} aria-hidden="true" />
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Event details dialog showing complete log information */}
      {selectedLog && (
        <div className="logging-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedLog(null)}>
          <div className="logging-dialog" role="dialog" aria-modal="true" aria-labelledby="event-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="logging-dialog-heading">
              <div>
                <p className="eyebrow">Event details</p>
                <h3 id="event-detail-title">{selectedLog.message || 'Recorded system event'}</h3>
              </div>
              <button type="button" aria-label="Close event details" onClick={() => setSelectedLog(null)}><X size={18} /></button>
            </div>
            <div className="logging-dialog-badges">
              <span className={`logging-badge logging-badge-${selectedLog.status}`}>{selectedLog.status}</span>
              <span className={`logging-severity logging-severity-${selectedLog.severity || 'info'}`}>{selectedLog.severity || 'info'}</span>
              <span>{formatCategoryLabel(selectedLog.category || 'api')}</span>
            </div>
            <dl className="logging-detail-grid">
              <div><dt>Latest time</dt><dd>{formatDateTime(getLogDisplayTime(selectedLog))}</dd></div>
              <div><dt>Occurrences</dt><dd>{Number(selectedLog.occurrenceCount || 1).toLocaleString()}</dd></div>
              <div><dt>Actor</dt><dd>{getActorLabel(selectedLog)} <small>{getActorMeta(selectedLog)}</small></dd></div>
              <div><dt>Service</dt><dd>{selectedLog.service || 'Not recorded'}</dd></div>
              <div><dt>Endpoint</dt><dd>{selectedLog.method || 'GET'} {selectedLog.endpoint || 'Not recorded'}</dd></div>
              <div><dt>Error code</dt><dd>{selectedLog.errorCode || 'Not recorded'}</dd></div>
              <div><dt>Request ID</dt><dd>{selectedLog.requestId || 'Not recorded'}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}

// Default export registers the primary value.
export default SystemErrorsPage;
