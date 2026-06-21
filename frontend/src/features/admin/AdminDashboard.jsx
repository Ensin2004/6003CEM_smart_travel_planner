/**
 * Admin dashboard.
 * Tabs, filters, and compact charts keep platform monitoring scannable.
 */
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Gauge,
  LayoutDashboard,
  Map,
  PieChart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../../api/adminDashboardApi';
import { getApiErrorMessage } from '../../utils/apiError';
import './AdminDashboard.css';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: UsersRound },
  { id: 'travel', label: 'Travel', icon: Map },
  { id: 'operations', label: 'Operations', icon: Gauge },
];

const formatChartLabel = (value = '') =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const toShortDate = (date) =>
  new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' });

function AdminTooltip({ children }) {
  return <span className="admin-chart-tooltip">{children}</span>;
}

function HorizontalBars({ items, labelKey = 'label', valueKey = 'count', tone = 'primary', emptyText, className = '' }) {
  const max = Math.max(...items.map((item) => item[valueKey] || 0), 1);

  if (!items.length) return <p className="admin-home-muted">{emptyText}</p>;

  return (
    <div className={`admin-home-bar-chart ${className}`}>
      {items.map((item) => {
        const label = item[labelKey] || formatChartLabel(item.status || item.severity || item.value || item.band || 'Unknown');
        const value = item[valueKey] || 0;
        return (
          <div
            className={`admin-home-bar admin-home-bar-${item.className || item.status || item.severity || tone}`}
            key={`${label}-${value}`}
            tabIndex={0}
          >
            <span>{label}</span>
            <i style={{ '--bar-size': `${Math.max((value / max) * 100, value ? 8 : 0)}%` }} />
            <strong>{value}</strong>
            <AdminTooltip>{label}: {value}</AdminTooltip>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ items, valueKey = 'count', emptyText }) {
  const max = Math.max(...items.map((item) => item[valueKey] || item.success + item.fail + item.error || 0), 1);
  const hasData = items.some((item) => (valueKey === 'count' ? item.count : item.success + item.fail + item.error) > 0);

  if (!items.length || !hasData) return <p className="admin-home-muted admin-home-empty-chart">{emptyText}</p>;

  return (
    <div className="admin-home-trend-chart">
      {items.map((item) => {
        const total = valueKey === 'count' ? item.count : item.success + item.fail + item.error;
        return (
          <div className="admin-home-trend-day" key={item.date} tabIndex={0}>
            <span>{toShortDate(item.date)}</span>
            <i style={{ '--bar-size': `${Math.max((total / max) * 100, total ? 8 : 0)}%` }}>
              {valueKey === 'count' ? (
                <b className="admin-home-trend-primary" style={{ '--segment-size': '100%' }} />
              ) : (
                <>
                  <b className="admin-home-trend-success" style={{ '--segment-size': `${(item.success / Math.max(total, 1)) * 100}%` }} />
                  <b className="admin-home-trend-fail" style={{ '--segment-size': `${(item.fail / Math.max(total, 1)) * 100}%` }} />
                  <b className="admin-home-trend-error" style={{ '--segment-size': `${(item.error / Math.max(total, 1)) * 100}%` }} />
                </>
              )}
            </i>
            <strong>{total}</strong>
            <AdminTooltip>
              {valueKey === 'count'
                ? `${toShortDate(item.date)}: ${total} signup(s)`
                : `${toShortDate(item.date)}: ${item.success} success, ${item.fail} fail, ${item.error} error`}
            </AdminTooltip>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ items, labelKey = 'label', emptyText }) {
  const total = items.reduce((sum, item) => sum + (item.count || 0), 0);
  const max = Math.max(...items.map((item) => item.count || 0), 1);
  let offset = 0;
  const colors = ['#0f766e', '#2563eb', '#f59e0b', '#dc2626', '#7c3aed', '#64748b'];
  const gradient = total
    ? items.map((item, index) => {
        const start = offset;
        const end = offset + ((item.count || 0) / total) * 100;
        offset = end;
        return `${colors[index % colors.length]} ${start}% ${end}%`;
      }).join(', ')
    : '#e2e8f0 0% 100%';

  if (!items.length) return <p className="admin-home-muted">{emptyText}</p>;

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut" style={{ '--donut-gradient': gradient }}>
        <strong>{total}</strong>
        <span>Total</span>
      </div>
      <div className="admin-donut-legend">
        {items.map((item, index) => (
          <span key={item[labelKey] || item.value} tabIndex={0}>
            <small>
              <i style={{ background: colors[index % colors.length] }} />
              {item[labelKey] || formatChartLabel(item.value)}
            </small>
            <b>
              <em
                style={{
                  '--bar-size': `${Math.max(((item.count || 0) / max) * 100, item.count ? 8 : 0)}%`,
                  '--bar-color': colors[index % colors.length],
                }}
              />
            </b>
            <strong>{item.count}</strong>
            <AdminTooltip>{item[labelKey] || item.value}: {item.count}</AdminTooltip>
          </span>
        ))}
      </div>
    </div>
  );
}

function Panel({ eyebrow, title, action, children, wide = false }) {
  return (
    <section className={`admin-home-panel ${wide ? 'admin-home-panel-wide' : ''}`}>
      <div className="admin-home-panel-heading">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasDateRangeFilter = Boolean(dateRange.startDate || dateRange.endDate);

  const fetchDashboard = useCallback(async ({ showSuccess = false } = {}) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await getAdminDashboard(dateRange);
      setDashboard(response.data.data.dashboard);
      if (showSuccess) setSuccessMessage('Admin dashboard refreshed.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load admin dashboard.'));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const setDateField = (field, value) => {
    setDateRange((current) => ({ ...current, [field]: value }));
  };

  const clearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  const userSummary = dashboard?.userSummary || {};
  const filteredUserSummary = dashboard?.filteredUserSummary || {};
  const issueSummary = dashboard?.issueSummary || {};
  const health = dashboard?.apiStatus || 'healthy';
  const issueRisk = issueSummary.totalIssues > 0 ? 'Needs review' : 'Clear';

  const issueItems = [
    { label: 'Login', count: issueSummary.loginIssues || 0, className: 'warning' },
    { label: 'API', count: issueSummary.apiIssues || 0, className: 'primary' },
    { label: 'System', count: issueSummary.systemIssues || 0, className: 'danger' },
    { label: 'Rate limit', count: issueSummary.rateLimitIssues || 0, className: 'blue' },
  ];

  const primaryCards = useMemo(
    () => [
      {
        label: hasDateRangeFilter ? 'New users' : 'Total users',
        value: hasDateRangeFilter ? dashboard?.filteredUsers ?? 0 : dashboard?.totalUsers ?? 0,
        detail: `${filteredUserSummary.active || userSummary.active || 0} active / ${filteredUserSummary.disabled || userSummary.disabled || 0} disabled`,
        icon: UsersRound,
        className: 'primary',
      },
      {
        label: 'Trips in range',
        value: dashboard?.totalTrips ?? 0,
        detail: 'Trips matching selected travel dates',
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
    [dashboard, filteredUserSummary, hasDateRangeFilter, health, issueRisk, userSummary]
  );

  return (
    <section className="admin-home-page" aria-labelledby="admin-home-title">
      <div className="admin-home-hero">
        <div>
          <p className="eyebrow">Admin command center</p>
          <h2 id="admin-home-title">Admin Dashboard</h2>
          <p>Monitor platform health, demographics, travel demand, API reliability, and operational issues from one workspace.</p>
          <div className="admin-home-hero-meta">
            <span className={`admin-home-health admin-home-health-${health}`}>
              {health === 'healthy' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              {health === 'healthy' ? 'Healthy' : 'Needs attention'}
            </span>
            <span><Activity size={16} aria-hidden="true" />{issueSummary.totalIssues || 0} issue(s)</span>
          </div>
        </div>
        <div className="admin-home-hero-actions">
          <div className="admin-home-live-card">
            <span>Travellers</span>
            <strong>{userSummary.travellers || 0}</strong>
          </div>
          <button className="admin-home-action" type="button" onClick={() => fetchDashboard({ showSuccess: true })} disabled={isLoading}>
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="form-error admin-home-status">{error}</p>}
      {successMessage && <p className="form-success admin-home-status">{successMessage}</p>}

      <section className="admin-date-filter" aria-label="Admin dashboard date range filter">
        <div>
          <CalendarDays size={18} aria-hidden="true" />
          <span>
            <strong>Date range</strong>
            <small>{hasDateRangeFilter ? 'Dashboard metrics are filtered.' : 'Showing all available admin data.'}</small>
          </span>
        </div>
        <div className="admin-date-filter-fields">
          <label>
            <span>From</span>
            <input type="date" value={dateRange.startDate} max={dateRange.endDate || undefined} onChange={(event) => setDateField('startDate', event.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={dateRange.endDate} min={dateRange.startDate || undefined} onChange={(event) => setDateField('endDate', event.target.value)} />
          </label>
          {hasDateRangeFilter ? (
            <button type="button" onClick={clearDateRange} aria-label="Clear date range filter">
              <X size={16} aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>
      </section>

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

      <nav className="admin-tabbar" aria-label="Admin dashboard sections">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button className={activeTab === tab.id ? 'active' : ''} type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}>
              <TabIcon size={16} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'overview' ? (
        <div className="admin-home-grid">
          <Panel eyebrow="Operations" title="Event trend" wide action={<small>Success / fail / error</small>}>
            <TrendChart items={dashboard?.dailyLogCounts || []} emptyText="No event activity yet." />
          </Panel>
          <Panel eyebrow="Users" title="Signup trend">
            <TrendChart items={dashboard?.signupCounts || []} valueKey="count" emptyText="No signups in this range." />
          </Panel>
          <Panel eyebrow="Moderation" title="User-linked issues" action={<strong>{issueSummary.totalIssues || 0}</strong>}>
            <HorizontalBars items={issueItems} emptyText="No user-linked issues." />
          </Panel>
          <Panel eyebrow="Next actions" title="Admin shortcuts">
            <div className="admin-home-shortcuts">
              <Link to="/admin/users"><UserCog size={18} aria-hidden="true" />Review users<small>Inspect accounts and moderation signals</small></Link>
              <Link to="/admin/logging-monitoring"><BarChart3 size={18} aria-hidden="true" />Open monitoring<small>Check failures, severity, and service health</small></Link>
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <div className="admin-home-grid">
          <Panel eyebrow="Demographics" title="Gender distribution">
            <DonutChart items={dashboard?.filteredGenderCounts || dashboard?.genderCounts || []} emptyText="No gender data yet." />
          </Panel>
          <Panel eyebrow="Demographics" title="Age groups">
            <HorizontalBars
              items={dashboard?.filteredAgeGroupCounts || dashboard?.ageGroupCounts || []}
              labelKey="label"
              tone="blue"
              emptyText="No age group data yet."
              className="admin-age-group-chart"
            />
          </Panel>
          <Panel eyebrow="Accounts" title="Role and status mix">
            <HorizontalBars
              items={[
                { label: 'Travellers', count: userSummary.travellers || 0, className: 'primary' },
                { label: 'Admins', count: userSummary.admins || 0, className: 'blue' },
                { label: 'Active', count: userSummary.active || 0, className: 'success' },
                { label: 'Disabled', count: userSummary.disabled || 0, className: 'danger' },
              ]}
              emptyText="No account data yet."
            />
          </Panel>
          <Panel eyebrow="Growth" title="New users by day">
            <TrendChart items={dashboard?.signupCounts || []} valueKey="count" emptyText="No signups in this range." />
          </Panel>
        </div>
      ) : null}

      {activeTab === 'travel' ? (
        <div className="admin-home-grid">
          <Panel eyebrow="Travel activity" title="Trips by status">
            <HorizontalBars items={dashboard?.tripStatusCounts || []} labelKey="status" tone="blue" emptyText="No trips recorded yet." />
          </Panel>
          <Panel eyebrow="Trip volume" title="Trips created">
            <div className="admin-travel-total">
              <span><PieChart size={22} aria-hidden="true" /></span>
              <strong>{dashboard?.totalTrips ?? 0}</strong>
              <small>{hasDateRangeFilter ? 'Trips overlapping selected dates' : 'All trips created on the platform'}</small>
            </div>
          </Panel>
          <Panel eyebrow="Travel activity" title="New users by day" wide>
            <TrendChart items={dashboard?.signupCounts || []} valueKey="count" emptyText="No signups in this range." />
          </Panel>
        </div>
      ) : null}

      {activeTab === 'operations' ? (
        <div className="admin-home-grid">
          <Panel eyebrow="Reliability" title="Log severity">
            <HorizontalBars items={dashboard?.logSeverityCounts || []} labelKey="severity" emptyText="No log activity yet." />
          </Panel>
          <Panel eyebrow="Event quality" title="Events by status">
            <HorizontalBars items={dashboard?.logStatusCounts || []} labelKey="status" emptyText="No event status recorded yet." />
          </Panel>
          <Panel eyebrow="Operations" title="Event trend" wide>
            <TrendChart items={dashboard?.dailyLogCounts || []} emptyText="No event activity yet." />
          </Panel>
        </div>
      ) : null}

      {isLoading && <p className="settings-empty">Loading admin dashboard...</p>}
    </section>
  );
}

export default AdminDashboard;
