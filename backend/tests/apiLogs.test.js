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

describe('API log monitoring service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      filter: { category: 'api' },
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
      metadata: {
        failedAttempts: '2',
      },
    });
  });

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
      metadata: {
        attemptedEmailMasked: 't***@example.com',
      },
    });
  });
});
