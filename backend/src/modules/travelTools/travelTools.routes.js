const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const travelToolsController = require('./travelTools.controller');
const {
  addItemRules,
  createPackingListRules,
  createTemplateRules,
  duplicatePackingListRules,
  objectIdRule,
  templateIdRule,
  updateItemRules,
  updatePackingListRules,
  updateTemplateRules,
} = require('./travelTools.validation');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Packing Lists
 *   description: User packing checklist management
 *
 * /packing-lists/templates:
 *   get:
 *     summary: Get ready-made packing list templates
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Packing list templates returned
 *
 * /packing-lists:
 *   get:
 *     summary: Get the authenticated user's packing lists
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Packing lists returned
 *       401:
 *         description: Missing or invalid token
 *   post:
 *     summary: Create a packing list manually or from a template
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Japan spring trip
 *               tripId:
 *                 type: string
 *               destination:
 *                 type: string
 *                 example: Tokyo
 *               templateKey:
 *                 type: string
 *                 example: overseas-trip
 *               reminder:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   daysBeforeTrip:
 *                     type: integer
 *                     example: 2
 *     responses:
 *       201:
 *         description: Packing list created
 *       400:
 *         description: Validation error
 *
 * /packing-lists/{id}:
 *   get:
 *     summary: Get one packing list owned by the authenticated user
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing list returned
 *       404:
 *         description: Packing list not found
 *   patch:
 *     summary: Update packing list metadata or reminder settings
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing list updated
 *   delete:
 *     summary: Delete a packing list
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Packing list deleted
 *
 * /packing-lists/{id}/duplicate:
 *   post:
 *     summary: Duplicate a previous packing list for another trip
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Packing list duplicated
 *
 * /packing-lists/{id}/items:
 *   post:
 *     summary: Add an item to a packing list
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Passport
 *               category:
 *                 type: string
 *                 example: documents
 *               priority:
 *                 type: string
 *                 example: High
 *               quantity:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Packing item added
 *
 * /packing-lists/{id}/items/{itemId}:
 *   patch:
 *     summary: Edit an item or tick it packed or unpacked
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing item updated
 *   delete:
 *     summary: Remove an item from a packing list
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing item deleted
 */
router.get('/documents', travelToolsController.getTravelDocuments);
router.get('/document-templates', travelToolsController.getDocumentTemplates);

router.get('/templates', travelToolsController.getTemplates);
router.post('/templates', createTemplateRules, validate, travelToolsController.createTemplate);
router
  .route('/templates/:templateId')
  .patch(updateTemplateRules, validate, travelToolsController.updateTemplate)
  .delete(templateIdRule, validate, travelToolsController.deleteTemplate);

router
  .route('/')
  .get(travelToolsController.getMyPackingLists)
  .post(createPackingListRules, validate, travelToolsController.createPackingList);

router.post('/:id/duplicate', duplicatePackingListRules, validate, travelToolsController.duplicatePackingList);
router.post('/:id/items', addItemRules, validate, travelToolsController.addItem);

router
  .route('/:id/items/:itemId')
  .patch(updateItemRules, validate, travelToolsController.updateItem)
  .delete(updateItemRules.slice(0, 2), validate, travelToolsController.deleteItem);

router
  .route('/:id')
  .get(objectIdRule, validate, travelToolsController.getPackingList)
  .patch(updatePackingListRules, validate, travelToolsController.updatePackingList)
  .delete(objectIdRule, validate, travelToolsController.deletePackingList);

module.exports = router;
