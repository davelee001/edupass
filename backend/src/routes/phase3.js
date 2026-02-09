const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const stellar = require('../config/stellar');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// ============================================================================
// PHASE 3: TIME-BOUNDED TRANSACTIONS
// ============================================================================

/**
 * @route   POST /api/phase3/time-bounded-transaction
 * @desc    Create a time-bounded transaction with automatic expiration
 * @access  Private
 */
router.post(
  '/time-bounded-transaction',
  auth,
  [
    body('destinationPublicKey').notEmpty().withMessage('Destination public key is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('expiresInMinutes').optional().isInt({ min: 1 }).withMessage('Expiration must be at least 1 minute'),
    body('memo').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { destinationPublicKey, amount, expiresInMinutes, validAfterMinutes, memo } = req.body;
      
      // Get user's secret key from database
      const userQuery = await pool.query(
        'SELECT secret_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const secretKey = userQuery.rows[0].secret_key;
      
      // Calculate time bounds
      const currentTime = Math.floor(Date.now() / 1000);
      const minTime = validAfterMinutes ? currentTime + (validAfterMinutes * 60) : 0;
      const maxTime = expiresInMinutes ? currentTime + (expiresInMinutes * 60) : 0;
      
      // Create time-bounded transaction
      const result = await stellar.createTimeBoundedTransaction(
        secretKey,
        destinationPublicKey,
        amount,
        minTime,
        maxTime,
        memo
      );
      
      // Log transaction in database
      await pool.query(
        `INSERT INTO transactions 
        (sender_id, recipient_public_key, amount, type, transaction_hash, status, min_time, max_time, memo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.user.id, destinationPublicKey, amount, 'time_bounded', result.hash, 'completed', minTime, maxTime, memo]
      );
      
      res.json({
        success: true,
        message: 'Time-bounded transaction created successfully',
        transactionHash: result.hash,
        minTime,
        maxTime,
        expiresAt: result.expiresAt,
        validAfter: minTime > 0 ? new Date(minTime * 1000) : null
      });
    } catch (error) {
      console.error('Time-bounded transaction error:', error);
      res.status(500).json({
        message: 'Failed to create time-bounded transaction',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/phase3/check-expiration/:maxTime
 * @desc    Check if a transaction has expired
 * @access  Public
 */
router.get('/check-expiration/:maxTime', (req, res) => {
  try {
    const maxTime = parseInt(req.params.maxTime);
    const result = stellar.checkTransactionExpiration(maxTime);
    
    res.json(result);
  } catch (error) {
    console.error('Check expiration error:', error);
    res.status(500).json({
      message: 'Failed to check expiration',
      error: error.message
    });
  }
});

// ============================================================================
// PHASE 3: MUXED ACCOUNTS
// ============================================================================

/**
 * @route   POST /api/phase3/create-muxed-account
 * @desc    Create a muxed account address for better organization
 * @access  Private
 */
router.post(
  '/create-muxed-account',
  auth,
  [
    body('id').notEmpty().withMessage('Muxed account ID is required'),
    body('label').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id, label } = req.body;
      
      // Get user's public key
      const userQuery = await pool.query(
        'SELECT public_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const publicKey = userQuery.rows[0].public_key;
      
      // Create muxed account
      const muxedAccount = stellar.createMuxedAccount(publicKey, id);
      
      // Store muxed account in database
      await pool.query(
        `INSERT INTO muxed_accounts (user_id, base_address, muxed_address, muxed_id, label)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, muxed_id) DO UPDATE SET label = $5`,
        [req.user.id, muxedAccount.baseAddress, muxedAccount.muxedAddress, id, label]
      );
      
      res.json({
        success: true,
        message: 'Muxed account created successfully',
        muxedAccount
      });
    } catch (error) {
      console.error('Create muxed account error:', error);
      res.status(500).json({
        message: 'Failed to create muxed account',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/phase3/muxed-accounts
 * @desc    Get all muxed accounts for the current user
 * @access  Private
 */
router.get('/muxed-accounts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT muxed_address, muxed_id, label, created_at FROM muxed_accounts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json({
      success: true,
      muxedAccounts: result.rows
    });
  } catch (error) {
    console.error('Get muxed accounts error:', error);
    res.status(500).json({
      message: 'Failed to get muxed accounts',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/phase3/parse-muxed-account
 * @desc    Parse a muxed account address
 * @access  Public
 */
router.post(
  '/parse-muxed-account',
  [
    body('muxedAddress').notEmpty().withMessage('Muxed address is required')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { muxedAddress } = req.body;
      const parsed = stellar.parseMuxedAccount(muxedAddress);
      
      res.json({
        success: true,
        ...parsed
      });
    } catch (error) {
      console.error('Parse muxed account error:', error);
      res.status(400).json({
        message: 'Failed to parse muxed account',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/phase3/send-to-muxed
 * @desc    Send credits to a muxed account
 * @access  Private
 */
router.post(
  '/send-to-muxed',
  auth,
  [
    body('muxedDestination').notEmpty().withMessage('Muxed destination is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { muxedDestination, amount } = req.body;
      
      // Get user's secret key
      const userQuery = await pool.query(
        'SELECT secret_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const secretKey = userQuery.rows[0].secret_key;
      
      // Send to muxed account
      const result = await stellar.sendToMuxedAccount(secretKey, muxedDestination, amount);
      
      // Parse muxed account to get base address for logging
      const parsed = stellar.parseMuxedAccount(muxedDestination);
      
      // Log transaction
      await pool.query(
        `INSERT INTO transactions 
        (sender_id, recipient_public_key, muxed_destination, amount, type, transaction_hash, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, parsed.baseAddress, muxedDestination, amount, 'muxed_payment', result.hash, 'completed']
      );
      
      res.json({
        success: true,
        message: 'Payment to muxed account successful',
        transactionHash: result.hash,
        baseAddress: parsed.baseAddress,
        muxedId: parsed.id
      });
    } catch (error) {
      console.error('Send to muxed account error:', error);
      res.status(500).json({
        message: 'Failed to send to muxed account',
        error: error.message
      });
    }
  }
);

