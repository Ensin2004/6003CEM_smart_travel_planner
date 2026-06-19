/**
 * Admin module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const userRepository = require('../users/user.repository');
const tripRepository = require('../trips/trip.repository');
const apiLogRepository = require('../apiLogs/apiLog.repository');
const AppError = require('../../utils/AppError');

/**
 * Retrieves comprehensive dashboard data for administrative overview.
 * Aggregates user statistics, trip metrics, API logs, and system health indicators.
 * 
 * @returns {Object} Dashboard data containing user summaries, trip counts, and API status
 */
const getDashboard = async () => {
  // Execute all independent data queries in parallel for performance
  const [
    users,
    totalTrips,
    failedApiEvents,
    userIssues,
    tripStatusCounts,
    logStatusCounts,
    logSeverityCounts,
    logDailyCounts,
  ] = await Promise.all([
    userRepository.findAll(), // All user records
    tripRepository.countAll(), // Total trip count
    apiLogRepository.countFailures(), // Count of failed API events
    apiLogRepository.aggregateUserIssueSummary(), // User-specific issue summaries
    tripRepository.aggregateStatusCounts(), // Trip status breakdown (active, completed, etc.)
    apiLogRepository.aggregateStatusCounts({}), // Log status distribution
    apiLogRepository.aggregateSeverityCounts({}), // Log severity distribution
    apiLogRepository.aggregateDailyCounts({}), // Daily log volume for trends
  ]);

  // Build user summary statistics from user list
  const userSummary = users.reduce(
    (totals, user) => {
      totals.total += 1;
      totals[user.role === 'admin' ? 'admins' : 'travellers'] += 1;
      totals[user.status === 'disabled' ? 'disabled' : 'active'] += 1;
      return totals;
    },
    {
      total: 0,
      travellers: 0,
      admins: 0,
      active: 0,
      disabled: 0,
    }
  );

  // Aggregate issue summary totals from user issues data
  const issueSummary = userIssues.reduce(
    (totals, item) => {
      totals.totalIssues += item.totalIssues || 0;
      totals.loginIssues += item.loginIssues || 0;
      totals.apiIssues += item.apiIssues || 0;
      totals.systemIssues += item.systemIssues || 0;
      totals.rateLimitIssues += item.rateLimitIssues || 0;
      return totals;
    },
    {
      totalIssues: 0,
      loginIssues: 0,
      apiIssues: 0,
      systemIssues: 0,
      rateLimitIssues: 0,
    }
  );

  return {
    totalUsers: users.length,
    totalTrips,
    failedApiEvents,
    apiStatus: failedApiEvents > 0 ? 'warning' : 'healthy', // Health indicator based on failures
    userSummary,
    issueSummary,
    tripStatusCounts: tripStatusCounts.map((item) => ({
      status: item._id || 'active',
      count: item.count,
    })),
    logStatusCounts: logStatusCounts.map((item) => ({
      status: item._id || 'success',
      count: item.count,
    })),
    logSeverityCounts: logSeverityCounts.map((item) => ({
      severity: item._id || 'info',
      count: item.count,
    })),
    dailyLogCounts: fillDailyCounts(logDailyCounts), // Fill missing days with zero counts
  };
};

/**
 * Fills missing daily log counts for chart display.
 * Ensures the last N days have entries even when no logs were recorded.
 * 
 * @param {Array} dailyCounts - Raw daily log counts from database
 * @param {number} days - Number of days to include (default: 7)
 * @returns {Array} Complete daily log data with zero-filled missing dates
 */
const fillDailyCounts = (dailyCounts, days = 7) => {
  const today = new Date();

  // Generate array of dates for the last N days
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    const matchingItems = dailyCounts.filter((item) => item._id.date === key);

    // Extract counts for each status type, defaulting to 0 if not present
    return {
      date: key,
      success: matchingItems.find((item) => item._id.status === 'success')?.count || 0,
      fail: matchingItems.find((item) => item._id.status === 'fail')?.count || 0,
      error: matchingItems.find((item) => item._id.status === 'error')?.count || 0,
    };
  });
};

