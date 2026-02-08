const { pool } = require('../config/database');
const logger = require('../utils/logger');

const HOME_DOMAIN = process.env.HOME_DOMAIN || 'edupass.local';

/**
 * Resolve a federation name to Stellar account
 * @param {string} federationName - Format: name*domain.com
 * @returns {Promise<object|null>}
 */
async function resolveFederationName(federationName) {
  try {
    // Parse federation address
    const parts = federationName.split('*');
    if (parts.length !== 2) {
      throw new Error('Invalid federation format. Use: name*domain.com');
    }

    const [username, domain] = parts;

    // Verify domain matches our home domain
    if (domain !== HOME_DOMAIN) {
      throw new Error(`This server only handles federation for ${HOME_DOMAIN}`);
    }

    // Look up user by username/email
    const result = await pool.query(
      `SELECT id, email, stellar_public_key, name, role, organization 
       FROM users 
       WHERE email = $1 OR name = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    return {
      stellar_address: federationName,
      account_id: user.stellar_public_key,
      memo_type: 'id',
      memo: user.id.toString()
    };
  } catch (error) {
    logger.error('Error resolving federation name:', error);
    throw error;
  }
}

/**
 * Reverse lookup - find federation name by Stellar account ID
 * @param {string} accountId - Stellar public key
 * @returns {Promise<object|null>}
 */
async function reverseLookup(accountId) {
  try {
    const result = await pool.query(
      `SELECT id, email, stellar_public_key, name, role, organization 
       FROM users 
       WHERE stellar_public_key = $1`,
      [accountId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Use email as the federation name by default
    const federationName = `${user.email}*${HOME_DOMAIN}`;

    return {
      stellar_address: federationName,
      account_id: user.stellar_public_key,
      memo_type: 'id',
      memo: user.id.toString()
    };
  } catch (error) {
    logger.error('Error in reverse lookup:', error);
    throw error;
  }
}

/**
 * Create or update a custom federation name for a user
 * @param {number} userId - User ID
 * @param {string} customName - Custom federation name (before the *)
 * @returns {Promise<object>}
 */
async function setCustomFederationName(userId, customName) {
  try {
    // Validate custom name (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(customName)) {
      throw new Error('Invalid federation name. Use only letters, numbers, hyphens, and underscores');
    }

    // Check if name is already taken
    const existing = await pool.query(
      'SELECT id FROM federation_names WHERE federation_name = $1 AND user_id != $2',
      [customName, userId]
    );

    if (existing.rows.length > 0) {
      throw new Error('Federation name already taken');
    }

    // Insert or update
    const result = await pool.query(
      `INSERT INTO federation_names (user_id, federation_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET federation_name = $2, updated_at = NOW()
       RETURNING *`,
      [userId, customName]
    );

    logger.info(`Custom federation name set for user ${userId}: ${customName}`);

    return {
      stellar_address: `${customName}*${HOME_DOMAIN}`,
      custom_name: customName
    };
  } catch (error) {
    logger.error('Error setting custom federation name:', error);
    throw error;
  }
}

/**
 * Get federation name for a user
 * @param {number} userId - User ID
 * @returns {Promise<string|null>}
 */
async function getFederationNameForUser(userId) {
  try {
    // Check for custom federation name first
    const customResult = await pool.query(
      'SELECT federation_name FROM federation_names WHERE user_id = $1',
      [userId]
    );

    if (customResult.rows.length > 0) {
      return `${customResult.rows[0].federation_name}*${HOME_DOMAIN}`;
    }

    // Fall back to email
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0) {
      return `${userResult.rows[0].email}*${HOME_DOMAIN}`;
    }

    return null;
  } catch (error) {
    logger.error('Error getting federation name:', error);
    throw error;
  }
}

/**
 * Search for users by partial federation name
 * @param {string} query - Search query
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>}
 */
async function searchFederationNames(query, limit = 10) {
  try {
    const results = await pool.query(
      `SELECT u.id, u.email, u.stellar_public_key, u.name, u.role, 
              COALESCE(f.federation_name, u.email) as federation_name
       FROM users u
       LEFT JOIN federation_names f ON u.id = f.user_id
       WHERE u.email ILIKE $1 OR u.name ILIKE $1 OR f.federation_name ILIKE $1
       LIMIT $2`,
      [`%${query}%`, limit]
    );

    return results.rows.map(user => ({
      stellar_address: `${user.federation_name}*${HOME_DOMAIN}`,
      account_id: user.stellar_public_key,
      name: user.name,
      role: user.role
    }));
  } catch (error) {
    logger.error('Error searching federation names:', error);
    throw error;
  }
}

module.exports = {
  resolveFederationName,
  reverseLookup,
  setCustomFederationName,
  getFederationNameForUser,
  searchFederationNames,
  HOME_DOMAIN
};
