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

  const [logs, totalLogs, failures, errors, recentFailures, categoryCounts] = await Promise.all([
    apiLogRepository.findMany({ filter, ...pagination }),
    apiLogRepository.countMany(filter),
    apiLogRepository.countMany({ ...filter, status: { $in: ['fail', 'error'] } }),
    apiLogRepository.countMany({ ...filter, status: 'error' }),
    apiLogRepository.countSince({ status: { $in: ['fail', 'error'] } }, lastDay),
    apiLogRepository.aggregateCategoryCounts(filter),
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
