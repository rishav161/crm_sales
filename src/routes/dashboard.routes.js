const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/pipeline', dashboardController.getSalesPipeline);
router.get(
  '/team-performance',
  restrictTo('Admin', 'Sales Manager'),
  dashboardController.getTeamPerformance
);

module.exports = router;
