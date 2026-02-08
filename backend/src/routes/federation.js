const express = require('express');
const { query, body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const federationService = require('../services/federation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /federation - Stellar federation endpoint
 * Supports both name resolution and reverse lookup
 * 
 * Query params:
 *   - q: Federation address (name*domain.com) or Stellar account ID
 *   - type: 'name' for forward lookup, 'id' for reverse lookup
 */
router.get('/', [
  query('q').notEmpty().withMessage('Query parameter q is required'),
  query('type').isIn(['name', 'id']).withMessage('Type must be name or id')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: errors.array() 
      });
    }

    const { q, type } = req.query;

    let result;
    if (type === 'name') {
      // Forward lookup: name*domain.com -> Stellar account
      result = await federationService.resolveFederationName(q);
    } else if (type === 'id') {
      // Reverse lookup: Stellar account -> name*domain.com
      result = await federationService.reverseLookup(q);
    }

    if (!result) {
      return res.status(404).json({ 
        error: 'Not found',
        detail: 'Federation name or account not found'
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Federation lookup error:', error);
    res.status(400).json({ 
      error: error.message || 'Federation lookup failed' 
    });
  }
});

/**
 * GET /federation/.well-known/stellar.toml
 * Serves the stellar.toml file for federation discovery
 */
router.get('/.well-known/stellar.toml', (req, res) => {
  const toml = `
# EduPass Stellar Configuration
VERSION="1.0.0"

NETWORK_PASSPHRASE="${process.env.STELLAR_NETWORK === 'testnet' ? 'Test SDF Network ; September 2015' : 'Public Global Stellar Network ; September 2015'}"

# Federation Service
FEDERATION_SERVER="${process.env.API_URL || 'http://localhost:3000'}/api/federation"

# Accounts
ACCOUNTS=[
"${process.env.ISSUER_PUBLIC_KEY || ''}"
]

# Asset Information
[[CURRENCIES]]
code="${process.env.ASSET_CODE || 'EDUPASS'}"
issuer="${process.env.ISSUER_PUBLIC_KEY || ''}"
display_decimals=7
name="EduPass Token"
desc="Educational credits for students"
conditions="Educational institutions and verified students only"
image="${process.env.ASSET_IMAGE_URL || ''}"

# Organization Information
[DOCUMENTATION]
ORG_NAME="EduPass"
ORG_URL="${process.env.ORG_URL || 'https://edupass.local'}"
ORG_DESCRIPTION="Blockchain-based educational credit system on Stellar"
ORG_OFFICIAL_EMAIL="${process.env.ORG_EMAIL || 'support@edupass.local'}"

# Support
ORG_SUPPORT_EMAIL="${process.env.SUPPORT_EMAIL || 'support@edupass.local'}"

# Compliance
[PRINCIPALS]
name="EduPass Team"
email="${process.env.PRINCIPALS_EMAIL || 'team@edupass.local'}"
`;

  res.set('Content-Type', 'text/plain');
  res.set('Access-Control-Allow-Origin', '*');
  res.send(toml.trim());
});

/**
 * POST /federation/custom - Set custom federation name
 * Requires authentication
 */
router.post('/custom', [
  authenticateToken,
  body('customName').notEmpty().matches(/^[a-zA-Z0-9_-]+$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid custom name',
        details: errors.array() 
      });
    }

    const { customName } = req.body;
    
    const result = await federationService.setCustomFederationName(
      req.user.userId,
      customName
    );

    res.json(result);
  } catch (error) {
    logger.error('Error setting custom federation name:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to set custom federation name' 
    });
  }
});

/**
 * GET /federation/me - Get current user's federation name
 * Requires authentication
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const federationName = await federationService.getFederationNameForUser(
      req.user.userId
    );

    if (!federationName) {
      return res.status(404).json({ error: 'Federation name not found' });
    }

    res.json({ 
      stellar_address: federationName,
      home_domain: federationService.HOME_DOMAIN
    });
  } catch (error) {
    logger.error('Error getting federation name:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get federation name' 
    });
  }
});

/**
 * GET /federation/search - Search for federation names
 * Requires authentication
 */
router.get('/search', [
  authenticateToken,
  query('q').notEmpty().withMessage('Search query required'),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: errors.array() 
      });
    }

    const { q, limit } = req.query;
    
    const results = await federationService.searchFederationNames(
      q,
      parseInt(limit) || 10
    );

    res.json({ results });
  } catch (error) {
    logger.error('Error searching federation names:', error);
    res.status(500).json({ 
      error: error.message || 'Search failed' 
    });
  }
});

module.exports = router;
