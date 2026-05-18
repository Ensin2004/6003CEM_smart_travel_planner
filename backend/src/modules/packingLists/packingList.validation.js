const { body, param } = require('express-validator');
const { priorityLevels } = require('./packingList.constants');

const objectIdRule = param('id').isMongoId().withMessage('Invalid packing list id');
const itemIdRule = param('itemId').isMongoId().withMessage('Invalid packing item id');
const templateIdRule = param('templateId').isMongoId().withMessage('Invalid packing template id');

const itemRules = (path = '') => [
  body(`${path}name`).trim().isLength({ min: 1, max: 120 }).withMessage('Item name is required'),
  body(`${path}category`).optional().trim().isLength({ min: 1, max: 80 }).withMessage('Category must be 80 characters or fewer'),
  body(`${path}priority`).optional().isIn(priorityLevels).withMessage('Invalid priority'),
  body(`${path}quantity`).optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be at least 1'),
  body(`${path}isPacked`).optional().isBoolean().withMessage('Packed status must be true or false'),
];

const createPackingListRules = [
  body('title').trim().isLength({ min: 1, max: 120 }).withMessage('Packing list title is required'),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('destination').trim().isLength({ min: 1, max: 120 }).withMessage('Destination is required'),
  body('tripStartDate').optional().isISO8601().withMessage('Trip start date must be valid'),
  body('tripEndDate').optional().isISO8601().withMessage('Trip end date must be valid'),
  body('templateKey').optional().trim().isLength({ min: 1, max: 60 }),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().trim().isLength({ min: 1, max: 80 }),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  body('items.*.isPacked').optional().isBoolean(),
  body('reminder.enabled').optional().isBoolean(),
  body('reminder.daysBeforeTrip').optional().isInt({ min: 0, max: 30 }),
];

const updatePackingListRules = [
  objectIdRule,
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('destination').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripStartDate').optional().isISO8601().withMessage('Trip start date must be valid'),
  body('tripEndDate').optional().isISO8601().withMessage('Trip end date must be valid'),
  body('templateKey').optional().trim().isLength({ min: 1, max: 60 }),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().trim().isLength({ min: 1, max: 80 }),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  body('items.*.isPacked').optional().isBoolean(),
  body('reminder.enabled').optional().isBoolean(),
  body('reminder.daysBeforeTrip').optional().isInt({ min: 0, max: 30 }),
];

const addItemRules = [
  objectIdRule,
  ...itemRules(),
];

const updateItemRules = [
  objectIdRule,
  itemIdRule,
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('category').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Category must be 80 characters or fewer'),
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

const createTemplateRules = [
  body('title').trim().isLength({ min: 1, max: 120 }).withMessage('Template title is required'),
  body('destination').optional().trim().isLength({ max: 120 }),
  body('description').optional().trim().isLength({ max: 180 }),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().trim().isLength({ min: 1, max: 80 }),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
];

const updateTemplateRules = [
  templateIdRule,
  ...createTemplateRules,
];

module.exports = {
  addItemRules,
  createTemplateRules,
  duplicatePackingListRules,
  objectIdRule,
  templateIdRule,
  updateItemRules,
  updatePackingListRules,
  updateTemplateRules,
  createPackingListRules,
};
