/**
 * Trips module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// External dependencies for HTTP requests and application instance
const request = require('supertest');
const app = require('../src/app');

// Mock the trip repository to isolate service layer tests from database operations
jest.mock('../src/modules/trips/trip.repository', () => ({
  create: jest.fn(),
  findByUserId: jest.fn(),
  findByIdAndUserId: jest.fn(),
  updateByIdAndUserId: jest.fn(),
  deleteByIdAndUserId: jest.fn(),
}));

// Mock the notification service to prevent actual notification scheduling during tests
jest.mock('../src/modules/notifications/notification.service', () => ({
  cancelPackingListRemindersForTrip: jest.fn(),
  scheduleTripReminder: jest.fn(),
  reschedulePackingListRemindersForTrip: jest.fn(),
}));
jest.mock('../src/modules/itinerary/itinerary.service', () => ({
  syncTripDateRange: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const tripRepository = require('../src/modules/trips/trip.repository');
const notificationService = require('../src/modules/notifications/notification.service');
const itineraryService = require('../src/modules/itinerary/itinerary.service');
const tripService = require('../src/modules/trips/trip.service');

// Test group covers authentication and authorization behavior for trip endpoints.
describe('Trip route protection', () => {
  // Scenario verifies one expected outcome or error path when missing credentials.
  test('rejects trip list request without JWT', async () => {
    // Send GET request without authentication header
    const response = await request(app).get('/api/v1/trips');

    // Verify that unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify that appropriate error message is returned to client
    expect(response.body.message).toBe('Authentication token is required');
  });
});

// Test group covers all CRUD operations and validation rules for trip management.
describe('Trip CRUD service', () => {
  // Reset all mock state before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure notification mock to resolve successfully by default
    notificationService.scheduleTripReminder.mockResolvedValue(undefined);
    notificationService.reschedulePackingListRemindersForTrip.mockResolvedValue([]);
    notificationService.cancelPackingListRemindersForTrip.mockResolvedValue([]);
  });

  // Verify that trip creation normalizes input data and associates with authenticated user
  test('creates a normalized trip owned by the authenticated user', async () => {
    // Define the expected stored trip object that repository should return
    const storedTrip = { id: 'trip-1', userId: 'user-1', destination: 'Tokyo' };
    // Mock repository to return the stored trip when create is called
    tripRepository.create.mockResolvedValue(storedTrip);

    // Execute service method with user ID and trip data containing whitespace
    const result = await tripService.createTrip('user-1', {
      destinationSegments: [
        {
          city: ' Tokyo ', // Leading/trailing whitespace should be trimmed
          country: ' Japan ', // Leading/trailing whitespace should be trimmed
          startDate: '2026-07-01',
          endDate: '2026-07-05',
        },
      ],
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      budget: 2500,
    });

    // Verify repository received normalized data with trimmed strings and budget object
    expect(tripRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        destination: 'Tokyo', // Whitespace trimmed
        country: 'Japan', // Whitespace trimmed
        budget: expect.objectContaining({ totalAmount: 2500 }),
      })
    );
    // Verify notification was scheduled for the newly created trip
    expect(notificationService.scheduleTripReminder).toHaveBeenCalledWith(storedTrip);
    // Verify service returns the stored trip object
    expect(result).toBe(storedTrip);
  });

  // Verify that trip listing only returns trips belonging to the requesting user
  test('lists only trips belonging to the authenticated user', async () => {
    // Define mock trips belonging to the user
    const trips = [{ id: 'trip-1' }, { id: 'trip-2' }];
    // Mock repository to return user-specific trips
    tripRepository.findByUserId.mockResolvedValue(trips);

    // Verify service resolves with the filtered trips
    await expect(tripService.getMyTrips('user-1')).resolves.toBe(trips);
    // Verify repository was called with correct user ID filter
    expect(tripRepository.findByUserId).toHaveBeenCalledWith('user-1');
  });

  // Verify that reading a trip requires both trip ID and owner ID for access control
  test('reads a trip using both trip ID and owner ID', async () => {
    // Define mock trip with matching user ID
    const trip = { id: 'trip-1', userId: 'user-1' };
    // Mock repository to return the trip when both IDs match
    tripRepository.findByIdAndUserId.mockResolvedValue(trip);

    // Verify service returns the correct trip
    await expect(tripService.getTripById('trip-1', 'user-1')).resolves.toBe(trip);
    // Verify repository was called with both identifiers
    expect(tripRepository.findByIdAndUserId).toHaveBeenCalledWith('trip-1', 'user-1');
  });

  // Verify that reading a non-existent or unauthorized trip throws appropriate error
  test('rejects reading a missing or unowned trip', async () => {
    // Mock repository to return null (trip not found or not owned by user)
    tripRepository.findByIdAndUserId.mockResolvedValue(null);

    // Verify service throws "Trip not found" error
    await expect(tripService.getTripById('trip-1', 'other-user')).rejects.toThrow(
      'Trip not found'
    );
  });

  // Verify that trip updates are restricted to the owner and trigger reminder rescheduling
  test('updates only the authenticated user trip and reschedules its reminder', async () => {
    // Define updated trip object that repository should return
    const updatedTrip = { id: 'trip-1', userId: 'user-1', destination: 'Kyoto' };
    tripRepository.findByIdAndUserId.mockResolvedValue({
      id: 'trip-1',
      userId: 'user-1',
      destination: 'Tokyo',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
    });
    // Mock repository to return updated trip after successful update
    tripRepository.updateByIdAndUserId.mockResolvedValue(updatedTrip);

    // Execute update operation with user ID and modified data
    const result = await tripService.updateTrip('trip-1', 'user-1', {
      destination: 'Kyoto',
    });

    // Verify repository received correct IDs and update data
    expect(tripRepository.updateByIdAndUserId).toHaveBeenCalledWith(
      'trip-1',
      'user-1',
      { destination: 'Kyoto' }
    );
    // Verify notification is rescheduled with updated trip data
    expect(notificationService.scheduleTripReminder).toHaveBeenCalledWith(updatedTrip);
    // Verify service returns the updated trip object
    expect(result).toBe(updatedTrip);
  });

  test('synchronizes itinerary content when the trip date range changes', async () => {
    const previousTrip = {
      _id: 'trip-1',
      userId: 'user-1',
      destination: 'Tokyo',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
    };
    const updatedTrip = {
      ...previousTrip,
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-07-12'),
    };
    tripRepository.findByIdAndUserId.mockResolvedValue(previousTrip);
    tripRepository.updateByIdAndUserId.mockResolvedValue(updatedTrip);

    await tripService.updateTrip('trip-1', 'user-1', {
      startDate: '2026-07-10',
      endDate: '2026-07-12',
    });

    expect(itineraryService.syncTripDateRange).toHaveBeenCalledWith(
      previousTrip,
      updatedTrip,
      'user-1'
    );
  });

  // Verify that deletion only affects trips owned by the authenticated user
  test('deletes only the authenticated user trip', async () => {
    // Mock repository to return deleted trip object on successful deletion
    tripRepository.deleteByIdAndUserId.mockResolvedValue({ id: 'trip-1' });

    // Verify service resolves successfully (returns undefined)
    await expect(tripService.deleteTrip('trip-1', 'user-1')).resolves.toBeUndefined();
    // Verify repository was called with correct IDs for ownership validation
    expect(tripRepository.deleteByIdAndUserId).toHaveBeenCalledWith('trip-1', 'user-1');
  });

  // Verify validation rule preventing trips with end date before start date
  test('rejects a trip whose end date is before its start date', async () => {
    // Attempt to create trip with invalid date range
    await expect(
      tripService.createTrip('user-1', {
        destination: 'Tokyo',
        startDate: '2026-07-05', // Start date after end date
        endDate: '2026-07-01', // End date before start date
      })
    ).rejects.toThrow('End date cannot be before start date');
    // Verify no database operation was attempted for invalid data
    expect(tripRepository.create).not.toHaveBeenCalled();
  });
});

// Test group covers weather-based recommendations for trip planning
describe('Trip weather guidance', () => {
  // Destructure the weather guidance function for cleaner test code
  const { getWeatherGuidance } = tripService;

  // Verify rainy weather recommendations include umbrella and indoor activities
  test('recommends umbrella and indoor places for rainy weather', () => {
    // Execute guidance function with rainy weather data
    const guidance = getWeatherGuidance({
      available: true,
      condition: 'Rain',
      precipitation: { amountMm: 5, probability: 70 },
      temperature: { max: 24, mean: 23 },
    });

    // Verify correct weather mode is identified
    expect(guidance.mode).toBe('rainy');
    // Verify packing tips include umbrella for rain protection
    expect(guidance.packingTips.join(' ')).toContain('umbrella');
    // Verify place tips suggest indoor locations to avoid rain
    expect(guidance.placeTips.join(' ')).toContain('indoor');
    // Verify shopping is recommended for rainy day activities
    expect(guidance.recommendedCategories).toContain('shopping');
  });

  // Verify hot sunny weather recommendations include sun protection and cool indoor spaces
  test('recommends sun protection and cool indoor places for hot sunny weather', () => {
    // Execute guidance function with hot, clear weather data
    const guidance = getWeatherGuidance({
      available: true,
      condition: 'Clear',
      precipitation: { amountMm: 0, probability: 5 },
      temperature: { max: 34, mean: 31 }, // High temperatures above 30°C
    });

    // Verify correct weather mode is identified
    expect(guidance.mode).toBe('sunny');
    // Verify packing tips include sunscreen for sun protection
    expect(guidance.packingTips.join(' ')).toContain('sunscreen');
    // Verify place tips suggest air-conditioned locations for heat relief
    expect(guidance.placeTips.join(' ')).toContain('air-conditioned');
    // Verify food-related activities are recommended for hot weather
    expect(guidance.recommendedCategories).toContain('food');
  });

  // Verify default recommendations are provided when weather data is unavailable
  test('uses default place ideas when weather is unavailable', () => {
    // Execute guidance function with unavailable weather flag
    const guidance = getWeatherGuidance({
      available: false,
      message: 'Weather temporarily unavailable',
    });

    // Verify availability flag is passed through to response
    expect(guidance.available).toBe(false);
    // Verify default mode is used as fallback
    expect(guidance.mode).toBe('default');
    // Verify attractions are recommended as default category
    expect(guidance.recommendedCategories).toContain('attractions');
  });
});
