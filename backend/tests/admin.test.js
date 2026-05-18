const request = require('supertest');
const app = require('../src/app');

describe('Admin route protection', () => {
  test('rejects admin dashboard request without JWT', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard');

    expect(response.statusCode).toBe(401);
  });
});

jest.mock('../src/modules/users/user.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  deleteById: jest.fn(),
}));

jest.mock('../src/modules/trips/trip.repository', () => ({
  countAll: jest.fn(),
  deleteByUserId: jest.fn(),
  aggregateStatusCounts: jest.fn(),
}));

jest.mock('../src/modules/apiLogs/apiLog.repository', () => ({
  countFailures: jest.fn(),
  aggregateUserIssueSummary: jest.fn(),
  aggregateStatusCounts: jest.fn(),
  aggregateSeverityCounts: jest.fn(),
  aggregateDailyCounts: jest.fn(),
}));

const userRepository = require('../src/modules/users/user.repository');
const tripRepository = require('../src/modules/trips/trip.repository');
const apiLogRepository = require('../src/modules/apiLogs/apiLog.repository');
const adminService = require('../src/modules/admin/admin.service');

describe('Admin user management service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns user summary for admin management', async () => {
    userRepository.findAll.mockResolvedValue([
      { _id: 'user-1', role: 'user', status: 'active' },
      { _id: 'user-2', role: 'user', status: 'disabled' },
      { _id: 'admin-1', role: 'admin', status: 'active' },
    ]);
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

    const result = await adminService.getUsers();

    expect(result.summary).toMatchObject({
      total: 3,
      travellers: 2,
      admins: 1,
      active: 2,
      disabled: 1,
      totalIssues: 3,
      loginIssues: 2,
      apiIssues: 1,
    });
    expect(result.users[0].issueSummary.totalIssues).toBe(3);
  });

  test('removes traveller account and trip records', async () => {
    const user = { id: 'user-1', role: 'user' };
    userRepository.findById.mockResolvedValue(user);
    userRepository.deleteById.mockResolvedValue(user);
    tripRepository.deleteByUserId.mockResolvedValue({ deletedCount: 2 });

    const result = await adminService.removeUser('user-1', 'admin-1');

    expect(userRepository.deleteById).toHaveBeenCalledWith('user-1');
    expect(tripRepository.deleteByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ user, removedTrips: 2 });
  });

  test('rejects removing own admin account', async () => {
    await expect(adminService.removeUser('admin-1', 'admin-1')).rejects.toThrow(
      'You cannot remove your own admin account'
    );
    expect(userRepository.deleteById).not.toHaveBeenCalled();
  });

  test('rejects removing another admin account', async () => {
    userRepository.findById.mockResolvedValue({ id: 'admin-2', role: 'admin' });

    await expect(adminService.removeUser('admin-2', 'admin-1')).rejects.toThrow(
      'Admin accounts cannot be removed from this page'
    );
    expect(userRepository.deleteById).not.toHaveBeenCalled();
  });
});
