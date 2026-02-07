/**
 * QR Code Utilities for EduPass
 * Utilities for generating QR code data for various blockchain operations
 */

/**
 * Generate QR data for receiving credits
 * Creates a stellar: URI or JSON payload with account info
 * 
 * @param {string} publicKey - Stellar public key
 * @param {string} assetCode - Asset code (default: EDUPASS)
 * @param {string} assetIssuer - Asset issuer public key
 * @returns {string} QR code data
 */
export const generateReceiveQRData = (publicKey, assetCode = 'EDUPASS', assetIssuer = '') => {
  // Using Stellar SEP-0007 URI scheme
  // Format: web+stellar:pay?destination=GXXX...&asset_code=EDUPASS&asset_issuer=GXXX...
  const params = new URLSearchParams({
    destination: publicKey,
  });
  
  if (assetCode && assetIssuer) {
    params.append('asset_code', assetCode);
    params.append('asset_issuer', assetIssuer);
  }
  
  return `web+stellar:pay?${params.toString()}`;
};

/**
 * Generate QR data for payment request
 * Creates a payment request with amount, memo, and destination
 * 
 * @param {Object} paymentData - Payment request data
 * @param {string} paymentData.destination - Recipient public key
 * @param {string} paymentData.amount - Amount to request
 * @param {string} paymentData.memo - Payment memo/description
 * @param {string} paymentData.assetCode - Asset code
 * @param {string} paymentData.assetIssuer - Asset issuer public key
 * @returns {string} QR code data
 */
export const generatePaymentQRData = ({ destination, amount, memo, assetCode = 'EDUPASS', assetIssuer = '' }) => {
  const params = new URLSearchParams({
    destination,
  });
  
  if (amount) {
    params.append('amount', amount);
  }
  
  if (memo) {
    params.append('memo', memo);
  }
  
  if (assetCode && assetIssuer) {
    params.append('asset_code', assetCode);
    params.append('asset_issuer', assetIssuer);
  }
  
  return `web+stellar:pay?${params.toString()}`;
};

/**
 * Generate QR data for transaction verification
 * Links to Stellar explorer for transaction details
 * 
 * @param {string} transactionHash - Transaction hash
 * @param {string} network - Network (testnet or public)
 * @returns {string} QR code data (explorer URL)
 */
export const generateTransactionQRData = (transactionHash, network = 'testnet') => {
  const baseUrl = network === 'testnet' 
    ? 'https://stellar.expert/explorer/testnet/tx'
    : 'https://stellar.expert/explorer/public/tx';
  
  return `${baseUrl}/${transactionHash}`;
};

/**
 * Generate QR data for account sharing
 * Simple public key sharing with optional metadata
 * 
 * @param {string} publicKey - Stellar public key
 * @param {Object} metadata - Optional metadata (name, role, etc.)
 * @returns {string} QR code data
 */
export const generateAccountQRData = (publicKey, metadata = {}) => {
  if (Object.keys(metadata).length === 0) {
    return publicKey;
  }
  
  // Return JSON with metadata
  return JSON.stringify({
    publicKey,
    ...metadata,
    type: 'edupass-account'
  });
};

/**
 * Parse QR code data
 * Attempts to parse various QR formats (URI, JSON, plain text)
 * 
 * @param {string} data - QR code data
 * @returns {Object} Parsed data with type
 */
export const parseQRData = (data) => {
  try {
    // Try parsing as Stellar URI
    if (data.startsWith('web+stellar:')) {
      const url = new URL(data);
      const params = new URLSearchParams(url.search);
      
      return {
        type: 'stellar-uri',
        action: url.pathname.replace(':', ''),
        destination: params.get('destination'),
        amount: params.get('amount'),
        memo: params.get('memo'),
        assetCode: params.get('asset_code'),
        assetIssuer: params.get('asset_issuer'),
      };
    }
    
    // Try parsing as JSON
    if (data.startsWith('{')) {
      const parsed = JSON.parse(data);
      return {
        type: parsed.type || 'json',
        ...parsed
      };
    }
    
    // Try parsing as transaction URL
    if (data.includes('stellar.expert') || data.includes('stellarchain.io')) {
      const hash = data.split('/').pop();
      return {
        type: 'transaction-url',
        transactionHash: hash,
        url: data
      };
    }
    
    // Assume it's a public key
    if (data.startsWith('G') && data.length === 56) {
      return {
        type: 'public-key',
        publicKey: data
      };
    }
    
    // Unknown format
    return {
      type: 'unknown',
      raw: data
    };
  } catch (error) {
    return {
      type: 'error',
      error: error.message,
      raw: data
    };
  }
};

/**
 * Validate Stellar public key
 * 
 * @param {string} publicKey - Public key to validate
 * @returns {boolean} True if valid
 */
export const isValidPublicKey = (publicKey) => {
  return typeof publicKey === 'string' && 
         publicKey.startsWith('G') && 
         publicKey.length === 56;
};

/**
 * Format amount for QR display
 * 
 * @param {number|string} amount - Amount to format
 * @param {string} assetCode - Asset code
 * @returns {string} Formatted amount
 */
export const formatQRAmount = (amount, assetCode = 'EDUPASS') => {
  const num = parseFloat(amount);
  return `${num.toLocaleString()} ${assetCode}`;
};

/**
 * Generate QR download filename
 * 
 * @param {string} type - QR type (receive, payment, transaction, account)
 * @param {string} identifier - Optional identifier
 * @returns {string} Filename
 */
export const generateQRFilename = (type, identifier = '') => {
  const timestamp = new Date().toISOString().split('T')[0];
  const id = identifier ? `_${identifier.substring(0, 8)}` : '';
  return `edupass_${type}${id}_${timestamp}.png`;
};

export default {
  generateReceiveQRData,
  generatePaymentQRData,
  generateTransactionQRData,
  generateAccountQRData,
  parseQRData,
  isValidPublicKey,
  formatQRAmount,
  generateQRFilename
};
