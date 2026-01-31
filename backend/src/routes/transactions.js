const express = require('express');
const { pool } = require('../config/database');
const { getTransactionHistory } = require('../config/stellar');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticateToken);

/**
 * Get user's transaction history
 * GET /api/transactions
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type; // issue, transfer, redeem, burn

    let query = `
      SELECT t.*, 
        sender.name as sender_name,
        sender.role as sender_role,
        receiver.name as receiver_name,
        receiver.role as receiver_role
      FROM transactions t
      LEFT JOIN users sender ON t.from_user_id = sender.id
      LEFT JOIN users receiver ON t.to_user_id = receiver.id
      WHERE (t.from_user_id = $1 OR t.to_user_id = $1)
    `;

    const params = [userId];

    if (type) {
      query += ` AND t.transaction_type = $2`;
      params.push(type);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({ 
      transactions: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Get specific transaction details
 * GET /api/transactions/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    const result = await pool.query(
      `SELECT t.*, 
        sender.name as sender_name,
        sender.email as sender_email,
        sender.role as sender_role,
        receiver.name as receiver_name,
        receiver.email as receiver_email,
        receiver.role as receiver_role
      FROM transactions t
      LEFT JOIN users sender ON t.from_user_id = sender.id
      LEFT JOIN users receiver ON t.to_user_id = receiver.id
      WHERE t.id = $1 AND (t.from_user_id = $2 OR t.to_user_id = $2)`,
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: result.rows[0] });

  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * Get Stellar blockchain transaction history
 * GET /api/transactions/stellar/history
 */
router.get('/stellar/history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    // Get user's Stellar public key
    const userResult = await pool.query(
      'SELECT stellar_public_key FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const publicKey = userResult.rows[0].stellar_public_key;
    const stellarTransactions = await getTransactionHistory(publicKey, limit);

    res.json({ 
      stellarTransactions,
      publicKey
    });

  } catch (error) {
    logger.error('Error fetching Stellar history:', error);
    res.status(500).json({ error: 'Failed to fetch Stellar transaction history' });
  }
});

module.exports = router;
