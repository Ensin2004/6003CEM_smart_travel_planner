// Mock the favorite repository to isolate service layer tests from database operations
jest.mock('../src/modules/favorites/favorite.repository', () => ({
  create: jest.fn(),
  deleteByIdAndUserId: jest.fn(),
  findByUserId: jest.fn(),
  findByUserIdTypeAndExternalId: jest.fn(),
  findExisting: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const favoriteRepository = require('../src/modules/favorites/favorite.repository');
const favoriteService = require('../src/modules/favorites/favorite.service');

// Test group covers CRUD operations for user favorites including listing,
// creation with GeoJSON normalization, duplicate prevention, and deletion.
describe('Favorites service', () => {
  // Reset all mock state before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verify that favorite listing only returns favorites belonging to the requesting user
  test('lists only favorites belonging to the authenticated user', async () => {
    // Mock repository to return an array with a single favorite for the user
    favoriteRepository.findByUserId.mockResolvedValue([{ id: 'favorite-1' }]);

    // Verify service resolves with the user-specific favorites
    await expect(favoriteService.listFavorites('user-1')).resolves.toEqual([
      { id: 'favorite-1' },
    ]);
    // Verify repository was called with correct user ID filter
    expect(favoriteRepository.findByUserId).toHaveBeenCalledWith('user-1');
  });

  // Verify that favorite creation normalizes GeoJSON coordinates from string inputs
  test('creates a favorite with normalized GeoJSON coordinates', async () => {
    // Mock repository to indicate no existing duplicate favorite
    favoriteRepository.findExisting.mockResolvedValue(null);
    // Mock repository to return the input data (create implementation passthrough)
    favoriteRepository.create.mockImplementation(async (data) => data);

    // Execute add operation with string coordinate values (not numbers)
    const result = await favoriteService.addFavorite('user-1', {
      type: 'attraction',
      title: 'National Museum',
      address: 'Kuala Lumpur',
      coordinates: { latitude: '3.1379', longitude: '101.6897' }, // String inputs
    });

    // Verify coordinates were normalized to proper GeoJSON Point format
    expect(result.location.coordinates).toEqual({
      type: 'Point',
      coordinates: [101.6897, 3.1379], // Longitude first, then latitude (GeoJSON standard)
    });
    // Verify the favorite is associated with the correct user
    expect(result.userId).toBe('user-1');
  });

  // Verify that duplicate favorites return existing record instead of creating new one
  test('returns an existing favorite instead of creating a duplicate', async () => {
    // Define existing favorite that would be a duplicate
    const existing = { id: 'favorite-1', title: 'National Museum' };
    // Mock repository to return existing favorite when checking for duplicates
    favoriteRepository.findExisting.mockResolvedValue(existing);

    // Attempt to add the same favorite again
    await expect(
      favoriteService.addFavorite('user-1', {
        type: 'attraction',
        title: 'National Museum',
      })
    ).resolves.toBe(existing); // Verify existing favorite is returned
    // Verify no new creation attempt was made
    expect(favoriteRepository.create).not.toHaveBeenCalled();
  });

  // Verify that deletion requires both favorite ID and owner ID for access control
  test('removes a favorite using both favorite ID and owner ID', async () => {
    // Mock repository to return deleted favorite on successful deletion
    favoriteRepository.deleteByIdAndUserId.mockResolvedValue({ id: 'favorite-1' });

    // Execute removal operation
    await favoriteService.removeFavorite('user-1', 'favorite-1');

    // Verify repository received both identifiers for ownership validation
    expect(favoriteRepository.deleteByIdAndUserId).toHaveBeenCalledWith(
      'favorite-1',
      'user-1'
    );
  });

  // Verify that deleting non-existent or unauthorized favorite throws appropriate error
  test('rejects removing a missing or unowned favorite', async () => {
    // Mock repository to return null (favorite not found or not owned by user)
    favoriteRepository.deleteByIdAndUserId.mockResolvedValue(null);

    // Attempt deletion with mismatched user ID
    await expect(
      favoriteService.removeFavorite('other-user', 'favorite-1')
    ).rejects.toThrow('Favorite not found');
  });
});