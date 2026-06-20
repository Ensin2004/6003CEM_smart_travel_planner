/**
 * Api Logs module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Mock the API log repository to isolate service layer tests from database operations
jest.mock('../src/modules/apiLogs/apiLog.repository', () => ({
  findMany: jest.fn(),
  findRecentRepeatedEvent: jest.fn(),
  countMany: jest.fn(),
  countSince: jest.fn(),
  aggregateCategoryCounts: jest.fn(),
  aggregateStatusCounts: jest.fn(),
  aggregateSeverityCounts: jest.fn(),
  aggregateDailyCounts: jest.fn(),
  create: jest.fn(),
  recordRepeatedEvent: jest.fn(),
  sumOccurrences: jest.fn(),
  sumOccurrencesSince: jest.fn(),
}));

jest.mock('../src/modules/notifications/notification.service', () => ({
  notifyAdminsOfApiLog: jest.fn().mockResolvedValue([]),
}));

// Import mocked modules after jest.mock calls for reference in tests
const apiLogRepository = require('../src/modules/apiLogs/apiLog.repository');
const apiLogService = require('../src/modules/apiLogs/apiLog.service');

// Test group covers API log monitoring functionality including filtering,
// aggregation, pagination, and data sanitization.
describe('API log monitoring service', () => {
  // Setup prepares shared data before assertions - reset all mock state.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Scenario verifies that monitoring returns summary, pagination, and filtered logs.
  test('returns monitoring summary, pagination, and filtered logs', async () => {
    // Define a sample log entry for testing
    const logs = [
      {
        _id: 'log-1',
        service: 'openweathermap',
        category: 'api',
        status: 'fail',
        severity: 'warning',
      },
    ];

    // Mock repository methods with specific return values
    apiLogRepository.findMany.mockResolvedValue(logs);
    // Count queries for different log types
    apiLogRepository.sumOccurrences
      .mockResolvedValueOnce(8)   // Total represented events
      .mockResolvedValueOnce(3)   // Failure count
      .mockResolvedValueOnce(1);  // Error count
    apiLogRepository.sumOccurrencesSince.mockResolvedValue(2);  // Recent failures (last 24h)
    apiLogRepository.countMany.mockResolvedValue(6); // Grouped rows in table
    apiLogRepository.aggregateCategoryCounts.mockResolvedValue([{ _id: 'api', count: 5 }]);
    apiLogRepository.aggregateStatusCounts.mockResolvedValue([{ _id: 'fail', count: 3 }]);
    apiLogRepository.aggregateSeverityCounts.mockResolvedValue([{ _id: 'warning', count: 3 }]);
    apiLogRepository.aggregateDailyCounts.mockResolvedValue([]);  // Empty daily data

    // Execute monitoring query with category filter
    const result = await apiLogService.getMonitoring({
      category: 'api',
      limit: 10,
      page: 1,
    });

    // Verify repository was called with correct filter parameters
    expect(apiLogRepository.findMany).toHaveBeenCalledWith({
      filter: {
        category: 'api',
        // Only include logs with errorCode and requestId (meaningful failures)
        errorCode: { $exists: true, $nin: [null, ''] },
        requestId: { $exists: true, $nin: [null, ''] },
      },
      limit: 10,
      page: 1,
    });
    // Verify logs are returned
    expect(result.logs).toEqual(logs);
    // Verify summary statistics are correctly aggregated
    expect(result.summary).toEqual({
      totalLogs: 8,
      failures: 3,
      errors: 1,
      recentFailures: 2,
      health: 'warning',  // Health status derived from severity
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
    // Verify daily counts array has 7 days (default week view)
    expect(result.summary.dailyCounts).toHaveLength(7);
    // Verify pagination metadata
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 6,
      totalOccurrences: 8,
      totalPages: 1,
    });
  });

  // Scenario verifies that empty metadata values are removed before recording.
  test('removes empty metadata before saving event', async () => {
    // Mock repository create to return success
    apiLogRepository.create.mockResolvedValue({});
    apiLogRepository.findRecentRepeatedEvent.mockResolvedValue(null);

    // Record event with undefined metadata value
    await apiLogService.recordEvent({
      service: 'auth',
      status: 'fail',
      metadata: {
        failedAttempts: 2,
        emptyValue: undefined,  // Should be removed
      },
    });

    // Verify repository received cleaned data (undefined fields removed)
    expect(apiLogRepository.create).toHaveBeenCalledWith({
      service: 'auth',
      category: 'api',
      severity: 'info',
      status: 'fail',
      errorCode: 'REQUEST_FAILED',  // Default error code for failures
      requestId: expect.any(String), // Auto-generated if not provided
      occurrenceCount: 1,
      firstOccurredAt: expect.any(Date),
      lastOccurredAt: expect.any(Date),
      metadata: {
        failedAttempts: '2',  // Converted to string for consistent storage
      },
    });
  });

  // Scenario verifies that attempted email addresses are masked before logging.
  test('masks attempted email before saving auth log metadata', async () => {
    // Mock repository create
    apiLogRepository.create.mockResolvedValue({});
    apiLogRepository.findRecentRepeatedEvent.mockResolvedValue(null);

    // Record authentication failure with attempted email
    await apiLogService.recordEvent({
      service: 'auth',
      status: 'fail',
      attemptedEmail: 'Traveller@example.com',  // Sensitive PII
    });

    // Verify email is masked (only first character and domain preserved)
    expect(apiLogRepository.create).toHaveBeenCalledWith({
      service: 'auth',
      category: 'api',
      severity: 'info',
      status: 'fail',
      errorCode: 'REQUEST_FAILED',
      requestId: expect.any(String),
      occurrenceCount: 1,
      firstOccurredAt: expect.any(Date),
      lastOccurredAt: expect.any(Date),
      metadata: {
        attemptedEmailMasked: 't***@example.com',  // Masked for privacy
      },
    });
  });

  // Verify that standardized error codes and request IDs are stored as searchable fields
  test('stores standardized error code and request ID as searchable fields', async () => {
    // Mock repository create
    apiLogRepository.create.mockResolvedValue({});
    apiLogRepository.findRecentRepeatedEvent.mockResolvedValue(null);

    // Record system error with specific error code and request ID
    await apiLogService.recordEvent({
      service: 'server',
      category: 'system',
      severity: 'error',
      status: 'error',
      statusCode: 500,
      errorCode: 'DATABASE_UNAVAILABLE',  // Specific error identifier
      requestId: 'request-123',            // Client-provided correlation ID
      message: 'Database connection failed',
    });

    // Verify error code and request ID are stored as top-level fields for querying
    expect(apiLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'DATABASE_UNAVAILABLE',
        requestId: 'request-123',
        occurrenceCount: 1,
      })
    );
  });

  test('groups repeated rate-limit events into an existing API log row', async () => {
    apiLogRepository.findRecentRepeatedEvent.mockResolvedValue({ _id: 'log-1', metadata: { firstRequestId: 'request-1' } });
    apiLogRepository.recordRepeatedEvent.mockResolvedValue({
      _id: 'log-1',
      service: 'rate-limit',
      category: 'rate-limit',
      status: 'fail',
      severity: 'warning',
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      requestId: 'request-2',
      occurrenceCount: 2,
    });

    const result = await apiLogService.recordEvent({
      service: 'rate-limit',
      category: 'rate-limit',
      severity: 'warning',
      method: 'GET',
      endpoint: '/api/map/search',
      status: 'fail',
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      requestId: 'request-2',
      message: 'Too many travel data requests. Please try again later.',
    });

    expect(apiLogRepository.create).not.toHaveBeenCalled();
    expect(apiLogRepository.findRecentRepeatedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        logKey: expect.stringContaining('rate_limit_exceeded'),
        since: expect.any(Date),
      })
    );
    expect(apiLogRepository.recordRepeatedEvent).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        requestId: 'request-2',
        message: 'Too many travel data requests. Please try again later.',
        metadata: expect.objectContaining({
          firstRequestId: 'request-1',
          latestRequestId: 'request-2',
        }),
      })
    );
    expect(result.occurrenceCount).toBe(2);
  });

  // Verify that monitoring logs can be filtered by error code and request ID
  test('filters monitoring logs by standardized error code and request ID', async () => {
    // Mock all repository methods to return empty results
    apiLogRepository.findMany.mockResolvedValue([]);
    apiLogRepository.countMany.mockResolvedValue(0);
    apiLogRepository.sumOccurrences.mockResolvedValue(0);
    apiLogRepository.sumOccurrencesSince.mockResolvedValue(0);
    apiLogRepository.aggregateCategoryCounts.mockResolvedValue([]);
    apiLogRepository.aggregateStatusCounts.mockResolvedValue([]);
    apiLogRepository.aggregateSeverityCounts.mockResolvedValue([]);
    apiLogRepository.aggregateDailyCounts.mockResolvedValue([]);

    // Execute monitoring query with error code and request ID filters
    await apiLogService.getMonitoring({
      errorCode: 'internal_server_error',  // Lowercase input - should be normalized
      requestId: 'request-123',
    });

    // Verify filters are normalized and applied correctly
    expect(apiLogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          errorCode: 'INTERNAL_SERVER_ERROR',  // Normalized to uppercase
          requestId: expect.any(RegExp),       // Partial match supported via regex
        },
      })
    );
  });

  test('filters monitoring logs by user ID for admin account activity', async () => {
    apiLogRepository.findMany.mockResolvedValue([]);
    apiLogRepository.countMany.mockResolvedValue(0);
    apiLogRepository.sumOccurrences.mockResolvedValue(0);
    apiLogRepository.sumOccurrencesSince.mockResolvedValue(0);
    apiLogRepository.aggregateCategoryCounts.mockResolvedValue([]);
    apiLogRepository.aggregateStatusCounts.mockResolvedValue([]);
    apiLogRepository.aggregateSeverityCounts.mockResolvedValue([]);
    apiLogRepository.aggregateDailyCounts.mockResolvedValue([]);

    await apiLogService.getMonitoring({ userId: '507f1f77bcf86cd799439011' });

    expect(apiLogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          userId: '507f1f77bcf86cd799439011',
        }),
      })
    );
  });

  test('includes the full selected end date in monitoring filters', async () => {
    apiLogRepository.findMany.mockResolvedValue([]);
    apiLogRepository.countMany.mockResolvedValue(0);
    apiLogRepository.sumOccurrences.mockResolvedValue(0);
    apiLogRepository.sumOccurrencesSince.mockResolvedValue(0);
    apiLogRepository.aggregateCategoryCounts.mockResolvedValue([]);
    apiLogRepository.aggregateStatusCounts.mockResolvedValue([]);
    apiLogRepository.aggregateSeverityCounts.mockResolvedValue([]);
    apiLogRepository.aggregateDailyCounts.mockResolvedValue([]);

    await apiLogService.getMonitoring({ from: '2026-06-01', to: '2026-06-14' });

    expect(apiLogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: {
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          },
        }),
      })
    );

    const filter = apiLogRepository.findMany.mock.calls[0][0].filter;
    expect(filter.createdAt.$gte.getHours()).toBe(0);
    expect(filter.createdAt.$lte.getHours()).toBe(23);
  });
});
