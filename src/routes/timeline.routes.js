const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timeline.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:entityType/:entityId', timelineController.getEntityTimeline);

module.exports = router;
