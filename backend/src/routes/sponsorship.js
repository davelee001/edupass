const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const sponsorshipService = require('../services/sponsorship');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /sponsorship/account - Create a sponsored account
 * Issuer sponsors account creation for beneficiaries/schools
 */
router.post('/account', [
  authenticateToken,
  requireRole('issuer'),
  body('newAccountPublicKey').notEmpty(),
  body('startingBalance').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newAccountPublicKey, startingBalance } = req.body;

    // Get sponsor's secret key from database
    const sponsorResult = await pool.query(
      'SELECT stellar_secret_key_encrypted FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (sponsorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsor account not found' });
    }

    const sponsorSecretKey = Buffer.from(
      sponsorResult.rows[0].stellar_secret_key_encrypted,
      'base64'
    ).toString('utf-8');

    // Create sponsored account
    const result = await sponsorshipService.createSponsoredAccount(
      sponsorSecretKey,
      newAccountPublicKey,
      startingBalance || '0'
    );

    // Record sponsorship in database
    await sponsorshipService.recordSponsorship(
      req.user.userId,
      newAccountPublicKey,
      'account',
      { startingBalance, transactionId: result.transactionId }
    );

    res.json(result);
  } catch (error) {
    logger.error('Error creating sponsored account:', error);
    res.status(500).json({ error: error.message || 'Failed to create sponsored account' });
  }
});

/**
 * POST /sponsorship/trustline - Establish sponsored trustline
 * Issuer sponsors trustline creation for beneficiaries/schools
 */
router.post('/trustline', [
  authenticateToken,
  requireRole('issuer'),
  body('accountSecretKey').notEmpty(),
  body('assetCode').notEmpty(),
  body('assetIssuer').notEmpty(),
  body('limit').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountSecretKey, assetCode, assetIssuer, limit } = req.body;

    // Get sponsor's secret key
    const sponsorResult = await pool.query(
      'SELECT stellar_secret_key_encrypted FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (sponsorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsor account not found' });
    }

    const sponsorSecretKey = Buffer.from(
      sponsorResult.rows[0].stellar_secret_key_encrypted,
      'base64'
    ).toString('utf-8');

    // Create asset
    const StellarSdk = require('stellar-sdk');
    const asset = new StellarSdk.Asset(assetCode, assetIssuer);

    // Establish sponsored trustline
    const result = await sponsorshipService.establishSponsoredTrustline(
      sponsorSecretKey,
      accountSecretKey,
      asset,
      limit
    );

    res.json(result);
  } catch (error) {
    logger.error('Error establishing sponsored trustline:', error);
    res.status(500).json({ error: error.message || 'Failed to establish sponsored trustline' });
  }
});

/**
 * POST /sponsorship/fees - Sponsor transaction fees
 * Fee-bump transaction to pay fees for another transaction
 */
router.post('/fees', [
  authenticateToken,
  requireRole('issuer', 'school'),
  body('innerTransactionXdr').notEmpty(),
  body('baseFee').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { innerTransactionXdr, baseFee } = req.body;

    // Get sponsor's secret key
    const sponsorResult = await pool.query(
      'SELECT stellar_secret_key_encrypted FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (sponsorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsor account not found' });
    }

    const sponsorSecretKey = Buffer.from(
      sponsorResult.rows[0].stellar_secret_key_encrypted,
      'base64'
    ).toString('utf-8');

    // Sponsor transaction fees
    const result = await sponsorshipService.sponsorTransactionFees(
      sponsorSecretKey,
      innerTransactionXdr,
      baseFee
    );

    res.json(result);
  } catch (error) {
    logger.error('Error sponsoring transaction fees:', error);
    res.status(500).json({ error: error.message || 'Failed to sponsor transaction fees' });
  }
});

/**
 * GET /sponsorship/info/:accountId - Get sponsorship information
 */
router.get('/info/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const info = await sponsorshipService.getSponsorshipInfo(accountId);
    
    res.json(info);
  } catch (error) {
    logger.error('Error getting sponsorship info:', error);
    res.status(500).json({ error: error.message || 'Failed to get sponsorship info' });
  }
});

/**
 * GET /sponsorship/history - Get sponsorship history for user
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // Get user's Stellar public key
    const userResult = await pool.query(
      'SELECT stellar_public_key FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stellarPublicKey = userResult.rows[0].stellar_public_key;

    // Get sponsorships where user is sponsor or sponsored
    const sponsorships = await pool.query(
      `SELECT s.*, 
              u1.email as sponsor_email, 
              u2.email as sponsored_email
       FROM sponsorships s
       LEFT JOIN users u1 ON s.sponsor_user_id = u1.id
       LEFT JOIN users u2 ON s.sponsored_user_id = u2.id
       WHERE s.sponsor_user_id = $1 OR s.sponsored_user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      sponsorships: sponsorships.rows,
      stellarAccount: stellarPublicKey
    });
  } catch (error) {
    logger.error('Error getting sponsorship history:', error);
    res.status(500).json({ error: error.message || 'Failed to get sponsorship history' });
  }
});

/**
 * DELETE /sponsorship/:accountId - Revoke sponsorship
 */
router.delete('/:accountId', [
  authenticateToken,
  requireRole('issuer')
], async (req, res) => {
  try {
    const { accountId } = req.params;

    // Get sponsor's secret key
    const sponsorResult = await pool.query(
      'SELECT stellar_secret_key_encrypted FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (sponsorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsor account not found' });
    }

    const sponsorSecretKey = Buffer.from(
      sponsorResult.rows[0].stellar_secret_key_encrypted,
      'base64'
    ).toString('utf-8');

    const result = await sponsorshipService.revokeSponsorship(
      sponsorSecretKey,
      accountId
    );

    res.json(result);
  } catch (error) {
    logger.error('Error revoking sponsorship:', error);
    res.status(500).json({ error: error.message || 'Failed to revoke sponsorship' });
  }
});

module.exports = router;
