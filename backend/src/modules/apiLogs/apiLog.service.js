const apiLogRepository = require('./apiLog.repository');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const cleanMetadata = (metadata = {}) =>
  Object.entries(metadata).reduce((safeMetadata, [key, value]) => {
    if (value === undefined || value === null) {
      return safeMetadata;
    }

    safeMetadata[key] = String(value).slice(0, 200);
    return safeMetadata;
  }, {});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const maskEmail = (email = '') => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const [name, domain] = normalizedEmail.split('@');

  if (!name || !domain) {
    return '';
  }

  return `${name[0]}***@${domain}`;
};

const formatLog = (log) => {
  const populatedUser = log.userId && typeof log.userId === 'object' ? log.userId : null;

  return {
    ...log,
    userId: populatedUser?._id || log.userId,
    actor: populatedUser
      ? {
          id: populatedUser._id,
          name: populatedUser.name,
          email: populatedUser.email,
          role: populatedUser.role,
        }
      : undefined,
    attemptedEmail: log.metadata?.attemptedEmailMasked,
  };
};

const buildFilter = ({ status, category, severity, service, from, to } = {}) => {
  const filter = {};

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;
  if (service) filter.service = new RegExp(escapeRegex(service.trim()), 'i');

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  return filter;
};

const normalizePagination = ({ limit, page } = {}) => ({
  limit: Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
  page: Math.max(Number(page) || 1, 1),
});

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

const recordEvent = async (data) => {
  const metadata = cleanMetadata({
    ...data.metadata,
    ...(data.attemptedEmail && { attemptedEmailMasked: maskEmail(data.attemptedEmail) }),
  });

  return apiLogRepository.create({
    service: data.service,
    category: data.category || 'api',
    severity: data.severity || 'info',
    method: data.method,
    endpoint: data.endpoint,
    status: data.status,
    statusCode: data.statusCode,
    message: data.message,
    userId: data.userId,
    ...(Object.keys(metadata).length && { metadata }),
  });
};

const getRecentLogs = async (query = {}) => {
  const filter = buildFilter(query);
  const pagination = normalizePagination(query);

  const logs = await apiLogRepository.findMany({ filter, ...pagination });
  return logs.map(formatLog);
};

const getMonitoring = async (query = {}) => {
  const filter = buildFilter(query);
  const pagination = normalizePagination(query);
  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    logs,
    totalLogs,
    failures,
    errors,
    recentFailures,
    categoryCounts,
    statusCounts,
    severityCounts,
    dailyCounts,
  ] = await Promise.all([
    apiLogRepository.findMany({ filter, ...pagination }),
    apiLogRepository.countMany(filter),
    apiLogRepository.countMany({ ...filter, status: { $in: ['fail', 'error'] } }),
    apiLogRepository.countMany({ ...filter, status: 'error' }),
    apiLogRepository.countSince({ status: { $in: ['fail', 'error'] } }, lastDay),
    apiLogRepository.aggregateCategoryCounts(filter),
    apiLogRepository.aggregateStatusCounts(filter),
    apiLogRepository.aggregateSeverityCounts(filter),
    apiLogRepository.aggregateDailyCounts(filter),
  ]);

  return {
    logs: logs.map(formatLog),
    summary: {
      totalLogs,
      failures,
      errors,
      recentFailures,
      health: recentFailures > 0 || errors > 0 ? 'warning' : 'healthy',
      categoryCounts: categoryCounts.map((item) => ({
        category: item._id || 'api',
        count: item.count,
      })),
      statusCounts: statusCounts.map((item) => ({
        status: item._id || 'success',
        count: item.count,
      })),
      severityCounts: severityCounts.map((item) => ({
        severity: item._id || 'info',
        count: item.count,
      })),
      dailyCounts: fillDailyCounts(dailyCounts),
    },
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: totalLogs,
      totalPages: Math.ceil(totalLogs / pagination.limit),
    },
  };
};

module.exports = { getRecentLogs, getMonitoring, maskEmail, recordEvent };
