const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const leadRoutes = require('./routes/lead.routes');
const customerRoutes = require('./routes/customer.routes');
const dealRoutes = require('./routes/deal.routes');
const activityRoutes = require('./routes/activity.routes');
const timelineRoutes = require('./routes/timeline.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CRM API Server is healthy and running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes Mount
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/deals', dealRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/timeline', timelineRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Handle Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find route ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
