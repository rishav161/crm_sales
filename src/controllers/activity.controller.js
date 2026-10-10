const Activity = require('../models/Activity');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { logTimelineEvent } = require('../services/timeline.service');

/**
 * Build RBAC Scoped filter query for Activities
 */
const getActivityAccessFilter = (user, baseFilter = {}) => {
  if (user.role === 'Admin' || user.role === 'Sales Manager') {
    return baseFilter;
  }
  return {
    ...baseFilter,
    assignedTo: user._id,
  };
};

/**
 * Auto update pending activities to Overdue if due date has passed
 */
const updateOverdueActivitiesInQuery = async (filter) => {
  await Activity.updateMany(
    {
      ...filter,
      status: 'Pending',
      dueDate: { $lt: new Date() },
    },
    {
      $set: { status: 'Overdue' },
    }
  );
};

/**
 * @desc    Create a new activity/follow-up
 * @route   POST /api/v1/activities
 * @access  Protected
 */
const createActivity = catchAsync(async (req, res, next) => {
  const { type, title, description, assignedTo, dueDate, relatedEntity } = req.body;

  const due = new Date(dueDate);
  const isOverdueInitial = due < new Date();

  const activity = await Activity.create({
    type,
    title,
    description,
    assignedTo: assignedTo || req.user._id,
    dueDate: due,
    status: isOverdueInitial ? 'Overdue' : 'Pending',
    relatedEntity,
    createdBy: req.user._id,
  });

  // Log timeline event for entity if entity is Lead, Customer, or Deal
  if (['Lead', 'Customer', 'Deal'].includes(relatedEntity.entityType)) {
    await logTimelineEvent({
      action: 'Follow-up Created',
      entityType: relatedEntity.entityType,
      entityId: relatedEntity.entityId,
      performedBy: req.user._id,
      newValue: { type: activity.type, title: activity.title, dueDate: activity.dueDate },
    });
  }

  sendResponse(res, 201, 'Activity created successfully', { activity });
});

/**
 * @desc    Get activities with type, status, date filters, pagination & sorting
 * @route   GET /api/v1/activities
 * @access  Protected
 */
const getActivities = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const { type, status, entityType, entityId, assignedTo, startDate, endDate, sortBy, sortOrder } =
    req.query;

  let filter = {};

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (entityType && entityId) {
    filter['relatedEntity.entityType'] = entityType;
    filter['relatedEntity.entityId'] = entityId;
  }

  if (startDate || endDate) {
    filter.dueDate = {};
    if (startDate) filter.dueDate.$gte = new Date(startDate);
    if (endDate) filter.dueDate.$lte = new Date(endDate);
  }

  filter = getActivityAccessFilter(req.user, filter);

  // Sync overdue status before listing
  await updateOverdueActivitiesInQuery(filter);

  const sortField = sortBy || 'dueDate';
  const order = sortOrder === 'asc' ? 1 : -1;
  const sortOption = { [sortField]: order };

  const [activities, totalRecords] = await Promise.all([
    Activity.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Activity.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(totalRecords, page, limit);
  sendResponse(res, 200, 'Activities fetched successfully', { activities }, meta);
});

/**
 * @desc    Get Activity by ID
 * @route   GET /api/v1/activities/:id
 * @access  Protected
 */
const getActivityById = catchAsync(async (req, res, next) => {
  const filter = getActivityAccessFilter(req.user, { _id: req.params.id });
  const activity = await Activity.findOne(filter)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email');

  if (!activity) {
    return next(new AppError('Activity not found or access denied', 404));
  }

  // Update status if overdue
  activity.updateOverdueStatus();
  if (activity.isModified('status')) {
    await activity.save();
  }

  sendResponse(res, 200, 'Activity fetched successfully', { activity });
});

/**
 * @desc    Update Activity details
 * @route   PUT /api/v1/activities/:id
 * @access  Protected
 */
const updateActivity = catchAsync(async (req, res, next) => {
  const filter = getActivityAccessFilter(req.user, { _id: req.params.id });
  const activity = await Activity.findOne(filter);

  if (!activity) {
    return next(new AppError('Activity not found or access denied', 404));
  }

  const { type, title, description, assignedTo, dueDate, status } = req.body;

  if (type) activity.type = type;
  if (title) activity.title = title;
  if (description !== undefined) activity.description = description;
  if (assignedTo) activity.assignedTo = assignedTo;
  if (dueDate) {
    activity.dueDate = new Date(dueDate);
    if (activity.status === 'Pending' && activity.dueDate < new Date()) {
      activity.status = 'Overdue';
    }
  }
  if (status) {
    activity.status = status;
    if (status === 'Completed') {
      activity.completedDate = new Date();
    }
  }

  await activity.save();
  sendResponse(res, 200, 'Activity updated successfully', { activity });
});

/**
 * @desc    Mark Activity as completed
 * @route   PATCH /api/v1/activities/:id/complete
 * @access  Protected
 */
const markActivityCompleted = catchAsync(async (req, res, next) => {
  const filter = getActivityAccessFilter(req.user, { _id: req.params.id });
  const activity = await Activity.findOne(filter);

  if (!activity) {
    return next(new AppError('Activity not found or access denied', 404));
  }

  activity.status = 'Completed';
  activity.completedDate = new Date();
  await activity.save();

  if (['Lead', 'Customer', 'Deal'].includes(activity.relatedEntity.entityType)) {
    await logTimelineEvent({
      action: 'Follow-up Completed',
      entityType: activity.relatedEntity.entityType,
      entityId: activity.relatedEntity.entityId,
      performedBy: req.user._id,
      newValue: { type: activity.type, title: activity.title, completedDate: activity.completedDate },
    });
  }

  sendResponse(res, 200, 'Activity marked as completed', { activity });
});

/**
 * @desc    Delete Activity
 * @route   DELETE /api/v1/activities/:id
 * @access  Admin, Sales Manager
 */
const deleteActivity = catchAsync(async (req, res, next) => {
  const activity = await Activity.findByIdAndDelete(req.params.id);

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  sendResponse(res, 200, 'Activity deleted successfully');
});

module.exports = {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  markActivityCompleted,
  deleteActivity,
};
