const express = require('express');
const { param } = require('express-validator');
const adminController = require('./admin.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();
const objectIdRule = param('id').isMongoId().withMessage('Invalid user id');

router.use(protect, restrictTo('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.delete('/users/:id', objectIdRule, validate, adminController.removeUser);

module.exports = router;
