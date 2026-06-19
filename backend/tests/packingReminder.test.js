jest.mock('../src/modules/users/user.repository', () => ({
  findById: jest.fn(),
  findActiveAdmins: jest.fn(),
}));

jest.mock('../src/modules/travelTools/travelTools.repository', () => ({
  packingListRepository: {
    findByIdAndUserId: jest.fn(),
    findByTripIdAndUserId: jest.fn(),
    save: jest.fn(),
  },
}));

jest.mock('../src/modules/notifications/notification.repository', () => ({
  countUnreadByUserId: jest.fn(),
  create: jest.fn(),
  deleteById: jest.fn(),
  deletePendingByTripAndType: jest.fn(),
  deletePendingPackingListReminder: jest.fn(),
  findRecentAdminAlert: jest.fn(),
  findByUserId: jest.fn(),
  findDueUnsent: jest.fn(),
  markAllReadByUserId: jest.fn(),
  markReadByIdAndUserId: jest.fn(),
  recordAdminAlertDuplicate: jest.fn(),
  save: jest.fn(),
}));

jest.mock('../src/modules/notifications/notification.socket', () => ({
  emitNotification: jest.fn(),
  emitUnreadCount: jest.fn(),
}));

jest.mock('../src/utils/email.service', () => ({
  sendNotificationEmail: jest.fn(),
}));

const userRepository = require('../src/modules/users/user.repository');
const { packingListRepository } = require('../src/modules/travelTools/travelTools.repository');
const notificationRepository = require('../src/modules/notifications/notification.repository');
const notificationService = require('../src/modules/notifications/notification.service');

describe('Packing-list reminder scheduling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    jest.clearAllMocks();

    userRepository.findById.mockResolvedValue({
      _id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      notificationPreferences: { packingReminder: true },
    });
    notificationRepository.create.mockImplementation(async (data) => ({
      _id: 'notification-1',
      ...data,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('schedules the reminder using the selected number of days before the trip', async () => {
    await notificationService.schedulePackingListReminder({
      _id: 'packing-list-1',
      userId: 'user-1',
      tripId: 'trip-1',
      tripStartDate: new Date('2026-06-10T00:00:00.000Z'),
      destination: 'Tokyo',
      title: 'Japan essentials',
      reminder: { enabled: true, daysBeforeTrip: 3 },
      items: [{ isPacked: false }],
    });

    expect(notificationRepository.deletePendingPackingListReminder)
      .toHaveBeenCalledWith('packing-list-1', 'user-1');
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'packing-list',
        scheduledAt: new Date('2026-06-07T00:00:00.000Z'),
      })
    );
    expect(notificationRepository.save).not.toHaveBeenCalled();
  });

  test('cancels the pending reminder when every item is packed', async () => {
    await notificationService.schedulePackingListReminder({
      _id: 'packing-list-1',
      userId: 'user-1',
      tripId: 'trip-1',
      tripStartDate: new Date('2026-06-10T00:00:00.000Z'),
      reminder: { enabled: true, daysBeforeTrip: 3 },
      items: [{ isPacked: true }],
    });

    expect(notificationRepository.deletePendingPackingListReminder)
      .toHaveBeenCalledWith('packing-list-1', 'user-1');
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  test.each([
    ['the linked trip is today', '2026-06-01T00:00:00.000Z', 2],
    ['the selected reminder date has already passed', '2026-06-02T00:00:00.000Z', 3],
  ])('sends immediately when %s', async (_scenario, tripStartDate, daysBeforeTrip) => {
    const packingList = {
      _id: 'packing-list-1',
      userId: 'user-1',
      tripId: 'trip-1',
      tripStartDate: new Date(tripStartDate),
      destination: 'Tokyo',
      title: 'Japan essentials',
      reminder: { enabled: true, daysBeforeTrip },
      items: [{ isPacked: false }],
    };
    packingListRepository.findByIdAndUserId.mockResolvedValue(packingList);
    notificationRepository.countUnreadByUserId.mockResolvedValue(1);

    await notificationService.schedulePackingListReminder(packingList);

    expect(notificationRepository.create).toHaveBeenCalled();
    expect(notificationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'notification-1',
        sentAt: expect.any(Date),
      })
    );
  });

  test('discards a due reminder when the live packing list has no unpacked items', async () => {
    const dueNotification = {
      _id: 'notification-1',
      userId: 'user-1',
      tripId: 'trip-1',
      type: 'packing-list',
      scheduledAt: new Date('2026-06-01T00:00:00.000Z'),
      metadata: { packingListId: 'packing-list-1' },
    };
    notificationRepository.findDueUnsent.mockResolvedValue([dueNotification]);
    packingListRepository.findByIdAndUserId.mockResolvedValue({
      _id: 'packing-list-1',
      userId: 'user-1',
      tripId: 'trip-1',
      tripStartDate: new Date('2026-06-10T00:00:00.000Z'),
      reminder: { enabled: true, daysBeforeTrip: 3 },
      items: [{ isPacked: true }],
    });

    await notificationService.processDueNotifications();

    expect(notificationRepository.deleteById).toHaveBeenCalledWith('notification-1');
    expect(notificationRepository.save).not.toHaveBeenCalled();
  });

  test('suppresses repeated admin rate-limit alerts during the cooldown window', async () => {
    userRepository.findActiveAdmins.mockResolvedValue([{ _id: 'admin-1' }]);
    notificationRepository.findRecentAdminAlert.mockResolvedValue({
      _id: 'existing-alert-1',
      metadata: { alertKey: 'admin-rate-limit|rate_limit_exceeded|rate-limit|rate-limit|/api/map' },
    });

    const result = await notificationService.notifyAdminsOfApiLog({
      _id: 'log-2',
      service: 'rate-limit',
      category: 'rate-limit',
      severity: 'warning',
      endpoint: '/api/map/search',
      status: 'fail',
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      requestId: 'request-2',
      message: 'Too many travel data requests. Please try again later.',
    });

    expect(result).toEqual([]);
    expect(notificationRepository.create).not.toHaveBeenCalled();
    expect(notificationRepository.recordAdminAlertDuplicate).toHaveBeenCalledWith(
      'existing-alert-1',
      expect.objectContaining({
        apiLogId: 'log-2',
        requestId: 'request-2',
        message: expect.stringContaining('Too many travel data requests'),
      })
    );
  });

  test('adds grouping metadata to the first admin system-error alert', async () => {
    userRepository.findActiveAdmins.mockResolvedValue([{ _id: 'admin-1' }]);
    userRepository.findById.mockResolvedValue({
      _id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      notificationPreferences: { errorLogs: true },
    });
    notificationRepository.findRecentAdminAlert.mockResolvedValue(null);
    notificationRepository.countUnreadByUserId.mockResolvedValue(1);

    await notificationService.notifyAdminsOfApiLog({
      _id: 'log-3',
      service: 'serpapi',
      category: 'external-api',
      severity: 'critical',
      endpoint: '/api/explore/restaurants',
      status: 'error',
      statusCode: 503,
      errorCode: 'NETWORK_FAILURE',
      requestId: 'request-3',
      message: 'SerpApi could not be reached.',
    });

    expect(notificationRepository.findRecentAdminAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        type: 'admin-error-log',
        alertKey: 'admin-error-log|network_failure|serpapi|external-api|/api/explore/restaurants',
      })
    );
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'admin-error-log',
        metadata: expect.objectContaining({
          alertKey: 'admin-error-log|network_failure|serpapi|external-api|/api/explore/restaurants',
          suppressedCount: 0,
        }),
      })
    );
  });
});
