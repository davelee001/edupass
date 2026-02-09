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

// ============================================================================
// PHASE 3: PATH PAYMENTS
// ============================================================================

/**
 * Send path payment with automatic asset conversion
 * @param {string} destinationPublicKey - Destination account
 * @param {number} destAmount - Amount destination should receive
 * @param {number} sendMax - Maximum amount willing to send
 * @param {string} destAssetCode - Destination asset code (optional)
 * @param {string} sendAssetCode - Source asset code (optional)
 * @param {array} path - Path of assets for conversion (optional)
 */
export const sendPathPayment = async (
  destinationPublicKey,
  destAmount,
  sendMax,
  destAssetCode = 'EDUPASS',
  sendAssetCode = null,
  path = []
) => {
  try {
    const response = await api.post('/phase3/path-payment', {
      destinationPublicKey,
      destAmount,
      sendMax,
      destAssetCode,
      sendAssetCode,
      path
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Find payment paths between assets
 * @param {string} destinationPublicKey - Destination account
 * @param {string} destAssetCode - Destination asset code
 * @param {number} destAmount - Amount to receive
 */
export const findPaymentPaths = async (
  destinationPublicKey,
  destAssetCode,
  destAmount
) => {
  try {
    const response = await api.post('/phase3/find-paths', {
      destinationPublicKey,
      destAssetCode,
      destAmount
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ============================================================================
// PHASE 3: MANAGE DATA
// ============================================================================

/**
 * Store or delete data entry on account
 * @param {string} name - Data entry name (max 64 bytes)
 * @param {string} value - Data entry value (null to delete)
 */
export const manageAccountData = async (name, value = null) => {
  try {
    const response = await api.post('/phase3/manage-data', {
      name,
      value
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get all data entries for current account
 */
export const getAccountData = async () => {
  try {
    const response = await api.get('/phase3/account-data');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ============================================================================
// PHASE 3: ACCOUNT MERGE
// ============================================================================

/**
 * Merge current account into another account
 * @param {string} destinationPublicKey - Account to merge into
 */
export const mergeAccount = async (destinationPublicKey) => {
  try {
    const response = await api.post('/phase3/merge-account', {
      destinationPublicKey
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Check if current account can be merged
 */
export const canMergeAccount = async () => {
  try {
    const response = await api.get('/phase3/can-merge');
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
  getSEP24Transactions,
  
  // Path payments
  sendPathPayment,
  findPaymentPaths,
  
  // Manage data
  manageAccountData,
  getAccountData,
  
  // Account merge
  mergeAccount,
  canMergeAccount
};
