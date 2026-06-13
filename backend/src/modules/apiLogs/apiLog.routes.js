/**
 * Api Logs module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const apiLogController = require('./apiLog.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { listLogRules } = require('./apiLog.validation');

const router = express.Router();

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use(protect, restrictTo('admin'));

/**
 * @swagger
 * /api-logs:
 *   get:
 *     summary: List admin API logs
 *     tags:
 *       - API Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, fail, error]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [api, system, auth, rate-limit]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, error, critical]
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *       - in: query
 *         name: errorCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Recent logs returned
 *       400:
 *         description: Invalid query
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 */
//  route wires  to validation, access checks, and controller logic.
router.get('/', listLogRules, validate, apiLogController.getLogs);

/**
 * @swagger
 * /api-logs/monitoring:
 *   get:
 *     summary: Get logging and monitoring summary
 *     tags:
 *       - API Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, fail, error]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [api, system, auth, rate-limit]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, error, critical]
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *       - in: query
 *         name: errorCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Monitoring summary and logs returned
 *       400:
 *         description: Invalid query
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 */
//  route wires  to validation, access checks, and controller logic.
router.get('/monitoring', listLogRules, validate, apiLogController.getMonitoring);
module.exports = router;
