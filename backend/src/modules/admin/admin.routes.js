const express = require('express');
const adminController = require('./admin.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');

const router = express.Router();

router.get('/dashboard', protect, restrictTo('admin'), adminController.getDashboard);

module.exports = router;
