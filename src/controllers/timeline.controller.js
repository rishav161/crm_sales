const Timeline = require('../models/Timeline');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

/**
 * @desc    Get timeline history for a specific Lead, Customer, or Deal
 * @route   GET /api/v1/timeline/:entityType/:entityId
 * @access  Protected
 */
const getEntityTimeline = catchAsync(async (req, res, next) => {
  const { entityType, entityId } = req.params;

  if (!['Lead', 'Customer', 'Deal'].includes(entityType)) {
    return next(new AppError("Invalid entityType. Must be 'Lead', 'Customer', or 'Deal'", 400));
  }

  const { page, limit, skip } = getPagination(req.query);

  const filter = {
    entityType,
    entityId,
  };

  const [timeline, totalRecords] = await Promise.all([
    Timeline.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    Timeline.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(totalRecords, page, limit);

  sendResponse(res, 200, `Timeline history for ${entityType} fetched successfully`, { timeline }, meta);
});

module.exports = {
  getEntityTimeline,
};
