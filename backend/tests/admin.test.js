/**
 * Admin module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import HTTP testing utilities and the application instance
const request = require('supertest');
const app = require('../src/app');

// Test group covers authentication and authorization for admin dashboard endpoints.
describe('Admin route protection', () => {
  // Scenario verifies one expected outcome or error path when accessing admin routes without authentication.
  test('rejects admin dashboard request without JWT', async () => {
    // Send GET request to admin dashboard without authentication header
    const response = await request(app).get('/api/v1/admin/dashboard');

    // Verify that unauthorized status code is returned
    expect(response.statusCode).toBe(401);
  });
});

// Mock the user repository to isolate admin service tests from database operations
jest.mock('../src/modules/users/user.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  deleteById: jest.fn(),
}));

// Mock the trip repository to isolate admin service tests from trip data operations
jest.mock('../src/modules/trips/trip.repository', () => ({
  countAll: jest.fn(),
  deleteByUserId: jest.fn(),
  aggregateStatusCounts: jest.fn(),
}));

// Mock the API log repository to isolate admin service tests from logging data
jest.mock('../src/modules/apiLogs/apiLog.repository', () => ({
  countFailures: jest.fn(),
  aggregateUserIssueSummary: jest.fn(),
  aggregateStatusCounts: jest.fn(),
  aggregateSeverityCounts: jest.fn(),
  aggregateDailyCounts: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const userRepository = require('../src/modules/users/user.repository');
const tripRepository = require('../src/modules/trips/trip.repository');
const apiLogRepository = require('../src/modules/apiLogs/apiLog.repository');
const adminService = require('../src/modules/admin/admin.service');

// Test group covers administrative user management including user listing,
// account removal with cascading trip deletion, and admin account protection.
describe('Admin user management service', () => {
  // Setup prepares shared data before assertions - reset all mock state.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Scenario verifies that user summary aggregates statistics across users and their issues.
  test('returns user summary for admin management', async () => {
    // Mock user repository to return three users with different roles and statuses
    userRepository.findAll.mockResolvedValue([
      { _id: 'user-1', role: 'user', status: 'active' },
      { _id: 'user-2', role: 'user', status: 'disabled' },
      { _id: 'admin-1', role: 'admin', status: 'active' },
    ]);
    // Mock API log repository to return issue summary for one user (user-1)
    apiLogRepository.aggregateUserIssueSummary.mockResolvedValue([
      {
        _id: 'user-1',
        totalIssues: 3,
        loginIssues: 2,
        apiIssues: 1,
        systemIssues: 0,
        rateLimitIssues: 0,
      },
    ]);

    // Execute admin service to get user list with aggregated data
    const result = await adminService.getUsers();

    // Verify summary statistics are correctly aggregated across all users
    expect(result.summary).toMatchObject({
      total: 3,           // Total number of users
      travellers: 2,      // Non-admin users count
      admins: 1,          // Admin role users count
      active: 2,          // Users with active status
      disabled: 1,        // Users with disabled status
      totalIssues: 3,     // Total issues across all users
      loginIssues: 2,     // Login-related issues only
      apiIssues: 1,       // API-related issues only
    });
    // Verify the first user has the correct issue summary attached
    expect(result.users[0].issueSummary.totalIssues).toBe(3);
  });

  // Scenario verifies that removing a traveller account also deletes associated trip records.
  test('removes traveller account and trip records', async () => {
    // Define a standard user (non-admin) to be removed
    const user = { id: 'user-1', role: 'user' };
    // Mock user repository to return the user being removed
    userRepository.findById.mockResolvedValue(user);
    // Mock user repository to return the user on successful deletion
    userRepository.deleteById.mockResolvedValue(user);
    // Mock trip repository to indicate 2 trips were deleted for this user
    tripRepository.deleteByUserId.mockResolvedValue({ deletedCount: 2 });

    // Execute user removal (admin-1 is performing the action)
    const result = await adminService.removeUser('user-1', 'admin-1');

    // Verify user account was deleted
    expect(userRepository.deleteById).toHaveBeenCalledWith('user-1');
    // Verify all trips belonging to the user were deleted (cascade deletion)
    expect(tripRepository.deleteByUserId).toHaveBeenCalledWith('user-1');
    // Verify result contains both the removed user and count of deleted trips
    expect(result).toEqual({ user, removedTrips: 2 });
  });

  // Scenario verifies that an admin cannot delete their own account.
  test('rejects removing own admin account', async () => {
    // Attempt to remove the same admin account that is performing the action
    await expect(adminService.removeUser('admin-1', 'admin-1')).rejects.toThrow(
      'You cannot remove your own admin account'
    );
    // Verify no deletion operation was attempted
    expect(userRepository.deleteById).not.toHaveBeenCalled();
  });

  // Scenario verifies that admins cannot remove other admin accounts.
  test('rejects removing another admin account', async () => {
    // Mock user repository to return an admin account (target is also admin)
    userRepository.findById.mockResolvedValue({ id: 'admin-2', role: 'admin' });

    // Attempt to remove another admin account
    await expect(adminService.removeUser('admin-2', 'admin-1')).rejects.toThrow(
      'Admin accounts cannot be removed from this page'
    );
    // Verify no deletion operation was attempted for protected admin account
    expect(userRepository.deleteById).not.toHaveBeenCalled();
  });
});