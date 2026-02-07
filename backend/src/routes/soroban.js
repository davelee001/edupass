const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sorobanService = require('../services/soroban');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

/**
 * @route   POST /api/soroban/initialize
 * @desc    Initialize the Soroban contract
 * @access  Private (Admin only)
 */
router.post(
  '/initialize',
  [
    auth,
    body('adminPublicKey').notEmpty().withMessage('Admin public key is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Only allow issuers to initialize
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can initialize the contract' });
      }

      const { adminPublicKey } = req.body;
      
      // Get admin secret key (should be stored securely, encrypted)
      const adminSecretKey = process.env.ISSUER_SECRET_KEY;

      const result = await sorobanService.initialize(adminSecretKey, adminPublicKey);

      res.json({
        success: true,
        message: 'Contract initialized successfully',
        transactionHash: result.hash,
      });
    } catch (error) {
      console.error('Contract initialization error:', error);
      res.status(500).json({
        message: 'Failed to initialize contract',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/soroban/issue
 * @desc    Issue credits using smart contract
 * @access  Private (Issuer only)
 */
router.post(
  '/issue',
  [
    auth,
    body('beneficiaryId').isInt().withMessage('Valid beneficiary ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('purpose').notEmpty().withMessage('Purpose is required'),
    body('expiresAt').isInt().withMessage('Valid expiration timestamp is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can issue credits' });
      }

      const { beneficiaryId, amount, purpose, expiresAt } = req.body;

      // Get beneficiary details from database
      const beneficiaryResult = await pool.query(
        'SELECT stellar_public_key, name, email FROM users WHERE id = $1 AND role = $2',
        [beneficiaryId, 'beneficiary']
      );

      if (beneficiaryResult.rows.length === 0) {
        return res.status(404).json({ message: 'Beneficiary not found' });
      }

      const beneficiary = beneficiaryResult.rows[0];
      const issuerSecretKey = req.user.stellar_secret_key_encrypted; // Should be decrypted

      // Issue credits via smart contract
      const contractResult = await sorobanService.issueCredits(
        issuerSecretKey,
        beneficiary.stellar_public_key,
        amount,
        purpose,
        expiresAt
      );

      // Record transaction in database
      await pool.query(
        `INSERT INTO transactions (transaction_hash, from_user_id, to_user_id, amount, transaction_type, purpose, status, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          contractResult.transactionHash,
          req.user.id,
          beneficiaryId,
          amount,
          'issue',
          purpose,
          'completed',
          'Issued via Soroban smart contract',
        ]
      );

      // Record allocation
      await pool.query(
        `INSERT INTO credit_allocations (beneficiary_id, issuer_id, amount, purpose, expires_at, status)
         VALUES ($1, $2, $3, $4, to_timestamp($5), $6)`,
        [beneficiaryId, req.user.id, amount, purpose, expiresAt, 'active']
      );

      res.json({
        success: true,
        message: 'Credits issued successfully',
        transaction: contractResult,
        beneficiary: {
          id: beneficiaryId,
          name: beneficiary.name,
          email: beneficiary.email,
        },
      });
    } catch (error) {
      console.error('Credit issuance error:', error);
      res.status(500).json({
        message: 'Failed to issue credits',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/soroban/transfer
 * @desc    Transfer credits using smart contract
 * @access  Private (Beneficiary only)
 */
router.post(
  '/transfer',
  [
    auth,
    body('toUserId').isInt().withMessage('Valid recipient user ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'beneficiary') {
        return res.status(403).json({ message: 'Only beneficiaries can transfer credits' });
      }

      const { toUserId, amount } = req.body;

      // Get recipient details
      const recipientResult = await pool.query(
        'SELECT stellar_public_key, name, email, role FROM users WHERE id = $1',
        [toUserId]
      );

      if (recipientResult.rows.length === 0) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      const recipient = recipientResult.rows[0];
      const fromSecretKey = req.user.stellar_secret_key_encrypted; // Should be decrypted

      // Transfer via smart contract
      const contractResult = await sorobanService.transferCredits(
        fromSecretKey,
        recipient.stellar_public_key,
        amount
      );

      // Record transaction in database
      await pool.query(
        `INSERT INTO transactions (transaction_hash, from_user_id, to_user_id, amount, transaction_type, status, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          contractResult.transactionHash,
          req.user.id,
          toUserId,
          amount,
          'transfer',
          'completed',
          'Transferred via Soroban smart contract',
        ]
      );

      res.json({
        success: true,
        message: 'Credits transferred successfully',
        transaction: contractResult,
        recipient: {
          id: toUserId,
          name: recipient.name,
          role: recipient.role,
        },
      });
    } catch (error) {
      console.error('Credit transfer error:', error);
      res.status(500).json({
        message: 'Failed to transfer credits',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/soroban/burn
 * @desc    Burn (redeem) credits using smart contract
 * @access  Private (School only)
 */
router.post(
  '/burn',
  [
    auth,
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('serviceType').notEmpty().withMessage('Service type is required'),
    body('invoiceNumber').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'school') {
        return res.status(403).json({ message: 'Only schools can burn credits' });
      }

      const { amount, serviceType, invoiceNumber } = req.body;
      const accountSecretKey = req.user.stellar_secret_key_encrypted; // Should be decrypted

      // Burn credits via smart contract
      const contractResult = await sorobanService.burnCredits(accountSecretKey, amount);

      // Record transaction in database
      const transactionResult = await pool.query(
        `INSERT INTO transactions (transaction_hash, from_user_id, to_user_id, amount, transaction_type, status, memo)
         VALUES ($1, $2, NULL, $3, $4, $5, $6) RETURNING id`,
        [
          contractResult.transactionHash,
          req.user.id,
          amount,
          'burn',
          'completed',
          'Burned via Soroban smart contract',
        ]
      );

      const transactionId = transactionResult.rows[0].id;

      // Record redemption
      await pool.query(
        `INSERT INTO redemptions (school_id, transaction_id, amount, service_type, invoice_number, burned, burned_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [req.user.id, transactionId, amount, serviceType, invoiceNumber, true]
      );

      res.json({
        success: true,
        message: 'Credits burned successfully',
        transaction: contractResult,
        redemption: {
          amount,
          serviceType,
          invoiceNumber,
        },
      });
    } catch (error) {
      console.error('Credit burn error:', error);
      res.status(500).json({
        message: 'Failed to burn credits',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/soroban/balance/:publicKey
 * @desc    Get balance from smart contract
 * @access  Private
 */
router.get('/balance/:publicKey', auth, async (req, res) => {
  try {
    const { publicKey } = req.params;
    const balance = await sorobanService.getBalance(publicKey);

    res.json({
      success: true,
      publicKey,
      balance,
    });
  } catch (error) {
    console.error('Balance retrieval error:', error);
    res.status(500).json({
      message: 'Failed to retrieve balance',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/soroban/allocation/:publicKey
 * @desc    Get allocation details from smart contract
 * @access  Private
 */
router.get('/allocation/:publicKey', auth, async (req, res) => {
  try {
    const { publicKey } = req.params;
    const allocation = await sorobanService.getAllocation(publicKey);

    res.json({
      success: true,
      publicKey,
      allocation,
    });
  } catch (error) {
    console.error('Allocation retrieval error:', error);
    res.status(500).json({
      message: 'Failed to retrieve allocation',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/soroban/total-issued
 * @desc    Get total credits issued from smart contract
 * @access  Private
 */
router.get('/total-issued', auth, async (req, res) => {
  try {
    const total = await sorobanService.getTotalIssued();

    res.json({
      success: true,
      totalIssued: total,
    });
  } catch (error) {
    console.error('Total issued retrieval error:', error);
    res.status(500).json({
      message: 'Failed to retrieve total issued',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/soroban/health
 * @desc    Check Soroban contract health and connectivity
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const contractId = process.env.SOROBAN_CONTRACT_ID;
    
    if (!contractId) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: 'Soroban contract not configured',
        details: {
          contractId: null,
          network: process.env.STELLAR_NETWORK || 'unknown',
        }
      });
    }

    // Use the service's health check method
    const healthStatus = await sorobanService.healthCheck();
    
    if (!healthStatus.healthy) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: 'Stellar network unreachable',
        details: {
          contractId,
          network: process.env.STELLAR_NETWORK || 'testnet',
          error: healthStatus.error,
        }
      });
    }

    // Try to get total issued as an additional health check
    const total = await sorobanService.getTotalIssued();

    res.json({
      success: true,
      status: 'healthy',
      message: 'Soroban contract is operational',
      details: {
        contractId,
        network: healthStatus.network,
        latestLedger: healthStatus.latestLedger,
        rpcUrl: process.env.SOROBAN_RPC_URL || 'using default',
        totalIssued: total,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Soroban health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Failed to connect to Soroban contract',
      error: error.message,
      details: {
        contractId: process.env.SOROBAN_CONTRACT_ID || null,
        network: process.env.STELLAR_NETWORK || 'unknown',
      }
    });
  }
});

/**
 * @route   POST /api/soroban/batch-balances
 * @desc    Get balances for multiple public keys
 * @access  Private
 */
router.post(
  '/batch-balances',
  [
    auth,
    body('keys').isArray({ min: 1, max: 50 }).withMessage('Keys must be an array (1-50 items)'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { keys } = req.body;
      const balances = await sorobanService.batchGetBalances(keys);

      res.json({
        success: true,
        balances,
        count: Object.keys(balances).length,
      });
    } catch (error) {
      console.error('Batch balance retrieval error:', error);
      res.status(500).json({
        message: 'Failed to retrieve batch balances',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/soroban/clear-cache
 * @desc    Clear the read operation cache
 * @access  Private (Admin/Issuer only)
 */
router.post('/clear-cache', auth, async (req, res) => {
  try {
    if (req.user.role !== 'issuer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can clear cache' });
    }

    const { key } = req.body;
    sorobanService.clearCache(key);

    res.json({
      success: true,
      message: key ? `Cache cleared for key: ${key}` : 'All cache cleared',
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      message: 'Failed to clear cache',
      error: error.message,
    });
  }
});

module.exports = router;
