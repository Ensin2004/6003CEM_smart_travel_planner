import {
  Activity,
  AlertTriangle,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLoggingMonitoring } from '../../api/adminLogApi';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'fail', label: 'Failed' },
  { value: 'error', label: 'Error' },
];

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'api', label: 'API' },
  { value: 'system', label: 'System' },
  { value: 'auth', label: 'Auth' },
  { value: 'rate-limit', label: 'Rate limit' },
];

const severityOptions = [
  { value: '', label: 'All severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

const formatDateTime = (value) => {
  if (!value) return 'Unknown time';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getErrorMessage = (error) =>
  error.response?.data?.message || 'Unable to load logging and monitoring data.';

const getActorLabel = (log) => log.actor?.email || log.attemptedEmail || 'System';

const getActorMeta = (log) => {
  if (log.actor?.role) return log.actor.role;
  if (log.attemptedEmail) return 'masked attempted email';
  return 'service event';
};

const formatCategoryLabel = (category = 'api') =>
  category
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

function SystemErrorsPage() {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    severity: '',
    service: '',
  });
  const [monitoring, setMonitoring] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const params = useMemo(
    () =>
      Object.entries(filters).reduce((activeFilters, [key, value]) => {
        if (value) activeFilters[key] = value;
        return activeFilters;
      }, {}),
    [filters]
  );

  const fetchMonitoring = useCallback(async ({ showSuccess = false } = {}) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await getLoggingMonitoring({ ...params, limit: 50 });
      setMonitoring(response.data.data);

      if (showSuccess) {
        setSuccessMessage('Logging and monitoring data refreshed.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMonitoring();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchMonitoring]);

  const summary = monitoring?.summary || {};
  const logs = monitoring?.logs || [];
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const health = summary.health || 'healthy';
  const categoryCounts = summary.categoryCounts || [];

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      severity: '',
      service: '',
    });
  };

  return (
    <section className="logging-page" aria-labelledby="logging-title">
      <div className="logging-hero">
        <div>
          <p className="eyebrow">Admin monitoring</p>
          <h2 id="logging-title">Logging / Monitoring</h2>
          <p>Review API failures, server issues, rate-limit events, and authentication activity in one place.</p>
          <div className="logging-hero-meta" aria-label="Monitoring status">
            <span className={`logging-health logging-health-${health}`}>
              {health === 'healthy' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              {health === 'healthy' ? 'Healthy' : 'Needs attention'}
            </span>
            <span>
              <Clock3 size={16} aria-hidden="true" />
              {logs[0]?.createdAt ? `Latest event ${formatDateTime(logs[0].createdAt)}` : 'No events yet'}
            </span>
          </div>
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

      {error && <p className="form-error logging-status">{error}</p>}
      {successMessage && <p className="form-success logging-status">{successMessage}</p>}

      <div className="monitoring-metrics" aria-label="Monitoring summary">
        <article className="monitoring-metric-total">
          <span className="monitoring-metric-icon"><Activity size={22} aria-hidden="true" /></span>
          <div>
            <span>Total events</span>
            <strong>{summary.totalLogs ?? 0}</strong>
          </div>
        </article>
        <article>
          <span className="monitoring-metric-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
          <div>
            <span>Failures</span>
            <strong>{summary.failures ?? 0}</strong>
          </div>
        </article>
        <article>
          <span className="monitoring-metric-icon"><ServerCrash size={22} aria-hidden="true" /></span>
          <div>
            <span>System errors</span>
            <strong>{summary.errors ?? 0}</strong>
          </div>
        </article>
        <article>
          <span className="monitoring-metric-icon"><ShieldAlert size={22} aria-hidden="true" /></span>
          <div>
            <span>24h failures</span>
            <strong>{summary.recentFailures ?? 0}</strong>
          </div>
        </article>
      </div>

      <div className="logging-insights">
        <section className="logging-insight-panel" aria-labelledby="category-breakdown-title">
          <div className="logging-panel-heading">
            <div>
              <span>Breakdown</span>
              <h3 id="category-breakdown-title">Events by category</h3>
            </div>
          </div>
          {categoryCounts.length === 0 ? (
            <p className="logging-muted">No category activity yet.</p>
          ) : (
            <div className="logging-category-list">
              {categoryCounts.map((item) => (
                <span key={item.category}>
                  {formatCategoryLabel(item.category)}
                  <strong>{item.count}</strong>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="logging-insight-panel" aria-labelledby="quick-focus-title">
          <div className="logging-panel-heading">
            <div>
              <span>Focus</span>
              <h3 id="quick-focus-title">Quick filters</h3>
            </div>
          </div>
          <div className="logging-quick-actions">
            <button type="button" onClick={() => setFilters((current) => ({ ...current, status: 'error' }))}>
              Errors
            </button>
            <button type="button" onClick={() => setFilters((current) => ({ ...current, category: 'auth' }))}>
              Auth
            </button>
            <button type="button" onClick={() => setFilters((current) => ({ ...current, category: 'rate-limit' }))}>
              Rate limits
            </button>
          </div>
        </section>
      </div>

      <div className="logging-filters">
        <div className="logging-section-title">
          <div>
            <Filter size={17} aria-hidden="true" />
            <strong>Filter events</strong>
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
          Service
          <span className="logging-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              name="service"
              placeholder="Filter by service"
              type="search"
              value={filters.service}
              onChange={handleFilterChange}
            />
          </span>
        </label>
      </div>

      <div className="logging-table-wrap">
        <div className="logging-table-header">
          <div>
            <span>Recent activity</span>
            <h3>Event stream</h3>
          </div>
          <small>{monitoring?.pagination?.total ?? 0} matching events</small>
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
                <th>Actor</th>
                <th>Service</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Endpoint</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <span className="logging-time">{formatDateTime(log.createdAt)}</span>
                    <small>{formatCategoryLabel(log.category || 'api')}</small>
                  </td>
                  <td>
                    <span className="logging-actor">
                      <UserRound size={16} aria-hidden="true" />
                      <span>
                        <strong>{getActorLabel(log)}</strong>
                        <small>{getActorMeta(log)}</small>
                      </span>
                    </span>
                  </td>
                  <td>{log.service}</td>
                  <td>
                    <span className={`logging-badge logging-badge-${log.status}`}>{log.status}</span>
                  </td>
                  <td>
                    <span className={`logging-severity logging-severity-${log.severity || 'info'}`}>
                      {log.severity || 'info'}
                    </span>
                  </td>
                  <td className="logging-endpoint">
                    <span>{log.method || 'GET'}</span>
                    {log.endpoint || 'Not recorded'}
                  </td>
                  <td>{log.message || 'No message recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default SystemErrorsPage;
