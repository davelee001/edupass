const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  logger.debug('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});

const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful');
    
    // Create tables if they don't exist
    await initializeTables();
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('issuer', 'beneficiary', 'school')),
        stellar_public_key VARCHAR(56) UNIQUE NOT NULL,
        stellar_secret_key_encrypted TEXT,
        name VARCHAR(255) NOT NULL,
        organization VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_hash VARCHAR(64) UNIQUE NOT NULL,
        from_user_id INTEGER REFERENCES users(id),
        to_user_id INTEGER REFERENCES users(id),
        amount DECIMAL(20, 7) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('issue', 'transfer', 'redeem', 'burn')),
        purpose VARCHAR(100),
        memo TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        stellar_ledger INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Credit allocations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_allocations (
        id SERIAL PRIMARY KEY,
        beneficiary_id INTEGER REFERENCES users(id),
        issuer_id INTEGER REFERENCES users(id),
        amount DECIMAL(20, 7) NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        academic_year VARCHAR(20),
        expires_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Redemptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES users(id),
        beneficiary_id INTEGER REFERENCES users(id),
        transaction_id INTEGER REFERENCES transactions(id),
        amount DECIMAL(20, 7) NOT NULL,
        service_type VARCHAR(100),
        invoice_number VARCHAR(100),
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        burned BOOLEAN DEFAULT false,
        burned_at TIMESTAMP
      );
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_stellar_key ON users(stellar_public_key);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_user_id);');
    
    await client.query('COMMIT');
    logger.info('Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error initializing tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  connectDatabase,
  query: (text, params) => pool.query(text, params)
};
