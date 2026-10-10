const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { logTimelineEvent } = require('../services/timeline.service');

/**
 * Build RBAC Scoped filter query for Lead model
 */
const getLeadAccessFilter = (user, baseFilter = {}) => {
  if (user.role === 'Admin' || user.role === 'Sales Manager') {
    return baseFilter;
  }
  // Sales Executive can only access assigned leads
  return {
    ...baseFilter,
    assignedTo: user._id,
  };
};

/**
 * @desc    Create a new Lead
 * @route   POST /api/v1/leads
 * @access  Admin, Sales Manager, Sales Executive
 */
const createLead = catchAsync(async (req, res, next) => {
  const { name, email, phone, company, source, status, priority, assignedTo, description } = req.body;

  // Validate assigned user if provided
  let assignedUserObj = null;
  if (assignedTo) {
    assignedUserObj = await User.findById(assignedTo);
    if (!assignedUserObj || !assignedUserObj.isActive) {
      return next(new AppError('Assigned user does not exist or is inactive', 400));
    }
  }

  // If created by Sales Executive, automatically assign to self if not specified
  const finalAssignedTo = assignedTo || (req.user.role === 'Sales Executive' ? req.user._id : null);

  const lead = await Lead.create({
    name,
    email,
    phone,
    company,
    source,
    status: status || 'New',
    priority: priority || 'Medium',
    assignedTo: finalAssignedTo,
    description,
    createdBy: req.user._id,
  });

  // Log to Timeline
  await logTimelineEvent({
    action: 'Lead Created',
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: req.user._id,
    newValue: { name: lead.name, email: lead.email, status: lead.status },
  });

  if (finalAssignedTo) {
    await logTimelineEvent({
      action: 'Lead Assigned',
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: req.user._id,
      newValue: { assignedTo: finalAssignedTo },
    });
  }

  sendResponse(res, 201, 'Lead created successfully', { lead });
});

/**
 * @desc    Get all leads with pagination, search, filtering & sorting
 * @route   GET /api/v1/leads
 * @access  Protected (Scoped by Role)
 */
const getLeads = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const {
    search,
    status,
    priority,
    source,
    assignedTo,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = req.query;

  // Base filter
  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;

  // Date range filtering
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Apply RBAC restriction
  filter = getLeadAccessFilter(req.user, filter);

  // Sorting
  const sortField = sortBy || 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;
  const sortOption = { [sortField]: order };

  const [leads, totalRecords] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(totalRecords, page, limit);
  sendResponse(res, 200, 'Leads fetched successfully', { leads }, meta);
});

/**
 * @desc    Get single Lead by ID
 * @route   GET /api/v1/leads/:id
 * @access  Protected (Scoped by Role)
 */
const getLeadById = catchAsync(async (req, res, next) => {
  const filter = getLeadAccessFilter(req.user, { _id: req.params.id });

  const lead = await Lead.findOne(filter)
    .populate('assignedTo', 'name email role phone')
    .populate('createdBy', 'name email');

  if (!lead) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  sendResponse(res, 200, 'Lead fetched successfully', { lead });
});

/**
 * @desc    Update Lead details
 * @route   PUT /api/v1/leads/:id
 * @access  Protected (Scoped by Role)
 */
const updateLead = catchAsync(async (req, res, next) => {
  const filter = getLeadAccessFilter(req.user, { _id: req.params.id });
  const lead = await Lead.findOne(filter);

  if (!lead) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  if (lead.status === 'Converted') {
    return next(new AppError('Converted lead cannot be modified', 400));
  }

  const { name, email, phone, company, source, priority, description } = req.body;
  const prevData = { name: lead.name, email: lead.email, priority: lead.priority };

  if (name) lead.name = name;
  if (email) lead.email = email;
  if (phone !== undefined) lead.phone = phone;
  if (company !== undefined) lead.company = company;
  if (source) lead.source = source;
  if (priority) {
    if (lead.priority !== priority) {
      await logTimelineEvent({
        action: 'Lead Priority Changed',
        entityType: 'Lead',
        entityId: lead._id,
        performedBy: req.user._id,
        previousValue: lead.priority,
        newValue: priority,
      });
    }
    lead.priority = priority;
  }
  if (description !== undefined) lead.description = description;

  await lead.save();

  sendResponse(res, 200, 'Lead updated successfully', { lead });
});

/**
 * @desc    Update Lead status
 * @route   PATCH /api/v1/leads/:id/status
 * @access  Protected
 */
const updateLeadStatus = catchAsync(async (req, res, next) => {
  const filter = getLeadAccessFilter(req.user, { _id: req.params.id });
  const lead = await Lead.findOne(filter);

  if (!lead) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  if (lead.status === 'Converted') {
    return next(new AppError('Converted lead status cannot be updated', 400));
  }

  const { status } = req.body;
  const oldStatus = lead.status;

  lead.status = status;
  await lead.save();

  await logTimelineEvent({
    action: 'Lead Status Changed',
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: req.user._id,
    previousValue: oldStatus,
    newValue: status,
  });

  sendResponse(res, 200, 'Lead status updated successfully', { lead });
});

/**
 * @desc    Assign or reassign Lead
 * @route   PATCH /api/v1/leads/:id/assign
 * @access  Admin, Sales Manager
 */
