const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createActivitySchema,
  updateActivitySchema,
} = require('../validators/activity.validator');

router.use(protect);

router
  .route('/')
  .post(validate(createActivitySchema), activityController.createActivity)
  .get(activityController.getActivities);

router
  .route('/:id')
  .get(activityController.getActivityById)
  .put(validate(updateActivitySchema), activityController.updateActivity)
  .delete(restrictTo('Admin', 'Sales Manager'), activityController.deleteActivity);

router.patch('/:id/complete', activityController.markActivityCompleted);

module.exports = router;
