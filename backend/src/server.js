const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const issuerRoutes = require('./routes/issuer');
const beneficiaryRoutes = require('./routes/beneficiary');
const schoolRoutes = require('./routes/school');
const transactionRoutes = require('./routes/transactions');
const sorobanRoutes = require('./routes/soroban');
const advancedRoutes = require('./routes/advanced');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'edupass-api',
    version: process.env.API_VERSION || 'v1'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/issuer', issuerRoutes);
app.use('/api/beneficiary', beneficiaryRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/soroban', sorobanRoutes);
app.use('/api/advanced', advancedRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 EduPass API server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Stellar Network: ${process.env.STELLAR_NETWORK}`);
      logger.info(`💳 Asset Code: ${process.env.ASSET_CODE}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;
