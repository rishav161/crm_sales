const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendResponse } = require('../utils/apiResponse');

// Generate JWT Tokens
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public (or Admin only if configured)
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'Sales Executive',
  });

  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Exclude password from response
  user.password = undefined;

  sendResponse(res, 201, 'User registered successfully', {
    user,
    token,
    refreshToken,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user with password field included
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact administrator.', 403));
  }

  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.password = undefined;

  sendResponse(res, 200, 'Login successful', {
    user,
    token,
    refreshToken,
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  sendResponse(res, 200, 'Current user profile fetched', { user });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res, next) => {
  sendResponse(res, 200, 'Logout successful');
});

module.exports = {
  register,
  login,
  getMe,
  logout,
};
