import api from './api';

/**
 * Sponsorship Service
 * Handles sponsored reserves and fee-bump transactions
 */

/**
 * Create a sponsored account
 * @param {string} newAccountPublicKey - Public key of the new account
 * @param {string} startingBalance - Starting balance (optional)
 * @returns {Promise<object>}
 */
export async function createSponsoredAccount(newAccountPublicKey, startingBalance = '0') {
  const response = await api.post('/sponsorship/account', {
    newAccountPublicKey,
    startingBalance
  });
  return response.data;
}

/**
 * Establish a sponsored trustline
 * @param {string} accountSecretKey - Secret key of the account
 * @param {string} assetCode - Asset code (e.g., 'EDUPASS')
 * @param {string} assetIssuer - Issuer's public key
 * @param {string} limit - Trust limit (optional)
 * @returns {Promise<object>}
 */
export async function establishSponsoredTrustline(accountSecretKey, assetCode, assetIssuer, limit = null) {
  const response = await api.post('/sponsorship/trustline', {
    accountSecretKey,
    assetCode,
    assetIssuer,
    limit
  });
  return response.data;
}

/**
 * Sponsor transaction fees using fee-bump
 * @param {string} innerTransactionXdr - XDR of the inner transaction
 * @param {string} baseFee - Base fee (optional)
 * @returns {Promise<object>}
 */
export async function sponsorTransactionFees(innerTransactionXdr, baseFee = null) {
  const response = await api.post('/sponsorship/fees', {
    innerTransactionXdr,
    baseFee
  });
  return response.data;
}

/**
 * Get sponsorship information for an account
 * @param {string} accountId - Stellar public key
 * @returns {Promise<object>}
 */
export async function getSponsorshipInfo(accountId) {
  const response = await api.get(`/sponsorship/info/${accountId}`);
  return response.data;
}

/**
 * Get sponsorship history for current user
 * @returns {Promise<object>}
 */
export async function getSponsorshipHistory() {
  const response = await api.get('/sponsorship/history');
  return response.data;
}

/**
 * Revoke sponsorship for an account
 * @param {string} accountId - Stellar public key
 * @returns {Promise<object>}
 */
export async function revokeSponsorship(accountId) {
  const response = await api.delete(`/sponsorship/${accountId}`);
  return response.data;
}

/**
 * Get sponsor account balance and budget status
 * @returns {Promise<object>} - Balance info, stats, and budget status
 */
export async function getSponsorBalance() {
  const response = await api.get('/sponsorship/balance');
  return response.data;
}

export default {
  createSponsoredAccount,
  establishSponsoredTrustline,
  sponsorTransactionFees,
  getSponsorshipInfo,
  getSponsorshipHistory,
  revokeSponsorship,
  getSponsorBalance
};
