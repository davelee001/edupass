const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { transferCredits, getAssetBalance } = require('../config/stellar');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('beneficiary'));

/**
 * Get beneficiary balance
 * GET /api/beneficiary/balance
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
 * Transfer credits to school
 * POST /api/beneficiary/transfer
 */
router.post('/transfer', [
  body('schoolId').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('purpose').trim().notEmpty(),
  body('invoiceNumber').optional().trim()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { schoolId, amount, purpose, invoiceNumber } = req.body;
    const beneficiaryId = req.user.userId;

    await client.query('BEGIN');

    // Get beneficiary secret key and public key
    const beneficiaryResult = await client.query(
      'SELECT stellar_public_key, stellar_secret_key_encrypted FROM users WHERE id = $1',
      [beneficiaryId]
    );
    const beneficiarySecretKey = Buffer.from(
      beneficiaryResult.rows[0].stellar_secret_key_encrypted, 
      'base64'
    ).toString();
    const beneficiaryPublicKey = beneficiaryResult.rows[0].stellar_public_key;

    // Check balance
    const currentBalance = await getAssetBalance(beneficiaryPublicKey);
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        currentBalance, 
        requested: amount 
      });
    }

    // Get school public key
    const schoolResult = await client.query(
      'SELECT stellar_public_key, name FROM users WHERE id = $1 AND role = $2',
      [schoolId, 'school']
    );

    if (schoolResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'School not found' });
    }

    const schoolPublicKey = schoolResult.rows[0].stellar_public_key;
    const schoolName = schoolResult.rows[0].name;

    // Transfer credits on Stellar
    const memo = `Payment: ${purpose}${invoiceNumber ? ` - Invoice: ${invoiceNumber}` : ''}`;
    const stellarResult = await transferCredits(beneficiarySecretKey, schoolPublicKey, amount, memo);

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions (transaction_hash, from_user_id, to_user_id, amount, 
       transaction_type, purpose, memo, status, stellar_ledger)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        stellarResult.hash,
        beneficiaryId,
        schoolId,
        amount,
        'transfer',
        purpose,
        memo,
        'completed',
        stellarResult.ledger
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `Credits transferred to ${schoolName}`,
      transaction: transactionResult.rows[0],
      stellarHash: stellarResult.hash,
      newBalance: currentBalance - amount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error transferring credits:', error);
    res.status(500).json({ error: 'Failed to transfer credits', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * Get transaction history
 * GET /api/beneficiary/transactions
 */
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT t.*, 
        issuer.name as issuer_name,
        school.name as school_name
       FROM transactions t
       LEFT JOIN users issuer ON t.from_user_id = issuer.id
       LEFT JOIN users school ON t.to_user_id = school.id
       WHERE t.to_user_id = $1 OR t.from_user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ transactions: result.rows });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Get all schools
 * GET /api/beneficiary/schools
 */
router.get('/schools', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, organization, stellar_public_key
       FROM users WHERE role = $1 ORDER BY name`,
      ['school']
    );

    res.json({ schools: result.rows });

  } catch (error) {
    logger.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

module.exports = router;
