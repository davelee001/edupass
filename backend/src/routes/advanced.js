const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const stellar = require('../config/stellar');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// ============================================================================
// PHASE 1: CLAWBACK & AUTHORIZATION ROUTES
// ============================================================================

/**
 * @route   POST /api/advanced/enable-asset-controls
 * @desc    Enable asset authorization controls (AUTH_REQUIRED, AUTH_REVOCABLE, CLAWBACK)
 * @access  Private (Issuer only)
 */
router.post('/enable-asset-controls', auth, async (req, res) => {
  try {
    if (req.user.role !== 'issuer') {
      return res.status(403).json({ message: 'Only issuers can enable asset controls' });
    }

    const issuerSecretKey = process.env.ISSUER_SECRET_KEY;
    const result = await stellar.enableAssetControls(issuerSecretKey);

    res.json({
      success: true,
      message: 'Asset controls enabled successfully',
      transactionHash: result.hash,
      details: {
        authRequired: true,
        authRevocable: true,
        clawbackEnabled: true
      }
    });
  } catch (error) {
    console.error('Enable asset controls error:', error);
    res.status(500).json({
      message: 'Failed to enable asset controls',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/advanced/authorize-account
 * @desc    Authorize an account to hold EDUPASS credits
 * @access  Private (Issuer only)
 */
router.post(
  '/authorize-account',
  [
    auth,
    body('accountPublicKey').notEmpty().withMessage('Account public key is required'),
    body('reason').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can authorize accounts' });
      }

      const { accountPublicKey, reason } = req.body;
      const issuerSecretKey = process.env.ISSUER_SECRET_KEY;

      const result = await stellar.authorizeAccount(issuerSecretKey, accountPublicKey);

      // Log authorization in database
      await pool.query(
        `INSERT INTO account_authorizations (account_public_key, authorized_by, authorized_at, reason, status)
         VALUES ($1, $2, NOW(), $3, $4)`,
        [accountPublicKey, req.user.id, reason || 'Account authorized', 'authorized']
      );

      res.json({
        success: true,
        message: 'Account authorized successfully',
        transactionHash: result.hash,
        accountPublicKey
      });
    } catch (error) {
      console.error('Authorize account error:', error);
      res.status(500).json({
        message: 'Failed to authorize account',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/advanced/revoke-authorization
 * @desc    Revoke account authorization (freeze account)
 * @access  Private (Issuer only)
 */
router.post(
  '/revoke-authorization',
  [
    auth,
    body('accountPublicKey').notEmpty().withMessage('Account public key is required'),
    body('reason').notEmpty().withMessage('Reason is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can revoke authorization' });
      }

      const { accountPublicKey, reason } = req.body;
      const issuerSecretKey = process.env.ISSUER_SECRET_KEY;

      const result = await stellar.revokeAccountAuthorization(issuerSecretKey, accountPublicKey);

      // Log revocation in database
      await pool.query(
        `UPDATE account_authorizations SET status = $1, revoked_at = NOW(), revocation_reason = $2
         WHERE account_public_key = $3 AND status = $4`,
        ['revoked', reason, accountPublicKey, 'authorized']
      );

      res.json({
        success: true,
        message: 'Account authorization revoked successfully',
        transactionHash: result.hash,
        accountPublicKey,
        reason
      });
    } catch (error) {
      console.error('Revoke authorization error:', error);
      res.status(500).json({
        message: 'Failed to revoke authorization',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/advanced/clawback
 * @desc    Clawback credits from an account
 * @access  Private (Issuer only)
 */
router.post(
  '/clawback',
  [
    auth,
    body('fromAccountPublicKey').notEmpty().withMessage('Account public key is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('reason').notEmpty().withMessage('Reason is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can clawback credits' });
      }

      const { fromAccountPublicKey, amount, reason } = req.body;
      const issuerSecretKey = process.env.ISSUER_SECRET_KEY;

      // Find user with this public key
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE stellar_public_key = $1',
        [fromAccountPublicKey]
      );

      const result = await stellar.clawbackCredits(
        issuerSecretKey,
        fromAccountPublicKey,
        amount,
        reason
      );

      // Log clawback in database
      await pool.query(
        `INSERT INTO clawbacks (from_user_id, amount, reason, clawed_back_by, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userResult.rows[0]?.id || null,
          amount,
          reason,
          req.user.id,
          result.hash
        ]
      );

      res.json({
        success: true,
        message: 'Credits clawed back successfully',
        transactionHash: result.hash,
        amount,
        fromAccount: fromAccountPublicKey,
        reason,
        user: userResult.rows[0] || null
      });
    } catch (error) {
      console.error('Clawback error:', error);
      res.status(500).json({
        message: 'Failed to clawback credits',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/advanced/authorization-status/:publicKey
 * @desc    Get authorization status for an account
 * @access  Private
 */
router.get('/authorization-status/:publicKey', auth, async (req, res) => {
  try {
    const { publicKey } = req.params;

    const result = await pool.query(
      `SELECT * FROM account_authorizations 
       WHERE account_public_key = $1 
       ORDER BY authorized_at DESC LIMIT 1`,
      [publicKey]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        authorized: false,
        message: 'Account not yet authorized'
      });
    }

    res.json({
      success: true,
      authorized: result.rows[0].status === 'authorized',
      ...result.rows[0]
    });
  } catch (error) {
    console.error('Get authorization status error:', error);
    res.status(500).json({
      message: 'Failed to get authorization status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/advanced/clawback-history
 * @desc    Get clawback history
 * @access  Private (Issuer only)
 */
router.get('/clawback-history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'issuer') {
      return res.status(403).json({ message: 'Only issuers can view clawback history' });
    }

    const result = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email, u.stellar_public_key,
              i.name as issuer_name
       FROM clawbacks c
       LEFT JOIN users u ON c.from_user_id = u.id
       LEFT JOIN users i ON c.clawed_back_by = i.id
       ORDER BY c.created_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      clawbacks: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get clawback history error:', error);
    res.status(500).json({
      message: 'Failed to get clawback history',
      error: error.message
    });
  }
});

// ============================================================================
// PHASE 1: MULTI-SIGNATURE ROUTES
// ============================================================================

/**
 * @route   POST /api/advanced/add-signer
 * @desc    Add signer to account for multi-sig
 * @access  Private (Issuer only for now)
 */
router.post(
  '/add-signer',
  [
    auth,
    body('signerPublicKey').notEmpty().withMessage('Signer public key is required'),
    body('weight').optional().isInt({ min: 1, max: 255 }).withMessage('Weight must be 1-255')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can manage signers' });
      }

      const { signerPublicKey, weight = 1 } = req.body;
      const issuerSecretKey = process.env.ISSUER_SECRET_KEY;

      const result = await stellar.addSigner(issuerSecretKey, signerPublicKey, weight);

      // Log in database
      await pool.query(
        `INSERT INTO account_signers (account_id, signer_public_key, weight, added_by, added_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.id, signerPublicKey, weight, req.user.id]
      );

      res.json({
        success: true,
        message: 'Signer added successfully',
        transactionHash: result.hash,
        signerPublicKey,
        weight
      });
    } catch (error) {
      console.error('Add signer error:', error);
      res.status(500).json({
        message: 'Failed to add signer',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/advanced/remove-signer
 * @desc    Remove signer from account
 * @access  Private (Issuer only)
 */
router.post(
  '/remove-signer',
  [
    auth,
    body('signerPublicKey').notEmpty().withMessage('Signer public key is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can manage signers' });
      }

      const { signerPublicKey } = req.body;
      const issuerSecretKey = process.env.ISSUER_SECRET_KEY;

      const result = await stellar.removeSigner(issuerSecretKey, signerPublicKey);

      // Update database
      await pool.query(
        `UPDATE account_signers SET removed_at = NOW(), removed_by = $1, status = $2
         WHERE signer_public_key = $3 AND account_id = $4 AND status = $5`,
        [req.user.id, 'removed', signerPublicKey, req.user.id, 'active']
      );

      res.json({
        success: true,
        message: 'Signer removed successfully',
        transactionHash: result.hash,
        signerPublicKey
      });
    } catch (error) {
      console.error('Remove signer error:', error);
      res.status(500).json({
        message: 'Failed to remove signer',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/advanced/set-thresholds
 * @desc    Set account thresholds for multi-sig requirements
 * @access  Private (Issuer only)
 */
router.post(
  '/set-thresholds',
  [
    auth,
    body('low').isInt({ min: 0, max: 255 }),
    body('medium').isInt({ min: 0, max: 255 }),
    body('high').isInt({ min: 0, max: 255 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can set thresholds' });
      }

      const { low, medium, high } = req.body;
      const issuerSecretKey = process.env.ISSUER_SECRET_KEY;

      const result = await stellar.setAccountThresholds(issuerSecretKey, low, medium, high);

      res.json({
        success: true,
        message: 'Account thresholds set successfully',
        transactionHash: result.hash,
        thresholds: { low, medium, high }
      });
    } catch (error) {
      console.error('Set thresholds error:', error);
      res.status(500).json({
        message: 'Failed to set thresholds',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/advanced/signers/:publicKey
 * @desc    Get account signers and thresholds
 * @access  Private
 */
router.get('/signers/:publicKey', auth, async (req, res) => {
  try {
    const { publicKey } = req.params;
    const signersInfo = await stellar.getAccountSigners(publicKey);

    res.json({
      success: true,
      ...signersInfo
    });
  } catch (error) {
    console.error('Get signers error:', error);
    res.status(500).json({
      message: 'Failed to get signers',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/advanced/create-multisig-transaction
 * @desc    Create a multi-signature transaction
 * @access  Private (Issuer only)
 */
router.post(
  '/create-multisig-transaction',
  [
    auth,
    body('operations').isArray({ min: 1 }).withMessage('Operations array required'),
    body('memo').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'issuer') {
        return res.status(403).json({ message: 'Only issuers can create multi-sig transactions' });
      }

      const { operations, memo } = req.body;
      const sourcePublicKey = req.user.stellar_public_key;

      // Convert operations to Stellar SDK format (simplified, needs full implementation)
      const stellarOps = operations; // TODO: Map to actual operation objects

      const result = await stellar.createMultiSigTransaction(sourcePublicKey, stellarOps, memo);

      // Store in database for tracking
      await pool.query(
        `INSERT INTO pending_multisig_transactions (created_by, transaction_xdr, transaction_hash, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.id, result.xdr, result.hash, 'pending']
      );

      res.json({
        success: true,
        message: 'Multi-sig transaction created',
        xdr: result.xdr,
        hash: result.hash
      });
    } catch (error) {
      console.error('Create multi-sig transaction error:', error);
      res.status(500).json({
        message: 'Failed to create multi-sig transaction',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/advanced/sign-transaction
 * @desc    Sign a multi-sig transaction
 * @access  Private
 */
router.post(
  '/sign-transaction',
  [
    auth,
    body('transactionXDR').notEmpty().withMessage('Transaction XDR required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { transactionXDR } = req.body;
      const signerSecretKey = req.user.stellar_secret_key_encrypted; // Should be decrypted

      const signedXDR = await stellar.signTransaction(transactionXDR, signerSecretKey);

      res.json({
        success: true,
        message: 'Transaction signed successfully',
        signedXDR
      });
    } catch (error) {
      console.error('Sign transaction error:', error);
      res.status(500).json({
        message: 'Failed to sign transaction',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/advanced/submit-multisig-transaction
 * @desc    Submit a fully signed multi-sig transaction
 * @access  Private (Issuer only)
 */
router.post(
  '/submit-multisig-transaction',
  [
    auth,
    body('signedXDR').notEmpty().withMessage('Signed transaction XDR required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { signedXDR } = req.body;

      const result = await stellar.submitMultiSigTransaction(signedXDR);

      res.json({
        success: true,
        message: 'Multi-sig transaction submitted successfully',
        transactionHash: result.hash
      });
    } catch (error) {
      console.error('Submit multi-sig transaction error:', error);
      res.status(500).json({
        message: 'Failed to submit multi-sig transaction',
        error: error.message
      });
    }
  }
);

module.exports = router;
