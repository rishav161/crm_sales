const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema, updateStatusSchema } = require('../validators/user.validator');

router.use(protect);

router
  .route('/')
  .post(restrictTo('Admin'), validate(createUserSchema), userController.createUser)
  .get(restrictTo('Admin', 'Sales Manager'), userController.getUsers);

router
  .route('/:id')
  .get(restrictTo('Admin', 'Sales Manager'), userController.getUserById)
  .put(restrictTo('Admin'), validate(updateUserSchema), userController.updateUser)
  .delete(restrictTo('Admin'), userController.deleteUser);

router.patch(
  '/:id/status',
  restrictTo('Admin'),
  validate(updateStatusSchema),
  userController.updateUserStatus
);

module.exports = router;
