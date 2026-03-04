const logger = require('./logger');

/**
 * Validates that all required environment variables are set
 * Call this at application startup to fail fast if config is invalid
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required variables for all environments
  const required = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'STELLAR_NETWORK',
    'ASSET_CODE',
  ];

  // Check required variables
  required.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }

    if (process.env.JWT_SECRET && 
        (process.env.JWT_SECRET.includes('change') || 
         process.env.JWT_SECRET.includes('example') ||
         process.env.JWT_SECRET.includes('your_'))) {
      errors.push('JWT_SECRET appears to be a default value - change it in production!');
    }

    // Check for database password strength
    if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length < 8) {
      errors.push('DB_PASSWORD must be at least 8 characters in production');
    }

    if (process.env.DB_PASSWORD && 
        (process.env.DB_PASSWORD === 'postgres' || 
         process.env.DB_PASSWORD.includes('password') ||
         process.env.DB_PASSWORD.includes('changeme'))) {
      errors.push('DB_PASSWORD appears to be a default value - change it in production!');
    }

    // Require Soroban config in production
    if (!process.env.SOROBAN_CONTRACT_ID) {
      warnings.push('SOROBAN_CONTRACT_ID not set - smart contract features will not work');
    }

    // Check issuer credentials
    if (!process.env.ISSUER_PUBLIC_KEY || !process.env.ISSUER_SECRET_KEY) {
      warnings.push('Issuer credentials not configured - some features may not work');
    }
  }

  // Validate Stellar network
  if (process.env.STELLAR_NETWORK && 
      !['testnet', 'public'].includes(process.env.STELLAR_NETWORK)) {
    errors.push('STELLAR_NETWORK must be either "testnet" or "public"');
  }

  // Validate LOG_LEVEL
  if (process.env.LOG_LEVEL && 
      !['error', 'warn', 'info', 'debug'].includes(process.env.LOG_LEVEL)) {
    warnings.push('LOG_LEVEL should be one of: error, warn, info, debug');
  }

  // Validate PORT
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('PORT must be a valid number between 1 and 65535');
    }
  }

  // Validate database port
  if (process.env.DB_PORT) {
    const dbPort = parseInt(process.env.DB_PORT);
    if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
      errors.push('DB_PORT must be a valid number between 1 and 65535');
    }
  }

  // Check for Stellar key format (basic validation)
  if (process.env.ISSUER_PUBLIC_KEY && !process.env.ISSUER_PUBLIC_KEY.startsWith('G')) {
    errors.push('ISSUER_PUBLIC_KEY must start with "G" (Stellar public key format)');
  }

  if (process.env.ISSUER_SECRET_KEY && !process.env.ISSUER_SECRET_KEY.startsWith('S')) {
    errors.push('ISSUER_SECRET_KEY must start with "S" (Stellar secret key format)');
  }

  // Log results
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    return false;
  }

  if (warnings.length > 0) {
    logger.warn('⚠️  Environment validation warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  logger.info('✅ Environment validation passed');
  return true;
}

/**
 * Get a sanitized configuration object (safe for logging)
 * Removes sensitive values
 */
function getSanitizedConfig() {
  const config = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
    },
    stellar: {
      network: process.env.STELLAR_NETWORK,
      assetCode: process.env.ASSET_CODE,
      hasIssuerKeys: !!(process.env.ISSUER_PUBLIC_KEY && process.env.ISSUER_SECRET_KEY),
      hasSorobanContract: !!process.env.SOROBAN_CONTRACT_ID,
    },
    security: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
      rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS,
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };

  return config;
}

module.exports = {
  validateEnvironment,
  getSanitizedConfig,
};