// ============================================================================
// PHASE 3: SEP-24 ANCHOR INTEGRATION
// ============================================================================

/**
 * @route   POST /api/phase3/sep24/deposit
 * @desc    Initiate a SEP-24 deposit (fiat to crypto)
 * @access  Private
 */
router.post(
  '/sep24/deposit',
  auth,
  [
    body('assetCode').notEmpty().withMessage('Asset code is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('anchorDomain').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { assetCode, amount, anchorDomain = 'testanchor.stellar.org' } = req.body;
      
      // Get user's public key
      const userQuery = await pool.query(
        'SELECT public_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const publicKey = userQuery.rows[0].public_key;
      
      // Initiate SEP-24 deposit
      const deposit = await stellar.initiateSEP24Deposit(assetCode, publicKey, amount, anchorDomain);
      
      // Store in database
      await pool.query(
        `INSERT INTO sep24_transactions 
        (user_id, transaction_id, type, asset_code, amount, status, anchor_domain, interactive_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, deposit.id, 'deposit', assetCode, amount, deposit.status, anchorDomain, deposit.interactiveUrl]
      );
      
      res.json({
        success: true,
        message: 'SEP-24 deposit initiated',
        ...deposit
      });
    } catch (error) {
      console.error('SEP-24 deposit error:', error);
      res.status(500).json({
        message: 'Failed to initiate deposit',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/phase3/sep24/withdrawal
 * @desc    Initiate a SEP-24 withdrawal (crypto to fiat)
 * @access  Private
 */
router.post(
  '/sep24/withdrawal',
  auth,
  [
    body('assetCode').notEmpty().withMessage('Asset code is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('anchorDomain').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { assetCode, amount, anchorDomain = 'testanchor.stellar.org' } = req.body;
      
      // Get user's public key
      const userQuery = await pool.query(
        'SELECT public_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const publicKey = userQuery.rows[0].public_key;
      
      // Initiate SEP-24 withdrawal
      const withdrawal = await stellar.initiateSEP24Withdrawal(assetCode, publicKey, amount, anchorDomain);
      
      // Store in database
      await pool.query(
        `INSERT INTO sep24_transactions 
        (user_id, transaction_id, type, asset_code, amount, status, anchor_domain, interactive_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, withdrawal.id, 'withdrawal', assetCode, amount, withdrawal.status, anchorDomain, withdrawal.interactiveUrl]
      );
      
      res.json({
        success: true,
        message: 'SEP-24 withdrawal initiated',
        ...withdrawal
      });
    } catch (error) {
      console.error('SEP-24 withdrawal error:', error);
      res.status(500).json({
        message: 'Failed to initiate withdrawal',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/phase3/sep24/transaction/:transactionId
 * @desc    Get SEP-24 transaction status
 * @access  Private
 */
router.get('/sep24/transaction/:transactionId', auth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Get transaction from database
    const dbResult = await pool.query(
      'SELECT * FROM sep24_transactions WHERE transaction_id = $1 AND user_id = $2',
      [transactionId, req.user.id]
    );
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    const transaction = dbResult.rows[0];
    
    // Get status from anchor
    const status = await stellar.getSEP24TransactionStatus(transactionId, transaction.anchor_domain);
    
    // Update status in database if changed
    if (status.status !== transaction.status) {
      await pool.query(
        'UPDATE sep24_transactions SET status = $1, updated_at = NOW() WHERE transaction_id = $2',
        [status.status, transactionId]
      );
    }
    
    res.json({
      success: true,
      ...status,
      type: transaction.type,
      amount: transaction.amount,
      assetCode: transaction.asset_code
    });
  } catch (error) {
    console.error('Get SEP-24 transaction error:', error);
    res.status(500).json({
      message: 'Failed to get transaction status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/phase3/sep24/transactions
 * @desc    Get all SEP-24 transactions for the current user
 * @access  Private
 */
router.get('/sep24/transactions', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT transaction_id, type, asset_code, amount, status, anchor_domain, 
              interactive_url, created_at, updated_at 
       FROM sep24_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      transactions: result.rows
    });
  } catch (error) {
    console.error('Get SEP-24 transactions error:', error);
    res.status(500).json({
      message: 'Failed to get transactions',
      error: error.message
    });
  }
});

// ============================================================================
// PHASE 3: PATH PAYMENTS
// ============================================================================

/**
 * @route   POST /api/phase3/path-payment
 * @desc    Send payment with automatic asset conversion
 * @access  Private
 */
router.post(
  '/path-payment',
  auth,
  [
    body('destinationPublicKey').notEmpty().withMessage('Destination required'),
    body('destAmount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('sendMax').isFloat({ gt: 0 }).withMessage('Send max must be greater than 0'),
    body('destAssetCode').optional().isString(),
    body('sendAssetCode').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { destinationPublicKey, destAmount, sendMax, destAssetCode, sendAssetCode, path } = req.body;
      
      const userQuery = await pool.query(
        'SELECT secret_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const secretKey = userQuery.rows[0].secret_key;
      
      const result = await stellar.sendPathPayment(
        secretKey,
        destinationPublicKey,
        destAmount,
        destAssetCode ? new stellar.StellarSdk.Asset(destAssetCode, process.env.ISSUER_PUBLIC_KEY) : stellar.edupassAsset,
        sendMax,
        sendAssetCode ? new stellar.StellarSdk.Asset(sendAssetCode, process.env.ISSUER_PUBLIC_KEY) : stellar.StellarSdk.Asset.native(),
        path || []
      );
      
      res.json({
        success: true,
        message: 'Path payment successful',
        ...result
      });
    } catch (error) {
      console.error('Path payment error:', error);
      res.status(500).json({
        message: 'Failed to send path payment',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/phase3/find-paths
 * @desc    Find payment paths between assets
 * @access  Private
 */
router.post(
  '/find-paths',
  auth,
  [
    body('destinationPublicKey').notEmpty().withMessage('Destination required'),
    body('destAssetCode').notEmpty().withMessage('Destination asset required'),
    body('destAmount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { destinationPublicKey, destAssetCode, destAmount } = req.body;
      
      const userQuery = await pool.query(
        'SELECT public_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const sourcePublicKey = userQuery.rows[0].public_key;
      const destAsset = new stellar.StellarSdk.Asset(destAssetCode, process.env.ISSUER_PUBLIC_KEY);
      
      const paths = await stellar.findPaymentPaths(
        sourcePublicKey,
        destinationPublicKey,
        destAsset,
        destAmount
      );
      
      res.json({
        success: true,
        paths
      });
    } catch (error) {
      console.error('Find paths error:', error);
      res.status(500).json({
        message: 'Failed to find payment paths',
        error: error.message
      });
    }
  }
);

// ============================================================================
// PHASE 3: MANAGE DATA
// ============================================================================

/**
 * @route   POST /api/phase3/manage-data
 * @desc    Store or delete data entry on account
 * @access  Private
 */
router.post(
  '/manage-data',
  auth,
  [
    body('name').notEmpty().withMessage('Data name is required'),
    body('value').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, value } = req.body;
      
      const userQuery = await pool.query(
        'SELECT secret_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const secretKey = userQuery.rows[0].secret_key;
      
      const result = await stellar.manageData(secretKey, name, value || null);
      
      res.json({
        success: true,
        message: `Data entry ${value ? 'set' : 'deleted'} successfully`,
        ...result
      });
    } catch (error) {
      console.error('Manage data error:', error);
      res.status(500).json({
        message: 'Failed to manage data',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/phase3/account-data
 * @desc    Get all data entries for current account
 * @access  Private
 */
router.get('/account-data', auth, async (req, res) => {
  try {
    const userQuery = await pool.query(
      'SELECT public_key FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const publicKey = userQuery.rows[0].public_key;
    const data = await stellar.getAccountData(publicKey);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get account data error:', error);
    res.status(500).json({
      message: 'Failed to get account data',
      error: error.message
    });
  }
});

// ============================================================================
// PHASE 3: ACCOUNT MERGE
// ============================================================================

/**
 * @route   POST /api/phase3/merge-account
 * @desc    Merge account into another account
 * @access  Private
 */
router.post(
  '/merge-account',
  auth,
  [
    body('destinationPublicKey').notEmpty().withMessage('Destination account required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { destinationPublicKey } = req.body;
      
      const userQuery = await pool.query(
        'SELECT secret_key FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const secretKey = userQuery.rows[0].secret_key;
      
      const result = await stellar.mergeAccount(secretKey, destinationPublicKey);
      
      res.json({
        success: true,
        message: 'Account merged successfully',
        ...result
      });
    } catch (error) {
      console.error('Merge account error:', error);
      res.status(500).json({
        message: 'Failed to merge account',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/phase3/can-merge
 * @desc    Check if account can be merged
 * @access  Private
 */
router.get('/can-merge', auth, async (req, res) => {
  try {
    const userQuery = await pool.query(
      'SELECT public_key FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const publicKey = userQuery.rows[0].public_key;
    const eligibility = await stellar.canMergeAccount(publicKey);
    
    res.json({
      success: true,
      ...eligibility
    });
  } catch (error) {
    console.error('Check merge eligibility error:', error);
    res.status(500).json({
      message: 'Failed to check merge eligibility',
      error: error.message
    });
  }
});

module.exports = router;
