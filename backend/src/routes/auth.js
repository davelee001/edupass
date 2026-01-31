const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { createKeypair, fundTestnetAccount, establishTrustline, isTestnet } = require('../config/stellar');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  body('role').isIn(['issuer', 'beneficiary', 'school']),
  body('organization').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, organization } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create Stellar keypair
    const keypair = createKeypair();
    const stellarPublicKey = keypair.publicKey();
    const stellarSecretKey = keypair.secret();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Encrypt Stellar secret key (in production, use proper encryption)
    const encryptedSecret = Buffer.from(stellarSecretKey).toString('base64');

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, stellar_public_key, 
       stellar_secret_key_encrypted, name, organization, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, role, stellar_public_key, name, organization, created_at`,
      [email, passwordHash, role, stellarPublicKey, encryptedSecret, name, organization || null, false]
    );

    const user = result.rows[0];

    // Fund testnet account and establish trustline
    if (isTestnet) {
      try {
        await fundTestnetAccount(stellarPublicKey);
        logger.info(`Funded testnet account for user ${user.id}`);
        
        // Establish trustline for beneficiaries and schools
        if (role === 'beneficiary' || role === 'school') {
          await establishTrustline(stellarSecretKey);
          logger.info(`Trustline established for user ${user.id}`);
        }
      } catch (error) {
        logger.error('Error setting up Stellar account:', error);
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stellarPublicKey: user.stellar_public_key,
        organization: user.organization
      },
      token,
      ...(isTestnet && { note: 'Testnet account funded automatically' })
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stellarPublicKey: user.stellar_public_key,
        organization: user.organization
      },
      token
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, email, name, role, stellar_public_key, organization, verified, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
