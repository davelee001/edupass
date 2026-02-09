import api from './api';

// ============================================================================
// PHASE 3: TIME-BOUNDED TRANSACTIONS
// ============================================================================

/**
 * Create a time-bounded transaction with automatic expiration
 * @param {string} destinationPublicKey - Destination account
 * @param {number} amount - Amount to send
 * @param {number} expiresInMinutes - Minutes until expiration (0 = no expiration)
 * @param {number} validAfterMinutes - Minutes until valid (0 = immediately valid)
 * @param {string} memo - Optional memo
 */
export const createTimeBoundedTransaction = async (
  destinationPublicKey,
  amount,
  expiresInMinutes = 0,
  validAfterMinutes = 0,
  memo = ''
) => {
  try {
    const response = await api.post('/phase3/time-bounded-transaction', {
      destinationPublicKey,
      amount,
      expiresInMinutes,
      validAfterMinutes,
      memo
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Check if a transaction has expired
 * @param {number} maxTime - Maximum time from transaction (unix timestamp)
 */
export const checkTransactionExpiration = async (maxTime) => {
  try {
    const response = await api.get(`/phase3/check-expiration/${maxTime}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ============================================================================
// PHASE 3: MUXED ACCOUNTS
// ============================================================================

/**
 * Create a muxed account for better organization
 * @param {string} id - Unique identifier (numeric string)
 * @param {string} label - Optional label for the muxed account
 */
export const createMuxedAccount = async (id, label = '') => {
  try {
    const response = await api.post('/phase3/create-muxed-account', {
      id,
      label
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get all muxed accounts for the current user
 */
export const getMuxedAccounts = async () => {
  try {
    const response = await api.get('/phase3/muxed-accounts');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Parse a muxed account address to get base account and ID
 * @param {string} muxedAddress - Muxed account address (M...)
 */
export const parseMuxedAccount = async (muxedAddress) => {
  try {
    const response = await api.post('/phase3/parse-muxed-account', {
      muxedAddress
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Send credits to a muxed account
 * @param {string} muxedDestination - Muxed destination address (M...)
 * @param {number} amount - Amount to send
 */
export const sendToMuxedAccount = async (muxedDestination, amount) => {
  try {
    const response = await api.post('/phase3/send-to-muxed', {
      muxedDestination,
      amount
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ============================================================================
// PHASE 3: SEP-24 ANCHOR INTEGRATION
// ============================================================================

/**
 * Initiate a SEP-24 deposit (fiat to crypto)
 * @param {string} assetCode - Asset code to deposit
 * @param {number} amount - Amount to deposit
 * @param {string} anchorDomain - Anchor domain (optional)
 */
export const initiateSEP24Deposit = async (
  assetCode,
  amount,
  anchorDomain = 'testanchor.stellar.org'
) => {
  try {
    const response = await api.post('/phase3/sep24/deposit', {
      assetCode,
      amount,
      anchorDomain
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Initiate a SEP-24 withdrawal (crypto to fiat)
 * @param {string} assetCode - Asset code to withdraw
 * @param {number} amount - Amount to withdraw
 * @param {string} anchorDomain - Anchor domain (optional)
 */
export const initiateSEP24Withdrawal = async (
  assetCode,
  amount,
  anchorDomain = 'testanchor.stellar.org'
) => {
  try {
    const response = await api.post('/phase3/sep24/withdrawal', {
      assetCode,
      amount,
      anchorDomain
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get SEP-24 transaction status
 * @param {string} transactionId - Transaction ID from initiate call
 */
export const getSEP24TransactionStatus = async (transactionId) => {
  try {
    const response = await api.get(`/phase3/sep24/transaction/${transactionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get all SEP-24 transactions for the current user
 */
export const getSEP24Transactions = async () => {
  try {
    const response = await api.get('/phase3/sep24/transactions');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  // Time-bounded transactions
  createTimeBoundedTransaction,
  checkTransactionExpiration,
  
  // Muxed accounts
  createMuxedAccount,
  getMuxedAccounts,
  parseMuxedAccount,
  sendToMuxedAccount,
  
  // SEP-24
  initiateSEP24Deposit,
  initiateSEP24Withdrawal,
  getSEP24TransactionStatus,
  getSEP24Transactions
};
