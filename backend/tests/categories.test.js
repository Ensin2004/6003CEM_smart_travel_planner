// Mock the category repository to isolate service layer tests from database operations
jest.mock('../src/modules/categories/category.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByTypeAndValue: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const categoryRepository = require('../src/modules/categories/category.repository');
const categoryService = require('../src/modules/categories/category.service');

// Test group covers category CRUD operations including retrieval,
// creation with normalization, duplicate prevention, and update validation.
describe('Category management service', () => {
  // Reset all mock state before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verify that category listing returns only administrator-stored categories
  test('returns only categories stored by administrators', async () => {
    // Mock repository to return an empty array (no categories found)
    categoryRepository.findAll.mockResolvedValue([]);

    // Execute category retrieval
    const result = await categoryService.getCategories();

    // Verify repository was called exactly once to fetch all categories
    expect(categoryRepository.findAll).toHaveBeenCalledTimes(1);
    // Verify service returns the categories array (empty in this case)
    expect(result).toEqual([]);
  });

  // Verify that category creation normalizes input data before storage
  test('creates a normalized category', async () => {
    // Mock repository to indicate no existing duplicate category
    categoryRepository.findByTypeAndValue.mockResolvedValue(null);
    // Mock repository to return the input data (passthrough implementation)
    categoryRepository.create.mockImplementation(async (data) => data);

    // Execute category creation with messy input containing whitespace and special characters
    const result = await categoryService.createCategory({
      type: 'food',
      name: '  Coffee / Dessert  ',  // Leading/trailing whitespace and slashes
    });

    // Verify returned category has normalized fields
    expect(result).toEqual({
      type: 'food',
      name: 'Coffee / Dessert',       // Whitespace trimmed
      value: 'coffee dessert',        // Lowercase slugified version for lookups
    });
  });

  // Verify that duplicate categories within the same type are rejected
  test('rejects duplicate categories within the same type', async () => {
    // Mock repository to return an existing category (duplicate found)
    categoryRepository.findByTypeAndValue.mockResolvedValue({ id: 'existing' });

    // Attempt to create category that already exists in the same type
    await expect(
      categoryService.createCategory({ type: 'attraction', name: 'Museums' })
    ).rejects.toThrow('already exists');
  });

  // Verify that updating a non-existent category throws appropriate error
  test('rejects updating a category that does not exist', async () => {
    // Mock repository to return null (category not found)
    categoryRepository.findById.mockResolvedValue(null);

    // Attempt to update a category with an ID that doesn't exist
    await expect(
      categoryService.updateCategory('missing', { type: 'hotel', name: 'Suite' })
    ).rejects.toThrow('Category not found');
  });
});