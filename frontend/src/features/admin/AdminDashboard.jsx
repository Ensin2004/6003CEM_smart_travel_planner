/**
 * Admin module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Map,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../../api/adminDashboardApi';
import { getApiErrorMessage } from '../../utils/apiError';
import './AdminDashboard.css';
const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to load admin dashboard.');
// Format Chart Label converts raw values into readable display text.
const formatChartLabel = (value = '') =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
// AdminDashboard renders the main screen and handles nearby interactions.
function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchDashboard = useCallback(async ({ showSuccess = false } = {}) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await getAdminDashboard();
      setDashboard(response.data.data.dashboard);

      if (showSuccess) {
        setSuccessMessage('Admin dashboard refreshed.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDashboard();
    }, 0);
    // Cleanup prevents state updates after component unmount.
    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboard]);

  const userSummary = dashboard?.userSummary || {};
  const issueSummary = dashboard?.issueSummary || {};
  const tripStatusCounts = dashboard?.tripStatusCounts || [];
  const logStatusCounts = dashboard?.logStatusCounts || [];
  const logSeverityCounts = dashboard?.logSeverityCounts || [];
  const dailyLogCounts = dashboard?.dailyLogCounts || [];
  const health = dashboard?.apiStatus || 'healthy';
  const issueRisk = issueSummary.totalIssues > 0 ? 'Needs review' : 'Clear';
  const chartItems = [
    { label: 'Login', value: issueSummary.loginIssues || 0, className: 'warning' },
    { label: 'API', value: issueSummary.apiIssues || 0, className: 'primary' },
    { label: 'System', value: issueSummary.systemIssues || 0, className: 'danger' },
    { label: 'Rate limit', value: issueSummary.rateLimitIssues || 0, className: 'blue' },
  ];
  const issueMax = Math.max(...chartItems.map((item) => item.value), 1);
  const tripMax = Math.max(...tripStatusCounts.map((item) => item.count), 1);
  const statusMax = Math.max(...logStatusCounts.map((item) => item.count), 1);
  const severityMax = Math.max(...logSeverityCounts.map((item) => item.count), 1);
  const dailyMax = Math.max(...dailyLogCounts.map((item) => item.success + item.fail + item.error), 1);
  const primaryCards = useMemo(
    () => [
      {
        label: 'Total users',
        value: dashboard?.totalUsers ?? 0,
        detail: `${userSummary.active || 0} active / ${userSummary.disabled || 0} disabled`,
        icon: UsersRound,
        className: 'primary',
      },
      {
        label: 'Total trips',
        value: dashboard?.totalTrips ?? 0,
        detail: 'Trips created by travellers',
        icon: Map,
        className: 'blue',
      },
      {
        label: 'Failed events',
        value: dashboard?.failedApiEvents ?? 0,
        detail: `${issueRisk} across user activity`,
        icon: AlertTriangle,
        className: 'warning',
      },
      {
        label: 'System health',
        value: health === 'healthy' ? 'Healthy' : 'Warning',
        detail: health === 'healthy' ? 'No urgent failures' : 'Failures need attention',
        icon: health === 'healthy' ? ShieldCheck : ShieldAlert,
        className: health === 'healthy' ? 'success' : 'danger',
      },
    ],
    [dashboard, health, issueRisk, userSummary.active, userSummary.disabled]
  );
  return (
    <section className="admin-home-page" aria-labelledby="admin-home-title">
      <div className="admin-home-hero">
        <div>
          <p className="eyebrow">Admin command center</p>
          <h2 id="admin-home-title">Admin Dashboard</h2>
          <p>Monitor platform health, user moderation signals, travel activity, and operational issues from one place.</p>
          <div className="admin-home-hero-meta">
            <span className={`admin-home-health admin-home-health-${health}`}>
              {health === 'healthy' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              {health === 'healthy' ? 'Healthy' : 'Needs attention'}
            </span>
            <span>
              <Activity size={16} aria-hidden="true" />
              {issueSummary.totalIssues || 0} user-linked issue(s)
            </span>
          </div>
        </div>
        <div className="admin-home-hero-actions">
          <div className="admin-home-live-card">
            <span>Travellers</span>
            <strong>{userSummary.travellers || 0}</strong>
          </div>
          <button
            className="admin-home-action"
            type="button"
            onClick={() => fetchDashboard({ showSuccess: true })}
            disabled={isLoading}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="form-error admin-home-status">{error}</p>}
      {successMessage && <p className="form-success admin-home-status">{successMessage}</p>}

      <div className="admin-home-metrics" aria-label="Admin overview metrics">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={`admin-home-metric-${card.className}`} key={card.label}>
              <span className="admin-home-metric-icon"><Icon size={22} aria-hidden="true" /></span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </div>
            </article>
          );
        })}
      </div>

      <div className="admin-home-grid">
        <section className="admin-home-panel admin-home-panel-wide" aria-labelledby="operations-chart-title">
          <div className="admin-home-panel-heading">
            <div>
              <span>Operations</span>
              <h3 id="operations-chart-title">7-day event trend</h3>
            </div>
            <small>Success / fail / error</small>
          </div>
          <div className="admin-home-trend-chart">
            {dailyLogCounts.map((item) => {
              const total = item.success + item.fail + item.error;
              return (
                <div className="admin-home-trend-day" key={item.date}>
                  <span>{new Date(item.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                  <i style={{ '--bar-size': `${Math.max((total / dailyMax) * 100, total ? 8 : 0)}%` }}>
                    <b className="admin-home-trend-success" style={{ '--segment-size': `${(item.success / Math.max(total, 1)) * 100}%` }} />
                    <b className="admin-home-trend-fail" style={{ '--segment-size': `${(item.fail / Math.max(total, 1)) * 100}%` }} />
                    <b className="admin-home-trend-error" style={{ '--segment-size': `${(item.error / Math.max(total, 1)) * 100}%` }} />
                  </i>
                  <strong>{total}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-home-panel" aria-labelledby="moderation-chart-title">
          <div className="admin-home-panel-heading">
            <div>
              <span>Moderation</span>
              <h3 id="moderation-chart-title">User-linked issues</h3>
            </div>
            <strong>{issueSummary.totalIssues || 0}</strong>
          </div>
          <div className="admin-home-bar-chart">
            {chartItems.map((item) => (
              <div className={`admin-home-bar admin-home-bar-${item.className}`} key={item.label}>
                <span>{item.label}</span>
                <i style={{ '--bar-size': `${Math.max((item.value / issueMax) * 100, item.value ? 8 : 0)}%` }} />
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-home-panel" aria-labelledby="trips-chart-title">
          <div className="admin-home-panel-heading">
            <div>
              <span>Travel activity</span>
              <h3 id="trips-chart-title">Trips by status</h3>
            </div>
          </div>
          <div className="admin-home-bar-chart">
            {tripStatusCounts.length === 0 ? (
              <p className="admin-home-muted">No trips recorded yet.</p>
            ) : (
              tripStatusCounts.map((item) => (
                <div className="admin-home-bar admin-home-bar-blue" key={item.status}>
                  <span>{formatChartLabel(item.status)}</span>
                  <i style={{ '--bar-size': `${Math.max((item.count / tripMax) * 100, 8)}%` }} />
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-home-panel" aria-labelledby="severity-chart-title">
          <div className="admin-home-panel-heading">
            <div>
              <span>Reliability</span>
              <h3 id="severity-chart-title">Log severity</h3>
            </div>
          </div>
          <div className="admin-home-bar-chart">
            {logSeverityCounts.length === 0 ? (
              <p className="admin-home-muted">No log activity yet.</p>
            ) : (
              logSeverityCounts.map((item) => (
                <div className={`admin-home-bar admin-home-bar-${item.severity}`} key={item.severity}>
                  <span>{formatChartLabel(item.severity)}</span>
                  <i style={{ '--bar-size': `${Math.max((item.count / severityMax) * 100, 8)}%` }} />
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-home-panel" aria-labelledby="status-chart-title">
          <div className="admin-home-panel-heading">
            <div>
              <span>Event quality</span>
              <h3 id="status-chart-title">Events by status</h3>
            </div>
          </div>
          <div className="admin-home-bar-chart">
            {logStatusCounts.length === 0 ? (
              <p className="admin-home-muted">No event status recorded yet.</p>
            ) : (
              logStatusCounts.map((item) => (
                <div className={`admin-home-bar admin-home-bar-${item.status}`} key={item.status}>
                  <span>{formatChartLabel(item.status)}</span>
                  <i style={{ '--bar-size': `${Math.max((item.count / statusMax) * 100, 8)}%` }} />
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-home-panel" aria-labelledby="quick-actions-title">
          <div className="admin-home-panel-heading">
            <div>
              <span>Next actions</span>
              <h3 id="quick-actions-title">Admin shortcuts</h3>
            </div>
          </div>
          <div className="admin-home-shortcuts">
            <Link to="/admin/users">
              <UserCog size={18} aria-hidden="true" />
              Review users
              <small>Remove spam accounts and inspect login issues</small>
            </Link>
            <Link to="/admin/logging-monitoring">
              <BarChart3 size={18} aria-hidden="true" />
              Open monitoring
              <small>Check failures, severity, and service health</small>
            </Link>
          </div>
        </section>
      </div>

      {isLoading && <p className="settings-empty">Loading admin dashboard...</p>}
    </section>
  );
}
// Default export registers the primary  value.
export default AdminDashboard;
