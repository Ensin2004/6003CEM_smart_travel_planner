const express = require('express');
const apiLogController = require('./apiLog.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');

const router = express.Router();

router.get('/', protect, restrictTo('admin'), apiLogController.getLogs);

module.exports = router;
