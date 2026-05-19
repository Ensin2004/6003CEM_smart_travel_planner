import {
  AlertTriangle,
  Ban,
  Filter,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminUsers, removeAdminUser } from '../../api/adminUserApi';
import './ManageUsersPage.css';

const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'user', label: 'Travellers' },
  { value: 'admin', label: 'Admins' },
];

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

const formatDate = (value) => {
  if (!value) return 'Unknown';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const getErrorMessage = (error) =>
  error.response?.data?.message || 'Unable to load user accounts.';

const formatCategoryLabel = (category = 'none') =>
  category
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    travellers: 0,
    admins: 0,
    active: 0,
    disabled: 0,
  });
  const [filters, setFilters] = useState({
    query: '',
    role: '',
    status: '',
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchUsers = useCallback(async ({ showSuccess = false } = {}) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await getAdminUsers();
      setUsers(response.data.data.users || []);
      setSummary(response.data.data.summary || {});

      if (showSuccess) {
        setSuccessMessage('User accounts refreshed.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchUsers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        [user.name, user.email, user.country]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesRole = !filters.role || user.role === filters.role;
      const matchesStatus = !filters.status || user.status === filters.status;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [filters, users]);

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const removableUsers = users.filter((user) => user.role !== 'admin').length;
  const issueChartItems = [
    { label: 'Login', value: summary.loginIssues || 0, className: 'login' },
    { label: 'API', value: summary.apiIssues || 0, className: 'api' },
    { label: 'System', value: summary.systemIssues || 0, className: 'system' },
    { label: 'Rate limit', value: summary.rateLimitIssues || 0, className: 'rate' },
  ];
  const issueMax = Math.max(...issueChartItems.map((item) => item.value), 1);
  const statusChartItems = [
    { label: 'Active', value: summary.active || 0, className: 'active' },
    { label: 'Disabled', value: summary.disabled || 0, className: 'disabled' },
  ];
  const statusMax = Math.max(...statusChartItems.map((item) => item.value), 1);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      role: '',
      status: '',
    });
  };

  const closeRemoveDialog = () => {
    if (!isRemoving) setSelectedUser(null);
  };

  const confirmRemoveUser = async () => {
    if (!selectedUser) return;

    setIsRemoving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await removeAdminUser(selectedUser.id || selectedUser._id);
      const removedTrips = response.data.data.removedTrips || 0;
      setUsers((current) => current.filter((user) => (user.id || user._id) !== (selectedUser.id || selectedUser._id)));
      setSummary((current) => ({
        ...current,
        total: Math.max((current.total || 1) - 1, 0),
        travellers: Math.max((current.travellers || 1) - 1, 0),
        active: selectedUser.status === 'active' ? Math.max((current.active || 1) - 1, 0) : current.active,
        disabled: selectedUser.status === 'disabled' ? Math.max((current.disabled || 1) - 1, 0) : current.disabled,
      }));
      setSuccessMessage(`${selectedUser.name}'s account was removed with ${removedTrips} trip record(s).`);
      setSelectedUser(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <section className="manage-users-page" aria-labelledby="manage-users-title">
      <div className="manage-users-hero">
        <div>
          <p className="eyebrow">Admin moderation</p>
          <h2 id="manage-users-title">Manage Users</h2>
          <p>Review traveller accounts, filter suspicious profiles, and remove spam accounts from the system.</p>
          <div className="manage-users-hero-meta" aria-label="User account status">
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              {summary.active ?? 0} active accounts
            </span>
            <span>
              <Ban size={16} aria-hidden="true" />
              {summary.disabled ?? 0} disabled accounts
            </span>
          </div>
        </div>
        <div className="manage-users-hero-actions">
          <div className="manage-users-live-card" aria-label="Moderation queue">
            <span>Removable users</span>
            <strong>{removableUsers}</strong>
          </div>
          <button
            className="manage-users-action"
            type="button"
            onClick={() => fetchUsers({ showSuccess: true })}
            disabled={isLoading}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="form-error manage-users-status">{error}</p>}
      {successMessage && <p className="form-success manage-users-status">{successMessage}</p>}

      <div className="manage-users-metrics" aria-label="User account summary">
        <article className="manage-users-metric-total">
          <span className="manage-users-metric-icon"><UsersRound size={22} aria-hidden="true" /></span>
          <div>
            <span>Total accounts</span>
            <strong>{summary.total ?? 0}</strong>
          </div>
        </article>
        <article className="manage-users-metric-travellers">
          <span className="manage-users-metric-icon"><UserRound size={22} aria-hidden="true" /></span>
          <div>
            <span>Travellers</span>
            <strong>{summary.travellers ?? 0}</strong>
          </div>
        </article>
        <article className="manage-users-metric-admins">
          <span className="manage-users-metric-icon"><ShieldCheck size={22} aria-hidden="true" /></span>
          <div>
            <span>Admins</span>
            <strong>{summary.admins ?? 0}</strong>
          </div>
        </article>
        <article className="manage-users-metric-risk">
          <span className="manage-users-metric-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
          <div>
            <span>Disabled</span>
            <strong>{summary.disabled ?? 0}</strong>
          </div>
        </article>
      </div>

      <div className="manage-users-insights">
        <section className="manage-users-chart-panel" aria-labelledby="user-issues-chart-title">
          <div className="manage-users-panel-heading">
            <div>
              <span>Issue statistics</span>
              <h3 id="user-issues-chart-title">Errors by account activity</h3>
            </div>
            <strong>{summary.totalIssues || 0} total</strong>
          </div>
          <div className="manage-users-bar-chart">
            {issueChartItems.map((item) => (
              <div className={`manage-users-bar manage-users-bar-${item.className}`} key={item.label}>
                <span>{item.label}</span>
                <i style={{ '--bar-size': `${Math.max((item.value / issueMax) * 100, item.value ? 8 : 0)}%` }} />
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="manage-users-chart-panel" aria-labelledby="user-status-chart-title">
          <div className="manage-users-panel-heading">
            <div>
              <span>Account health</span>
              <h3 id="user-status-chart-title">Status distribution</h3>
            </div>
          </div>
          <div className="manage-users-bar-chart">
            {statusChartItems.map((item) => (
              <div className={`manage-users-bar manage-users-bar-${item.className}`} key={item.label}>
                <span>{item.label}</span>
                <i style={{ '--bar-size': `${Math.max((item.value / statusMax) * 100, item.value ? 8 : 0)}%` }} />
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="manage-users-filters">
        <div className="manage-users-section-title">
          <div>
            <Filter size={17} aria-hidden="true" />
            <strong>Filter accounts</strong>
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters}>
              <X size={15} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
        <label>
          Search
          <span className="manage-users-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              name="query"
              placeholder="Name, email, or country"
              type="search"
              value={filters.query}
              onChange={handleFilterChange}
            />
          </span>
        </label>
        <label>
          Role
          <select name="role" value={filters.role} onChange={handleFilterChange}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      <div className="manage-users-table-wrap">
        <div className="manage-users-table-header">
          <div>
            <span>Account registry</span>
            <h3>User accounts</h3>
          </div>
          <small>{filteredUsers.length} matching account(s)</small>
        </div>
        {isLoading ? (
          <p className="settings-empty">Loading user accounts...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="settings-empty">No matching user accounts found.</p>
        ) : (
          <table className="manage-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>User errors</th>
                <th>Latest issue</th>
                <th>Country</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id || user._id}>
                  <td>
                    <span className="manage-users-identity">
                      <span className="manage-users-avatar">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name?.charAt(0) || 'U'}
                      </span>
                      <span>
                        <strong>{user.name}</strong>
                        <small><Mail size={13} aria-hidden="true" /> {user.email}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`manage-users-role manage-users-role-${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`manage-users-badge manage-users-badge-${user.status}`}>{user.status}</span>
                  </td>
                  <td>
                    <span className="manage-users-issue-stack">
                      <strong>{user.issueSummary?.totalIssues || 0} issue(s)</strong>
                      <small>
                        Login {user.issueSummary?.loginIssues || 0} / API {user.issueSummary?.apiIssues || 0} / System{' '}
                        {user.issueSummary?.systemIssues || 0}
                      </small>
                    </span>
                  </td>
                  <td>
                    {user.issueSummary?.latestIssueAt ? (
                      <span className="manage-users-issue-stack">
                        <strong>{formatCategoryLabel(user.issueSummary.latestIssueCategory)}</strong>
                        <small>{user.issueSummary.latestIssueMessage || 'No message recorded'}</small>
                        <em>{formatDate(user.issueSummary.latestIssueAt)}</em>
                      </span>
                    ) : (
                      <span className="manage-users-no-issue">No errors</span>
                    )}
                  </td>
                  <td>{user.country || 'Not set'}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <button
                      className="manage-users-remove"
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      disabled={user.role === 'admin'}
                      title={user.role === 'admin' ? 'Admin accounts are protected' : 'Remove user account'}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedUser && (
        <div className="manage-users-dialog-backdrop" role="presentation" onMouseDown={closeRemoveDialog}>
          <div
            className="manage-users-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-user-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="manage-users-dialog-icon">
              <Trash2 size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">Remove account</p>
              <h3 id="remove-user-title">Remove {selectedUser.name}?</h3>
              <p>
                This permanently removes the user account and their trip records. Use this for spam,
                abusive, or fake accounts.
              </p>
            </div>
            <div className="manage-users-dialog-actions">
              <button type="button" onClick={closeRemoveDialog} disabled={isRemoving}>
                Cancel
              </button>
              <button type="button" onClick={confirmRemoveUser} disabled={isRemoving}>
                {isRemoving ? 'Removing...' : 'Remove account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ManageUsersPage;
