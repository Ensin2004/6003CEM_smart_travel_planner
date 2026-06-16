/**
 * Api Logs module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const apiLogService = require('./apiLog.service');

/**
 * Retrieves recent API logs with optional filtering and pagination.
 * Fetches log entries for administrative review and debugging.
 * 
 * @param {Object} req - Express request object with query parameters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with logs array
 */
const getLogs = catchAsync(async (req, res) => {
  const logs = await apiLogService.getRecentLogs(req.query);
  sendSuccess(res, 200, { logs });
});

/**
 * Retrieves system monitoring metrics and health indicators.
 * Aggregates API performance, error rates, and operational statistics.
 * 
 * @param {Object} req - Express request object with query parameters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with monitoring data
 */
const getMonitoring = catchAsync(async (req, res) => {
  const monitoring = await apiLogService.getMonitoring(req.query);
  sendSuccess(res, 200, monitoring);
});

module.exports = { getLogs, getMonitoring };