const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { burnCredits, getAssetBalance } = require('../config/stellar');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('school'));

/**
 * Get school balance
 * GET /api/school/balance
 */
router.get('/balance', async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query(
      'SELECT stellar_public_key FROM users WHERE id = $1',
      [userId]
    );

    const publicKey = userResult.rows[0].stellar_public_key;
    const balance = await getAssetBalance(publicKey);

    res.json({ balance, publicKey });

  } catch (error) {
    logger.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

/**
 * Redeem and burn credits
 * POST /api/school/redeem
 */
router.post('/redeem', [
  body('transactionId').isInt(),
  body('serviceType').trim().notEmpty(),
  body('invoiceNumber').optional().trim()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId, serviceType, invoiceNumber } = req.body;
    const schoolId = req.user.userId;

    await client.query('BEGIN');

    // Get transaction details
    const transactionResult = await client.query(
      `SELECT t.*, u.name as beneficiary_name 
       FROM transactions t
       JOIN users u ON t.from_user_id = u.id
       WHERE t.id = $1 AND t.to_user_id = $2 AND t.transaction_type = 'transfer'`,
      [transactionId, schoolId]
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or not authorized' });
    }

    const transaction = transactionResult.rows[0];
    const amount = parseFloat(transaction.amount);
    const beneficiaryId = transaction.from_user_id;

    // Check if already redeemed
    const existingRedemption = await client.query(
      'SELECT id FROM redemptions WHERE transaction_id = $1',
      [transactionId]
    );

    if (existingRedemption.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction already redeemed' });
    }

    // Get school secret key
    const schoolResult = await client.query(
      'SELECT stellar_secret_key_encrypted FROM users WHERE id = $1',
      [schoolId]
    );
    const schoolSecretKey = Buffer.from(
      schoolResult.rows[0].stellar_secret_key_encrypted, 
      'base64'
    ).toString();

    // Burn credits on Stellar
    const memo = `Redeemed: ${serviceType}${invoiceNumber ? ` - ${invoiceNumber}` : ''}`;
    const burnResult = await burnCredits(schoolSecretKey, amount, memo);

    // Record burn transaction
    const burnTransactionResult = await client.query(
      `INSERT INTO transactions (transaction_hash, from_user_id, to_user_id, amount, 
       transaction_type, purpose, memo, status, stellar_ledger)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        burnResult.hash,
        schoolId,
        null, // burned to issuer
        amount,
        'burn',
        serviceType,
        memo,
        'completed',
        burnResult.ledger
      ]
    );

    // Record redemption
    const redemptionResult = await client.query(
      `INSERT INTO redemptions (school_id, beneficiary_id, transaction_id, amount, 
       service_type, invoice_number, burned, burned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [schoolId, beneficiaryId, transactionId, amount, serviceType, invoiceNumber || null, true]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Credits redeemed and burned successfully',
      redemption: redemptionResult.rows[0],
      burnTransaction: burnTransactionResult.rows[0],
      stellarHash: burnResult.hash
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error redeeming credits:', error);
    res.status(500).json({ error: 'Failed to redeem credits', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * Get pending transactions (received but not redeemed)
 * GET /api/school/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const schoolId = req.user.userId;

    const result = await pool.query(
      `SELECT t.*, u.name as beneficiary_name, u.email as beneficiary_email
       FROM transactions t
       JOIN users u ON t.from_user_id = u.id
       LEFT JOIN redemptions r ON t.id = r.transaction_id
       WHERE t.to_user_id = $1 
         AND t.transaction_type = 'transfer'
         AND r.id IS NULL
       ORDER BY t.created_at DESC`,
      [schoolId]
    );

    res.json({ pendingTransactions: result.rows });

  } catch (error) {
    logger.error('Error fetching pending transactions:', error);
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

/**
 * Get redemption history
 * GET /api/school/redemptions
 */
router.get('/redemptions', async (req, res) => {
  try {
    const schoolId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT r.*, u.name as beneficiary_name, t.transaction_hash
       FROM redemptions r
       JOIN users u ON r.beneficiary_id = u.id
       JOIN transactions t ON r.transaction_id = t.id
       WHERE r.school_id = $1
       ORDER BY r.redeemed_at DESC
       LIMIT $2`,
      [schoolId, limit]
    );

    res.json({ redemptions: result.rows });

  } catch (error) {
    logger.error('Error fetching redemptions:', error);
    res.status(500).json({ error: 'Failed to fetch redemptions' });
  }
});

/**
 * Get redemption statistics
 * GET /api/school/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const schoolId = req.user.userId;

    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_redemptions,
        SUM(amount) as total_amount_redeemed,
        COUNT(DISTINCT beneficiary_id) as unique_students
       FROM redemptions 
       WHERE school_id = $1`,
      [schoolId]
    );

    const byServiceType = await pool.query(
      `SELECT service_type, COUNT(*) as count, SUM(amount) as total_amount
       FROM redemptions
       WHERE school_id = $1
       GROUP BY service_type
       ORDER BY total_amount DESC`,
      [schoolId]
    );

    res.json({
      statistics: stats.rows[0],
      byServiceType: byServiceType.rows
    });

  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
