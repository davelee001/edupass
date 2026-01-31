const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { issueCredits, getAssetBalance } = require('../config/stellar');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All issuer routes require authentication and issuer role
router.use(authenticateToken);
router.use(requireRole('issuer'));

/**
 * Issue credits to beneficiary
 * POST /api/issuer/issue
 */
router.post('/issue', [
  body('beneficiaryId').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('purpose').trim().notEmpty(),
  body('academicYear').optional().trim(),
  body('expiresAt').optional().isISO8601()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { beneficiaryId, amount, purpose, academicYear, expiresAt } = req.body;
    const issuerId = req.user.userId;

    await client.query('BEGIN');

    // Get issuer secret key
    const issuerResult = await client.query(
      'SELECT stellar_secret_key_encrypted FROM users WHERE id = $1',
      [issuerId]
    );
    const issuerSecretKey = Buffer.from(issuerResult.rows[0].stellar_secret_key_encrypted, 'base64').toString();

    // Get beneficiary public key
    const beneficiaryResult = await client.query(
      'SELECT stellar_public_key, name FROM users WHERE id = $1 AND role = $2',
      [beneficiaryId, 'beneficiary']
    );

    if (beneficiaryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    const beneficiaryPublicKey = beneficiaryResult.rows[0].stellar_public_key;
    const beneficiaryName = beneficiaryResult.rows[0].name;

    // Issue credits on Stellar
    const memo = `${purpose} - ${beneficiaryName}`;
    const stellarResult = await issueCredits(issuerSecretKey, beneficiaryPublicKey, amount, memo);

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions (transaction_hash, from_user_id, to_user_id, amount, 
       transaction_type, purpose, memo, status, stellar_ledger)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        stellarResult.hash,
        issuerId,
        beneficiaryId,
        amount,
        'issue',
        purpose,
        memo,
        'completed',
        stellarResult.ledger
      ]
    );

    // Record allocation
    await client.query(
      `INSERT INTO credit_allocations (beneficiary_id, issuer_id, amount, purpose, 
       academic_year, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [beneficiaryId, issuerId, amount, purpose, academicYear || null, expiresAt || null, 'active']
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Credits issued successfully',
      transaction: transactionResult.rows[0],
      stellarHash: stellarResult.hash,
      ledger: stellarResult.ledger
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error issuing credits:', error);
    res.status(500).json({ error: 'Failed to issue credits', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * Get all beneficiaries
 * GET /api/issuer/beneficiaries
 */
router.get('/beneficiaries', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, stellar_public_key, organization, created_at 
       FROM users WHERE role = $1 ORDER BY created_at DESC`,
      ['beneficiary']
    );

    // Get balances for each beneficiary
    const beneficiaries = await Promise.all(
      result.rows.map(async (beneficiary) => {
        const balance = await getAssetBalance(beneficiary.stellar_public_key);
        return { ...beneficiary, balance };
      })
    );

    res.json({ beneficiaries });

  } catch (error) {
    logger.error('Error fetching beneficiaries:', error);
    res.status(500).json({ error: 'Failed to fetch beneficiaries' });
  }
});

/**
 * Get issuance statistics
 * GET /api/issuer/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const issuerId = req.user.userId;

    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_issuances,
        SUM(amount) as total_amount_issued,
        COUNT(DISTINCT to_user_id) as unique_beneficiaries
       FROM transactions 
       WHERE from_user_id = $1 AND transaction_type = 'issue'`,
      [issuerId]
    );

    const recentIssuances = await pool.query(
      `SELECT t.*, u.name as beneficiary_name
       FROM transactions t
       JOIN users u ON t.to_user_id = u.id
       WHERE t.from_user_id = $1 AND t.transaction_type = 'issue'
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [issuerId]
    );

    res.json({
      statistics: stats.rows[0],
      recentIssuances: recentIssuances.rows
    });

  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
