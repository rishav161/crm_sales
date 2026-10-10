const Customer = require('../models/Customer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

/**
 * Build RBAC Scoped filter query for Customer
 */
const getCustomerAccessFilter = (user, baseFilter = {}) => {
  if (user.role === 'Admin' || user.role === 'Sales Manager') {
    return baseFilter;
  }
  return {
    ...baseFilter,
    assignedTo: user._id,
  };
};

/**
 * @desc    Create a new Customer
 * @route   POST /api/v1/customers
 * @access  Protected
 */
const createCustomer = catchAsync(async (req, res, next) => {
  const { name, email, phone, company, address, leadId, assignedTo, status } = req.body;

  const customer = await Customer.create({
    name,
    email,
    phone,
    company,
    address,
    leadId: leadId || null,
    assignedTo: assignedTo || req.user._id,
    status: status || 'Active',
    createdBy: req.user._id,
  });

  sendResponse(res, 201, 'Customer created successfully', { customer });
});

/**
 * @desc    Get all customers with search, filtering, pagination & sorting
 * @route   GET /api/v1/customers
 * @access  Protected
 */
const getCustomers = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, status, assignedTo, startDate, endDate, sortBy, sortOrder } = req.query;

  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  filter = getCustomerAccessFilter(req.user, filter);

  const sortField = sortBy || 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;
  const sortOption = { [sortField]: order };

  const [customers, totalRecords] = await Promise.all([
    Customer.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('leadId', 'name email status')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Customer.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(totalRecords, page, limit);
  sendResponse(res, 200, 'Customers fetched successfully', { customers }, meta);
});

/**
 * @desc    Get Customer by ID
 * @route   GET /api/v1/customers/:id
 * @access  Protected
 */
const getCustomerById = catchAsync(async (req, res, next) => {
  const filter = getCustomerAccessFilter(req.user, { _id: req.params.id });

  const customer = await Customer.findOne(filter)
    .populate('assignedTo', 'name email role phone')
    .populate('leadId', 'name email status source');

  if (!customer) {
    return next(new AppError('Customer not found or access denied', 404));
  }

  sendResponse(res, 200, 'Customer fetched successfully', { customer });
});

/**
 * @desc    Update Customer
 * @route   PUT /api/v1/customers/:id
 * @access  Protected
 */
const updateCustomer = catchAsync(async (req, res, next) => {
  const filter = getCustomerAccessFilter(req.user, { _id: req.params.id });

  const customer = await Customer.findOneAndUpdate(filter, req.body, {
    new: true,
    runValidators: true,
  });

  if (!customer) {
    return next(new AppError('Customer not found or access denied', 404));
  }

  sendResponse(res, 200, 'Customer updated successfully', { customer });
});

/**
 * @desc    Delete Customer
 * @route   DELETE /api/v1/customers/:id
 * @access  Admin, Sales Manager
 */
const deleteCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  sendResponse(res, 200, 'Customer deleted successfully');
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
