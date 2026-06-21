// Mock the trip repository to isolate itinerary tests from trip data operations
jest.mock('../src/modules/trips/trip.repository', () => ({
  findByIdAndUserId: jest.fn(),
}));

// Mock the itinerary repository to isolate service layer tests from database operations
jest.mock('../src/modules/itinerary/itinerary.repository', () => ({
  createItem: jest.fn(),
  deleteDaysAfter: jest.fn(),
  deleteItemByIdAndUserId: jest.fn(),
  deleteItemsByIds: jest.fn(),
  findDaysByTripId: jest.fn(),
  findItemsByTripId: jest.fn(),
  updateItemByIdAndUserId: jest.fn(),
  updateDayDate: jest.fn(),
  updateItemScheduledDate: jest.fn(),
  upsertDay: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const tripRepository = require('../src/modules/trips/trip.repository');
const itineraryRepository = require('../src/modules/itinerary/itinerary.repository');
const itineraryService = require('../src/modules/itinerary/itinerary.service');

// Factory object representing a valid trip owned by user-1
// Used as default successful response for trip ownership verification
const trip = {
  _id: 'trip-1',
  userId: 'user-1',
  destination: 'Tokyo',
  country: 'Japan',
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  durationDays: 3,  // Trip spans 3 days - used for itinerary day generation
  budget: { totalAmount: 600, currency: 'MYR' },
};

// Test group covers itinerary operations including day generation,
// ownership validation, data normalization, and CRUD operations.
describe('Itinerary service', () => {
  // Reset all mock state and configure default mock behavior before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock returns a valid trip for ownership verification
    tripRepository.findByIdAndUserId.mockResolvedValue(trip);
  });

  // Verify that default itinerary days are generated based on trip duration
  test('builds default itinerary days for an owned trip', async () => {
    // Mock empty repository responses (no existing days or items)
    itineraryRepository.findDaysByTripId.mockResolvedValue([]);
    itineraryRepository.findItemsByTripId.mockResolvedValue([]);

    // Execute itinerary retrieval
    const result = await itineraryService.getItinerary('trip-1', 'user-1');

    // Verify exactly 3 days are generated (matches trip durationDays)
    expect(result.days).toHaveLength(3);
    // Verify first day has correct structure with default values
    expect(result.days[0]).toEqual(
      expect.objectContaining({
        dayNumber: 1,
        title: 'Day 1',  // Default title for unmodified day
        location: expect.objectContaining({ name: 'Tokyo', country: 'Japan' }),
        budget: { amount: 0, currency: 'MYR' },  // Daily budgets are configured per itinerary day
      })
    );
  });

  // Verify that itinerary access requires valid trip ownership
  test('rejects access to a missing or unowned trip itinerary', async () => {
    // Mock repository to return null (trip not found or not owned)
    tripRepository.findByIdAndUserId.mockResolvedValue(null);

    // Attempt to access itinerary with non-owner user ID
    await expect(
      itineraryService.getItinerary('trip-1', 'other-user')
    ).rejects.toThrow('Trip not found');
  });

  // Verify that day updates are rejected when day number exceeds trip duration
  test('rejects updating a day outside the trip date range', async () => {
    // Attempt to update day 4 when trip only has 3 days
    await expect(
      itineraryService.updateDay('trip-1', 4, 'user-1', {})
    ).rejects.toThrow('outside this trip date range');
    // Verify no database operation was attempted for invalid day number
    expect(itineraryRepository.upsertDay).not.toHaveBeenCalled();
  });

  // Verify that itinerary day data is normalized before saving to database
  test('normalizes an itinerary day before saving it', async () => {
    // Mock upsertDay to return the data that would be saved (third argument position)
    itineraryRepository.upsertDay.mockImplementation(async (...args) => args[3]);

    // Execute day update with messy input data containing whitespace and lowercase currency
    const result = await itineraryService.updateDay('trip-1', 2, 'user-1', {
      title: '  Explore Shibuya  ',      // Leading/trailing whitespace
      notes: '  Evening walk  ',         // Leading/trailing whitespace
      budget: { amount: '150', currency: 'jpy' },  // String amount, lowercase currency
      location: { name: '  Shibuya  ', country: '  Japan  ' },  // Whitespace in strings
    });

    // Verify all fields were properly normalized
    expect(result).toEqual(
      expect.objectContaining({
        title: 'Explore Shibuya',   // Whitespace trimmed
        notes: 'Evening walk',      // Whitespace trimmed
        budget: { amount: 150, currency: 'JPY' },  // Amount parsed to number, currency uppercase
        location: expect.objectContaining({ name: 'Shibuya', country: 'Japan' }),  // Trimmed
      })
    );
  });

  // Verify that item creation verifies trip ownership before proceeding
  test('creates an itinerary item only after checking trip ownership', async () => {
    // Mock createItem to return the input data (passthrough implementation)
    itineraryRepository.createItem.mockImplementation(async (data) => data);

    // Execute item creation with string amount and lowercase currency
    const result = await itineraryService.createItem('trip-1', 'user-1', {
      type: 'attraction',
      title: 'Tokyo Tower',
      priceEstimate: { amount: '40', currency: 'jpy' },  // Needs normalization
    });

    // Verify trip ownership was checked before item creation
    expect(tripRepository.findByIdAndUserId).toHaveBeenCalledWith('trip-1', 'user-1');
    // Verify returned item has correct ownership and normalized price data
    expect(result).toEqual(
      expect.objectContaining({
        tripId: 'trip-1',
        userId: 'user-1',
        priceEstimate: expect.objectContaining({
          amount: 40,
          currency: 'JPY',
        }),  // Normalized
      })
    );
  });

  test('shortens and shifts saved itinerary content with a changed date range', async () => {
    itineraryRepository.findDaysByTripId.mockResolvedValue([
      { dayNumber: 1 },
      { dayNumber: 2 },
      { dayNumber: 3 },
    ]);
    itineraryRepository.findItemsByTripId.mockResolvedValue([
      { _id: 'item-1', scheduledDate: new Date('2026-07-01T00:00:00.000Z') },
      { _id: 'item-3', scheduledDate: new Date('2026-07-03T00:00:00.000Z') },
    ]);

    await itineraryService.syncTripDateRange(
      {
        _id: 'trip-1',
        startDate: new Date('2026-07-01T00:00:00.000Z'),
      },
      {
        _id: 'trip-1',
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2026-08-11T00:00:00.000Z'),
      },
      'user-1'
    );

    expect(itineraryRepository.deleteDaysAfter).toHaveBeenCalledWith('trip-1', 'user-1', 2);
    expect(itineraryRepository.updateDayDate).toHaveBeenCalledTimes(2);
    expect(itineraryRepository.updateItemScheduledDate).toHaveBeenCalledWith(
      'item-1',
      'user-1',
      new Date('2026-08-10T00:00:00.000Z')
    );
    expect(itineraryRepository.deleteItemsByIds).toHaveBeenCalledWith(['item-3'], 'user-1');
  });

  // Verify that updating non-existent or unauthorized item throws appropriate error
  test('rejects updating a missing or unowned itinerary item', async () => {
    // Mock repository to return null (item not found or not owned by user)
    itineraryRepository.updateItemByIdAndUserId.mockResolvedValue(null);

    // Attempt to update item with non-owner user ID
    await expect(
      itineraryService.updateItem('item-1', 'other-user', { title: 'Changed' })
    ).rejects.toThrow('Itinerary item not found');
  });
});
