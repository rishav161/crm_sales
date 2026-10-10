const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { logTimelineEvent } = require('../services/timeline.service');

/**
 * Build RBAC Scoped filter query for Deals
 */
const getDealAccessFilter = (user, baseFilter = {}) => {
  if (user.role === 'Admin' || user.role === 'Sales Manager') {
    return baseFilter;
  }
  return {
    ...baseFilter,
    assignedTo: user._id,
  };
};

/**
 * @desc    Create a new Deal
 * @route   POST /api/v1/deals
 * @access  Protected
 */
const createDeal = catchAsync(async (req, res, next) => {
  const {
    title,
    leadId,
    customerId,
    assignedTo,
    value,
    probability,
    expectedClosingDate,
    stage,
    description,
    lostReason,
  } = req.body;

  // Check customer existence
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return next(new AppError('Linked customer does not exist', 400));
  }

  const finalStage = stage || 'Qualification';

  if (finalStage === 'Lost' && (!lostReason || !lostReason.trim())) {
    return next(new AppError('Lost reason is required when deal is created as Lost', 400));
  }

  const deal = await Deal.create({
    title,
    leadId: leadId || null,
    customerId,
    assignedTo: assignedTo || req.user._id,
    value,
    probability: probability !== undefined ? probability : 50,
    expectedClosingDate,
    stage: finalStage,
    description,
    lostReason: finalStage === 'Lost' ? lostReason : '',
    createdBy: req.user._id,
  });

  await logTimelineEvent({
    action: 'Deal Created',
    entityType: 'Deal',
    entityId: deal._id,
    performedBy: req.user._id,
    newValue: { title: deal.title, value: deal.value, stage: deal.stage },
  });

  sendResponse(res, 201, 'Deal created successfully', { deal });
});

/**
 * @desc    Get deals with stage, amount, closing date filters, search, pagination & sorting
 * @route   GET /api/v1/deals
 * @access  Protected
 */
const getDeals = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const {
    search,
    stage,
    assignedTo,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = req.query;

  let filter = {};

  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  if (stage) filter.stage = stage;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (minAmount || maxAmount) {
    filter.value = {};
    if (minAmount) filter.value.$gte = Number(minAmount);
    if (maxAmount) filter.value.$lte = Number(maxAmount);
  }

  if (startDate || endDate) {
    filter.expectedClosingDate = {};
    if (startDate) filter.expectedClosingDate.$gte = new Date(startDate);
    if (endDate) filter.expectedClosingDate.$lte = new Date(endDate);
  }

  filter = getDealAccessFilter(req.user, filter);

  const sortField = sortBy || 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;
  const sortOption = { [sortField]: order };

  const [deals, totalRecords] = await Promise.all([
    Deal.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('customerId', 'name email company')
      .populate('leadId', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Deal.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(totalRecords, page, limit);
  sendResponse(res, 200, 'Deals fetched successfully', { deals }, meta);
});

/**
 * @desc    Get single Deal by ID
 * @route   GET /api/v1/deals/:id
 * @access  Protected
 */
const getDealById = catchAsync(async (req, res, next) => {
  const filter = getDealAccessFilter(req.user, { _id: req.params.id });

  const deal = await Deal.findOne(filter)
    .populate('assignedTo', 'name email role phone')
    .populate('customerId', 'name email company phone')
    .populate('leadId', 'name email source');

  if (!deal) {
    return next(new AppError('Deal not found or access denied', 404));
  }

  sendResponse(res, 200, 'Deal fetched successfully', { deal });
});

/**
 * @desc    Update Deal details
 * @route   PUT /api/v1/deals/:id
 * @access  Protected
 */
const updateDeal = catchAsync(async (req, res, next) => {
  const filter = getDealAccessFilter(req.user, { _id: req.params.id });
  const deal = await Deal.findOne(filter);

  if (!deal) {
    return next(new AppError('Deal not found or access denied', 404));
  }

  const { title, value, probability, expectedClosingDate, description } = req.body;

  // Business Rule: Closed deals cannot freely have their monetary value changed without reopening
  if ((deal.stage === 'Won' || deal.stage === 'Lost') && value !== undefined && value !== deal.value) {
    if (req.user.role !== 'Admin') {
      return next(new AppError('Only Admins can modify financial details of closed deals', 403));
    }
  }

  if (title) deal.title = title;
  if (value !== undefined) deal.value = value;
  if (probability !== undefined) deal.probability = probability;
  if (expectedClosingDate) deal.expectedClosingDate = expectedClosingDate;
  if (description !== undefined) deal.description = description;

  await deal.save();

  sendResponse(res, 200, 'Deal updated successfully', { deal });
});

/**
 * @desc    Update Deal Stage enforcing business rules
 * @route   PATCH /api/v1/deals/:id/stage
 * @access  Protected
 */
const updateDealStage = catchAsync(async (req, res, next) => {
  const filter = getDealAccessFilter(req.user, { _id: req.params.id });
  const deal = await Deal.findOne(filter);

  if (!deal) {
    return next(new AppError('Deal not found or access denied', 404));
  }

  const { stage, lostReason } = req.body;
  const oldStage = deal.stage;

  // Business Rule: Closed Won / Lost deals cannot freely move back to active stages unless Admin
  if ((oldStage === 'Won' || oldStage === 'Lost') && stage !== oldStage) {
    if (req.user.role !== 'Admin') {
      return next(
        new AppError(`Closed deal in stage '${oldStage}' cannot be reopened by non-admin users`, 403)
      );
    }
  }

  // Business Rule: Lost deal MUST contain a lost reason
  if (stage === 'Lost') {
    if (!lostReason || !lostReason.trim()) {
      return next(new AppError('A valid lost reason is required when marking a deal as Lost', 400));
    }
    deal.lostReason = lostReason;
    deal.probability = 0;
  }

  // Business Rule: Won deal sets probability to 100%
  if (stage === 'Won') {
    deal.probability = 100;
  }

  deal.stage = stage;
  await deal.save();

  // Audit event logging
  let actionName = 'Deal Stage Changed';
  if (stage === 'Won') actionName = 'Deal Won';
  if (stage === 'Lost') actionName = 'Deal Lost';

  await logTimelineEvent({
    action: actionName,
    entityType: 'Deal',
    entityId: deal._id,
    performedBy: req.user._id,
    previousValue: oldStage,
    newValue: stage,
    metadata: stage === 'Lost' ? { lostReason } : {},
  });

  sendResponse(res, 200, `Deal stage updated to ${stage}`, { deal });
});

/**
 * @desc    Delete Deal
 * @route   DELETE /api/v1/deals/:id
 * @access  Admin, Sales Manager
 */
const deleteDeal = catchAsync(async (req, res, next) => {
  const deal = await Deal.findByIdAndDelete(req.params.id);

  if (!deal) {
    return next(new AppError('Deal not found', 404));
  }

  sendResponse(res, 200, 'Deal deleted successfully');
});

module.exports = {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  updateDealStage,
  deleteDeal,
};
