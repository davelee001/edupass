const express = require('express');
const { body, validationResult } = require('express-validator');
const sep10Service = require('../services/sep10');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /auth - SEP-10 authentication endpoint (TOML discovery)
 * Returns server information for SEP-10 authentication
 */
router.get('/', (req, res) => {
  res.json({
    authentication: true,
    server: sep10Service.SERVER_SIGNING_KEY,
    timeout: 300
  });
});

/**
 * GET /auth/challenge - Get a SEP-10 challenge transaction
 * Query params:
 *   - account: The Stellar account requesting authentication
 *   - memo: Optional memo for the authentication
 */
router.get('/challenge', async (req, res) => {
  try {
    const { account, memo } = req.query;

    if (!account) {
      return res.status(400).json({ 
        error: 'Missing required parameter: account' 
      });
    }

    const challenge = await sep10Service.generateChallenge(account, memo);
    
    res.json(challenge);
  } catch (error) {
    logger.error('Error generating SEP-10 challenge:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to generate challenge' 
    });
  }
});

/**
 * POST /auth/token - Verify signed challenge and issue JWT token
 * Body:
 *   - transaction: The signed challenge transaction (XDR)
 *   - account: The client's Stellar account ID
 */
router.post('/token', [
  body('transaction').notEmpty().withMessage('Transaction XDR is required'),
  body('account').notEmpty().withMessage('Account is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transaction, account } = req.body;

    // Verify the signed challenge
    const verification = await sep10Service.verifyChallenge(transaction, account);
    
    if (!verification.valid) {
      return res.status(401).json({ 
        error: 'Challenge verification failed' 
      });
    }

    // Generate JWT token
    const token = await sep10Service.generateSEP10Token(verification.clientAccountId);

    res.json({
      token,
      type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    logger.error('Error verifying SEP-10 challenge:', error);
    res.status(401).json({ 
      error: error.message || 'Authentication failed' 
    });
  }
});

/**
 * GET /auth/verify - Verify a JWT token (for testing)
 */
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      valid: true,
      account: decoded.sub,
      userId: decoded.userId,
      role: decoded.role,
      expires: new Date(decoded.exp * 1000)
    });
  } catch (error) {
    res.status(401).json({ 
      valid: false, 
      error: error.message 
    });
  }
});

module.exports = router;
