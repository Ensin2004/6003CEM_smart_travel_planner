const { body, param } = require('express-validator');
const { packingCategories, priorityLevels } = require('./packingList.constants');

const objectIdRule = param('id').isMongoId().withMessage('Invalid packing list id');
const itemIdRule = param('itemId').isMongoId().withMessage('Invalid packing item id');

const itemRules = (path = '') => [
  body(`${path}name`).trim().isLength({ min: 1, max: 120 }).withMessage('Item name is required'),
  body(`${path}category`).optional().isIn(packingCategories).withMessage('Invalid category'),
  body(`${path}priority`).optional().isIn(priorityLevels).withMessage('Invalid priority'),
  body(`${path}quantity`).optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be at least 1'),
  body(`${path}isPacked`).optional().isBoolean().withMessage('Packed status must be true or false'),
];

const createPackingListRules = [
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('destination').optional().trim().isLength({ max: 120 }),
  body('tripStartDate').optional().isISO8601().withMessage('Trip start date must be valid'),
  body('tripEndDate').optional().isISO8601().withMessage('Trip end date must be valid'),
  body('templateKey').optional().trim().isLength({ min: 1, max: 60 }),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().isIn(packingCategories),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  body('items.*.isPacked').optional().isBoolean(),
  body('reminder.enabled').optional().isBoolean(),
  body('reminder.daysBeforeTrip').optional().isInt({ min: 0, max: 30 }),
];

const updatePackingListRules = [
  objectIdRule,
  ...createPackingListRules,
];

const addItemRules = [
  objectIdRule,
  ...itemRules(),
];

const updateItemRules = [
  objectIdRule,
  itemIdRule,
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('category').optional().isIn(packingCategories).withMessage('Invalid category'),
  body('priority').optional().isIn(priorityLevels).withMessage('Invalid priority'),
  body('quantity').optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be at least 1'),
  body('isPacked').optional().isBoolean().withMessage('Packed status must be true or false'),
];

const duplicatePackingListRules = [
  objectIdRule,
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('destination').optional().trim().isLength({ max: 120 }),
  body('tripStartDate').optional().isISO8601(),
  body('tripEndDate').optional().isISO8601(),
];

module.exports = {
  addItemRules,
  duplicatePackingListRules,
  objectIdRule,
  updateItemRules,
  updatePackingListRules,
  createPackingListRules,
};
