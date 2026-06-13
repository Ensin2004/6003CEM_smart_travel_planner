jest.mock('../src/modules/categories/category.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByTypeAndValue: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
}));

const categoryRepository = require('../src/modules/categories/category.repository');
const categoryService = require('../src/modules/categories/category.service');

describe('Category management service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns only categories stored by administrators', async () => {
    categoryRepository.findAll.mockResolvedValue([]);

    const result = await categoryService.getCategories();

    expect(categoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  test('creates a normalized category', async () => {
    categoryRepository.findByTypeAndValue.mockResolvedValue(null);
    categoryRepository.create.mockImplementation(async (data) => data);

    const result = await categoryService.createCategory({
      type: 'food',
      name: '  Coffee / Dessert  ',
    });

    expect(result).toEqual({
      type: 'food',
      name: 'Coffee / Dessert',
      value: 'coffee dessert',
    });
  });

  test('rejects duplicate categories within the same type', async () => {
    categoryRepository.findByTypeAndValue.mockResolvedValue({ id: 'existing' });

    await expect(
      categoryService.createCategory({ type: 'attraction', name: 'Museums' })
    ).rejects.toThrow('already exists');
  });

  test('rejects updating a category that does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      categoryService.updateCategory('missing', { type: 'hotel', name: 'Suite' })
    ).rejects.toThrow('Category not found');
  });
});
