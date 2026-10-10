const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

/**
 * @desc    Create new user (Admin)
 * @route   POST /api/v1/users
 * @access  Admin
 */
const createUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role, isActive } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email address already in use', 400));
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
    isActive: isActive !== undefined ? isActive : true,
  });

  user.password = undefined;
  sendResponse(res, 201, 'User created successfully', { user });
});

/**
 * @desc    Get all users with search, filtering, pagination & sorting
 * @route   GET /api/v1/users
 * @access  Admin, Sales Manager
 */
const getUsers = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, role, status, sortBy, sortOrder } = req.query;

  // Build Filter Query
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  if (status !== undefined) {
    filter.isActive = status === 'true' || status === 'active';
  }

  // Build Sort
  const sortField = sortBy || 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;
  const sortOption = { [sortField]: order };

  const [users, totalRecords] = await Promise.all([
    User.find(filter).sort(sortOption).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(totalRecords, page, limit);
  sendResponse(res, 200, 'Users fetched successfully', { users }, meta);
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Admin, Sales Manager
 */
const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  sendResponse(res, 200, 'User fetched successfully', { user });
});

/**
 * @desc    Update user details
 * @route   PUT /api/v1/users/:id
 * @access  Admin
 */
const updateUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, role, isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new AppError('Email is already taken by another user', 400));
    }
  }

  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone !== undefined ? phone : user.phone;
  user.role = role || user.role;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();
  sendResponse(res, 200, 'User updated successfully', { user });
});

/**
 * @desc    Activate/Deactivate user
 * @route   PATCH /api/v1/users/:id/status
 * @access  Admin
 */
const updateUserStatus = catchAsync(async (req, res, next) => {
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendResponse(
    res,
    200,
    `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    { user }
  );
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Admin
 */
const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendResponse(res, 200, 'User deleted successfully');
});

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
};