const assignLead = catchAsync(async (req, res, next) => {
  const { assignedTo } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return next(new AppError('Lead not found', 404));
  }

  // Verify target user is active
  const targetUser = await User.findById(assignedTo);
  if (!targetUser || !targetUser.isActive) {
    return next(new AppError('Target user is invalid or inactive', 400));
  }

  const prevAssignedTo = lead.assignedTo;
  lead.assignedTo = assignedTo;
  await lead.save();

  await logTimelineEvent({
    action: prevAssignedTo ? 'Lead Reassigned' : 'Lead Assigned',
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: req.user._id,
    previousValue: prevAssignedTo,
    newValue: assignedTo,
  });

  sendResponse(res, 200, 'Lead assigned successfully', { lead });
});

/**
 * @desc    Convert a Qualified Lead into Customer and Deal (Atomic Transaction)
 * @route   POST /api/v1/leads/:id/convert
 * @access  Admin, Sales Manager, Sales Executive (assigned)
 */
const convertLead = catchAsync(async (req, res, next) => {
  const filter = getLeadAccessFilter(req.user, { _id: req.params.id });
  const lead = await Lead.findOne(filter);

  if (!lead) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  if (lead.status === 'Converted') {
    return next(new AppError('Lead has already been converted', 400));
  }

  const { dealTitle, dealValue, probability, expectedClosingDate, dealDescription } = req.body;

  // Execute in Mongoose Session for database transaction safety
  const session = await mongoose.startSession();
  let customer, deal;

  try {
    session.startTransaction();

    // 1. Create Customer
    const customerArray = await Customer.create(
      [
        {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          leadId: lead._id,
          assignedTo: lead.assignedTo || req.user._id,
          createdBy: req.user._id,
        },
      ],
      { session }
    );
    customer = customerArray[0];

    // 2. Create Deal
    const closingDate = expectedClosingDate
      ? new Date(expectedClosingDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    const dealArray = await Deal.create(
      [
        {
          title: dealTitle || `${lead.company || lead.name} - Deal`,
          leadId: lead._id,
          customerId: customer._id,
          assignedTo: lead.assignedTo || req.user._id,
          value: dealValue || 1000,
          probability: probability || 50,
          expectedClosingDate: closingDate,
          stage: 'Qualification',
          description: dealDescription || `Converted from lead: ${lead.name}`,
          createdBy: req.user._id,
        },
      ],
      { session }
    );
    deal = dealArray[0];

    // 3. Mark Lead as Converted
    lead.status = 'Converted';
    await lead.save({ session });

    // 4. Record Timeline Events
    await logTimelineEvent({
      action: 'Lead Converted',
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: req.user._id,
      newValue: { customerId: customer._id, dealId: deal._id },
      session,
    });

    await logTimelineEvent({
      action: 'Customer Created',
      entityType: 'Customer',
      entityId: customer._id,
      performedBy: req.user._id,
      newValue: { name: customer.name },
      session,
    });

    await logTimelineEvent({
      action: 'Deal Created',
      entityType: 'Deal',
      entityId: deal._id,
      performedBy: req.user._id,
      newValue: { title: deal.title, value: deal.value },
      session,
    });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    // Fallback if standalone MongoDB without replica set transaction support
    if (err.message && err.message.includes('Transaction numbers are only allowed')) {
      return convertLeadWithoutTransaction(req, res, next, lead);
    }
    return next(err);
  }

  sendResponse(res, 200, 'Lead converted to Customer and Deal successfully', {
    lead,
    customer,
    deal,
  });
});

/**
 * Fallback conversion implementation for single-node standalone MongoDB
 */
const convertLeadWithoutTransaction = async (req, res, next, lead) => {
  const { dealTitle, dealValue, probability, expectedClosingDate, dealDescription } = req.body;

  const customer = await Customer.create({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    leadId: lead._id,
    assignedTo: lead.assignedTo || req.user._id,
    createdBy: req.user._id,
  });

  const closingDate = expectedClosingDate
    ? new Date(expectedClosingDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const deal = await Deal.create({
    title: dealTitle || `${lead.company || lead.name} - Deal`,
    leadId: lead._id,
    customerId: customer._id,
    assignedTo: lead.assignedTo || req.user._id,
    value: dealValue || 1000,
    probability: probability || 50,
    expectedClosingDate: closingDate,
    stage: 'Qualification',
    description: dealDescription || `Converted from lead: ${lead.name}`,
    createdBy: req.user._id,
  });

  lead.status = 'Converted';
  await lead.save();

  await logTimelineEvent({
    action: 'Lead Converted',
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: req.user._id,
    newValue: { customerId: customer._id, dealId: deal._id },
  });

  sendResponse(res, 200, 'Lead converted to Customer and Deal successfully', {
    lead,
    customer,
    deal,
  });
};

/**
 * @desc    Delete a Lead
 * @route   DELETE /api/v1/leads/:id
 * @access  Admin, Sales Manager
 */
const deleteLead = catchAsync(async (req, res, next) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) {
    return next(new AppError('Lead not found', 404));
  }
  sendResponse(res, 200, 'Lead deleted successfully');
});

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  assignLead,
  convertLead,
  deleteLead,
};
