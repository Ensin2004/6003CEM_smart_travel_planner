/**
 * Api Logs module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
jest.mock('../src/modules/apiLogs/apiLog.repository', () => ({
  findMany: jest.fn(),
  countMany: jest.fn(),
  countSince: jest.fn(),
  aggregateCategoryCounts: jest.fn(),
  aggregateStatusCounts: jest.fn(),
  aggregateSeverityCounts: jest.fn(),
  aggregateDailyCounts: jest.fn(),
  create: jest.fn(),
}));

const apiLogRepository = require('../src/modules/apiLogs/apiLog.repository');
const apiLogService = require('../src/modules/apiLogs/apiLog.service');
// Test group covers  behavior.
describe('API log monitoring service', () => {
  // Setup prepares shared data before assertions.
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
  test('returns monitoring summary, pagination, and filtered logs', async () => {
    const logs = [
      {
        _id: 'log-1',
        service: 'openweathermap',
        category: 'api',
        status: 'fail',
        severity: 'warning',
      },
    ];

    apiLogRepository.findMany.mockResolvedValue(logs);
    apiLogRepository.countMany
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    apiLogRepository.countSince.mockResolvedValue(2);
    apiLogRepository.aggregateCategoryCounts.mockResolvedValue([{ _id: 'api', count: 5 }]);
    apiLogRepository.aggregateStatusCounts.mockResolvedValue([{ _id: 'fail', count: 3 }]);
    apiLogRepository.aggregateSeverityCounts.mockResolvedValue([{ _id: 'warning', count: 3 }]);
    apiLogRepository.aggregateDailyCounts.mockResolvedValue([]);

    const result = await apiLogService.getMonitoring({
      category: 'api',
      limit: 10,
      page: 1,
    });

    expect(apiLogRepository.findMany).toHaveBeenCalledWith({
      filter: {
        category: 'api',
        errorCode: { $exists: true, $nin: [null, ''] },
        requestId: { $exists: true, $nin: [null, ''] },
      },
      limit: 10,
      page: 1,
    });
    expect(result.logs).toEqual(logs);
    expect(result.summary).toEqual({
      totalLogs: 8,
      failures: 3,
      errors: 1,
      recentFailures: 2,
      health: 'warning',
      categoryCounts: [{ category: 'api', count: 5 }],
      statusCounts: [{ status: 'fail', count: 3 }],
      severityCounts: [{ severity: 'warning', count: 3 }],
      dailyCounts: expect.arrayContaining([
        expect.objectContaining({
          success: 0,
          fail: 0,
          error: 0,
        }),
      ]),
    });
    expect(result.summary.dailyCounts).toHaveLength(7);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 8,
      totalPages: 1,
    });
  });
  // Scenario verifies one expected outcome or error path.
  test('removes empty metadata before recording event', async () => {
    apiLogRepository.create.mockResolvedValue({});

    await apiLogService.recordEvent({
      service: 'auth',
      status: 'fail',
      metadata: {
        failedAttempts: 2,
        emptyValue: undefined,
      },
    });

    expect(apiLogRepository.create).toHaveBeenCalledWith({
      service: 'auth',
      category: 'api',
      severity: 'info',
      status: 'fail',
      errorCode: 'REQUEST_FAILED',
      requestId: expect.any(String),
      metadata: {
        failedAttempts: '2',
      },
    });
  });
  // Scenario verifies one expected outcome or error path.
  test('masks attempted email before saving auth log metadata', async () => {
    apiLogRepository.create.mockResolvedValue({});

    await apiLogService.recordEvent({
      service: 'auth',
      status: 'fail',
      attemptedEmail: 'Traveller@example.com',
    });

    expect(apiLogRepository.create).toHaveBeenCalledWith({
      service: 'auth',
      category: 'api',
      severity: 'info',
      status: 'fail',
      errorCode: 'REQUEST_FAILED',
      requestId: expect.any(String),
      metadata: {
        attemptedEmailMasked: 't***@example.com',
      },
    });
  });

  test('stores standardized error code and request ID as searchable fields', async () => {
    apiLogRepository.create.mockResolvedValue({});

    await apiLogService.recordEvent({
      service: 'server',
      category: 'system',
      severity: 'error',
      status: 'error',
      statusCode: 500,
      errorCode: 'DATABASE_UNAVAILABLE',
      requestId: 'request-123',
      message: 'Database connection failed',
    });

    expect(apiLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'DATABASE_UNAVAILABLE',
        requestId: 'request-123',
      })
    );
  });

  test('filters monitoring logs by standardized error code and request ID', async () => {
    apiLogRepository.findMany.mockResolvedValue([]);
    apiLogRepository.countMany.mockResolvedValue(0);
    apiLogRepository.countSince.mockResolvedValue(0);
    apiLogRepository.aggregateCategoryCounts.mockResolvedValue([]);
    apiLogRepository.aggregateStatusCounts.mockResolvedValue([]);
    apiLogRepository.aggregateSeverityCounts.mockResolvedValue([]);
    apiLogRepository.aggregateDailyCounts.mockResolvedValue([]);

    await apiLogService.getMonitoring({
      errorCode: 'internal_server_error',
      requestId: 'request-123',
    });

    expect(apiLogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          errorCode: 'INTERNAL_SERVER_ERROR',
          requestId: expect.any(RegExp),
        },
      })
    );
  });
});
