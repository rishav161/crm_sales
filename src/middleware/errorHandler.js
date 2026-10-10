const AppError = require('../utils/appError');

/**
 * Centralized Global Error Handler Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400);
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    error = new AppError('Database validation failed', 400, errors);
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token has expired. Please log in again.', 401);
  }

  // Format Response
  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  // Expose stack trace only in development
  if (process.env.NODE_ENV === 'development' && !error.isOperational) {
    response.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = globalErrorHandler;