/**
 * Retrieves all users with enriched issue summary data.
 * Returns user list along with aggregate statistics.
 * 
 * @returns {Object} Object containing enriched users array and summary statistics
 */
const getUsers = async () => {
  // Fetch users and their associated issue summaries in parallel
  const [users, userIssues] = await Promise.all([
    userRepository.findAll(),
    apiLogRepository.aggregateUserIssueSummary(),
  ]);

  // Create a map for efficient lookup of issue data by user ID
  const issuesByUserId = new Map(userIssues.map((item) => [String(item._id), item]));

  // Build overall user summary statistics
  const summary = users.reduce(
    (totals, user) => {
      totals.total += 1;
      totals[user.role === 'admin' ? 'admins' : 'travellers'] += 1;
      totals[user.status === 'disabled' ? 'disabled' : 'active'] += 1;
      return totals;
    },
    {
      total: 0,
      travellers: 0,
      admins: 0,
      active: 0,
      disabled: 0,
    }
  );

  // Enrich each user with their issue summary data
  const enrichedUsers = users.map((user) => {
    const userObject = typeof user.toObject === 'function' ? user.toObject() : user;
    const issueSummary = issuesByUserId.get(String(userObject._id || userObject.id));

    return {
      ...userObject,
      issueSummary: {
        totalIssues: issueSummary?.totalIssues || 0,
        loginIssues: issueSummary?.loginIssues || 0,
        apiIssues: issueSummary?.apiIssues || 0,
        systemIssues: issueSummary?.systemIssues || 0,
        rateLimitIssues: issueSummary?.rateLimitIssues || 0,
        latestIssueAt: issueSummary?.latestIssueAt,
        latestIssueMessage: issueSummary?.latestIssueMessage,
        latestIssueCategory: issueSummary?.latestIssueCategory,
        latestIssueSeverity: issueSummary?.latestIssueSeverity,
      },
    };
  });

  // Calculate issue totals across all users
  const issueTotals = enrichedUsers.reduce(
    (totals, user) => {
      totals.totalIssues += user.issueSummary.totalIssues;
      totals.loginIssues += user.issueSummary.loginIssues;
      totals.apiIssues += user.issueSummary.apiIssues;
      totals.systemIssues += user.issueSummary.systemIssues;
      totals.rateLimitIssues += user.issueSummary.rateLimitIssues;
      return totals;
    },
    {
      totalIssues: 0,
      loginIssues: 0,
      apiIssues: 0,
      systemIssues: 0,
      rateLimitIssues: 0,
    }
  );

  return { users: enrichedUsers, summary: { ...summary, ...issueTotals } };
};

/**
 * Remove User removes a record after ownership checks.
 * Deletes a user account and all associated trips with proper authorization validation.
 * 
 * @param {string} userId - ID of the user to remove
 * @param {string} adminUserId - ID of the admin performing the removal
 * @returns {Object} Result containing deleted user and trip removal count
 * @throws {AppError} If user tries to remove own admin account, user not found, or admin deletion attempt
 */
const removeUser = async (userId, adminUserId) => {
  // Prevent admins from deleting their own account
  if (userId === adminUserId) {
    throw new AppError('You cannot remove your own admin account', 400);
  }

  // Verify the user exists before attempting deletion
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // Prevent deletion of other admin accounts from the admin interface
  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be removed from this page', 403);
  }

  // Delete user and all associated trips in parallel
  const [deletedUser, deletedTrips] = await Promise.all([
    userRepository.deleteById(userId),
    tripRepository.deleteByUserId(userId),
  ]);

  return {
    user: deletedUser,
    removedTrips: deletedTrips.deletedCount || 0,
  };
};

module.exports = { getDashboard, getUsers, removeUser };