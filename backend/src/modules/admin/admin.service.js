const userRepository = require('../users/user.repository');
const tripRepository = require('../trips/trip.repository');
const apiLogRepository = require('../apiLogs/apiLog.repository');
const AppError = require('../../utils/AppError');

const getDashboard = async () => {
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
    userRepository.findAll(),
    tripRepository.countAll(),
    apiLogRepository.countFailures(),
    apiLogRepository.aggregateUserIssueSummary(),
    tripRepository.aggregateStatusCounts(),
    apiLogRepository.aggregateStatusCounts({}),
    apiLogRepository.aggregateSeverityCounts({}),
    apiLogRepository.aggregateDailyCounts({}),
  ]);
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
    apiStatus: failedApiEvents > 0 ? 'warning' : 'healthy',
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
    dailyLogCounts: fillDailyCounts(logDailyCounts),
  };
};

const fillDailyCounts = (dailyCounts, days = 7) => {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const matchingItems = dailyCounts.filter((item) => item._id.date === key);

    return {
      date: key,
      success: matchingItems.find((item) => item._id.status === 'success')?.count || 0,
      fail: matchingItems.find((item) => item._id.status === 'fail')?.count || 0,
      error: matchingItems.find((item) => item._id.status === 'error')?.count || 0,
    };
  });
};

const getUsers = async () => {
  const [users, userIssues] = await Promise.all([
    userRepository.findAll(),
    apiLogRepository.aggregateUserIssueSummary(),
  ]);
  const issuesByUserId = new Map(userIssues.map((item) => [String(item._id), item]));
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

const removeUser = async (userId, adminUserId) => {
  if (userId === adminUserId) {
    throw new AppError('You cannot remove your own admin account', 400);
  }

  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be removed from this page', 403);
  }

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
