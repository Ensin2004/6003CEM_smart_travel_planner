/**
 * Api Logs module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Mock the API log repository to isolate service layer tests from database operations
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
    apiLogRepository.countMany
      .mockResolvedValueOnce(8)   // Total logs
      .mockResolvedValueOnce(3)   // Failure count
      .mockResolvedValueOnce(1);  // Error count
    apiLogRepository.countSince.mockResolvedValue(2);  // Recent failures (last 24h)
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
      total: 8,
      totalPages: 1,
    });
  });

  // Scenario verifies that empty metadata values are removed before recording.
  test('removes empty metadata before saving event', async () => {
    // Mock repository create to return success
    apiLogRepository.create.mockResolvedValue({});

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
      metadata: {
        failedAttempts: '2',  // Converted to string for consistent storage
      },
    });
  });

  // Scenario verifies that attempted email addresses are masked before logging.
  test('masks attempted email before saving auth log metadata', async () => {
    // Mock repository create
    apiLogRepository.create.mockResolvedValue({});

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
      metadata: {
        attemptedEmailMasked: 't***@example.com',  // Masked for privacy
      },
    });
  });

  // Verify that standardized error codes and request IDs are stored as searchable fields
  test('stores standardized error code and request ID as searchable fields', async () => {
    // Mock repository create
    apiLogRepository.create.mockResolvedValue({});

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
      })
    );
  });

  // Verify that monitoring logs can be filtered by error code and request ID
  test('filters monitoring logs by standardized error code and request ID', async () => {
    // Mock all repository methods to return empty results
    apiLogRepository.findMany.mockResolvedValue([]);
    apiLogRepository.countMany.mockResolvedValue(0);
    apiLogRepository.countSince.mockResolvedValue(0);
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
});