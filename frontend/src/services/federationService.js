import api from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Federation Service
 * Provides human-readable Stellar addresses
 */

/**
 * Resolve a federation name to Stellar account
 * @param {string} federationAddress - Format: name*domain.com
 * @returns {Promise<object>}
 */
export async function resolveFederationName(federationAddress) {
  const response = await fetch(
    `${API_BASE}/federation?q=${encodeURIComponent(federationAddress)}&type=name`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Federation lookup failed');
  }
  
  return response.json();
}

/**
 * Reverse lookup - find federation name by Stellar account
 * @param {string} accountId - Stellar public key
 * @returns {Promise<object>}
 */
export async function reverseLookup(accountId) {
  const response = await fetch(
    `${API_BASE}/federation?q=${encodeURIComponent(accountId)}&type=id`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Reverse lookup failed');
  }
  
  return response.json();
}

/**
 * Set custom federation name for current user
 * @param {string} customName - Custom name (alphanumeric, hyphens, underscores)
 * @returns {Promise<object>}
 */
export async function setCustomFederationName(customName) {
  const response = await api.post('/federation/custom', { customName });
  return response.data;
}

/**
 * Get current user's federation name
 * @returns {Promise<object>}
 */
export async function getMyFederationName() {
  const response = await api.get('/federation/me');
  return response.data;
}

/**
 * Search for users by federation name
 * @param {string} query - Search query
 * @param {number} limit - Maximum results (default: 10)
 * @returns {Promise<Array>}
 */
export async function searchFederationNames(query, limit = 10) {
  const response = await api.get(`/federation/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data.results;
}

/**
 * Parse a federation address or Stellar public key
 * Returns normalized account information
 * @param {string} address - Federation address or public key
 * @returns {Promise<{accountId: string, memo?: string, memoType?: string}>}
 */
export async function parseAddress(address) {
  try {
    // Check if it's a federation address (contains *)
    if (address.includes('*')) {
      const result = await resolveFederationName(address);
      return {
        accountId: result.account_id,
        memo: result.memo,
        memoType: result.memo_type,
        federationAddress: address
      };
    }
    
    // Otherwise, assume it's a public key
    // Validate it starts with G
    if (!address.startsWith('G')) {
      throw new Error('Invalid Stellar address format');
    }
    
    return {
      accountId: address
    };
  } catch (error) {
    console.error('Error parsing address:', error);
    throw error;
  }
}

/**
 * Format account for display
 * Shows federation name if available, otherwise truncated public key
 * @param {string} accountId - Stellar public key
 * @returns {Promise<string>}
 */
export async function formatAccountForDisplay(accountId) {
  try {
    const result = await reverseLookup(accountId);
    return result.stellar_address;
  } catch (error) {
    // If lookup fails, return truncated public key
    return `${accountId.substring(0, 8)}...${accountId.substring(accountId.length - 8)}`;
  }
}

export default {
  resolveFederationName,
  reverseLookup,
  setCustomFederationName,
  getMyFederationName,
  searchFederationNames,
  parseAddress,
  formatAccountForDisplay
};
