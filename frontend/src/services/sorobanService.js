import api from './api';

/**
 * Frontend service for Soroban smart contract interactions
 * All requests are proxied through the backend API
 */

const sorobanService = {
  // Transaction status tracking
  pendingTransactions: new Map(),

  /**
   * Check Soroban network health
   * @returns {Promise} Health status
   */
  async checkHealth() {
    try {
      const response = await api.get('/soroban/health');
      return response.data;
    } catch (error) {
      console.error('Failed to check health:', error);
      return { healthy: false, error: error.message };
    }
  },

  /**
   * Track a pending transaction
   * @param {string} txHash - Transaction hash
   * @param {object} metadata - Transaction metadata
   */
  trackTransaction(txHash, metadata) {
    this.pendingTransactions.set(txHash, {
      ...metadata,
      timestamp: Date.now(),
      status: 'pending',
    });
  },

  /**
   * Get pending transaction status
   * @param {string} txHash - Transaction hash
   * @returns {object|null} Transaction info
   */
  getPendingTransaction(txHash) {
    return this.pendingTransactions.get(txHash) || null;
  },

  /**
   * Clear completed transaction
   * @param {string} txHash - Transaction hash
   */
  clearTransaction(txHash) {
    this.pendingTransactions.delete(txHash);
  },

  /**
   * Get all pending transactions
   * @returns {Array} Pending transactions
   */
  getAllPendingTransactions() {
    return Array.from(this.pendingTransactions.entries()).map(([hash, data]) => ({
      hash,
      ...data,
    }));
  },
  /**
   * Initialize the Soroban smart contract
   * Only for issuers/admins
   * @param {string} issuerKey - The Stellar public key of the issuer
   * @param {string} assetCode - The asset code (e.g., 'EDUPASS')
   * @returns {Promise} Transaction result
   */
  async initializeContract(issuerKey, assetCode) {
    try {
      const response = await api.post('/soroban/initialize', {
        issuer_key: issuerKey,
        asset_code: assetCode
      });
      
      if (response.data.transactionHash) {
        this.trackTransaction(response.data.transactionHash, {
          type: 'initialize',
          issuerKey,
          assetCode,
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      throw this.enhanceError(error, 'Contract initialization');
    }
  },

  /**
   * Issue credits to a beneficiary via smart contract
   * @param {string} beneficiaryId - Database ID of the beneficiary
   * @param {number} amount - Amount of credits to issue
   * @param {string} description - Description of the issuance
   * @param {string} expiresAt - ISO date string for expiration (optional)
   * @returns {Promise} Transaction and allocation data
   */
  async issueCredits(beneficiaryId, amount, description, expiresAt = null) {
    try {
      const response = await api.post('/soroban/issue', {
        beneficiary_id: beneficiaryId,
        amount,
        description,
        expires_at: expiresAt
      });
      
      if (response.data.transaction?.transactionHash) {
        this.trackTransaction(response.data.transaction.transactionHash, {
          type: 'issue',
          beneficiaryId,
          amount,
          description,
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to issue credits:', error);
      throw this.enhanceError(error, 'Credit issuance');
    }
  },

  /**
   * Transfer credits between accounts
   * @param {string} toKey - Recipient's Stellar public key
   * @param {number} amount - Amount to transfer
   * @
      if (response.data.transactionHash) {
        this.trackTransaction(response.data.transactionHash, {
          type: 'transfer',
          toKey,
          amount,
          description,
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to transfer credits:', error);
      throw this.enhanceError(error, 'Credit transfer')redits(toKey, amount, description) {
    try {
      const response = await api.post('/soroban/transfer', {
        to: toKey,
        amount,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Failed to transfer credits:', error);
      throw error;
    }
  },

  /**
   * Burn (redeem) credits at a school
   * @param {number} amount - Amount of credits to burn
   * @param {string} schoolId - Database ID of the school
   * @
      if (response.data.transactionHash) {
        this.trackTransaction(response.data.transactionHash, {
          type: 'burn',
          amount,
          schoolId,
          description,
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to burn credits:', error);
      throw this.enhanceError(error, 'Credit redemption')ts(amount, schoolId, description) {
    try {
      const response = await api.post('/soroban/burn', {
        amount,
        school_id: schoolId,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Failed to burn credits:', error);
      throw error;
    }
  },

  /**
   * Get the balance for a specific Stellar key from smart contract
   * @param {string} key - Stellar public key
   * @returns {Promise} Balance data
   */
  async getBalance(key) {
    try {
      const response = await api.get(`/soroban/balance/${key}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  },

  /**
   * Get allocation metadata for a specific key
   * @param {string} key - Stellar public key
   * @returns {Promise} Allocation metadata (purpose, expiration, etc.)
   */
  async getAllocation(key) {
    try {
      const response = await api.get(`/soroban/allocation/${key}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get allocation:', error);
      throw error;
    }
  },

  /**
   * Get total credits issued by the contract
   * @returns {Promise} Total issued amount
   */
  async getTotalIssued() {
    try {
      const response = await api.get('/soroban/total-issued');
      return response.data;
    } catch (error) {
      console.error('Failed to get total issued:', error);
      throw error;
    }
  },

  /**
   * Check if a user's credits have expired
   * @param {string} key - Stellar public key
   * @returns {Promise<boolean>} True if expired
   */
  async checkExpiration(key) {
    try {
      const allocation = await this.getAllocation(key);
      if (!allocation.data.expiration) {
        return false; // No expiration set
      }
      
      const expirationDate = new Date(allocation.data.expiration);
      return expirationDate < new Date();
    } catch (error) {
      console.error('Failed to check expiration:', error);
      throw error;
    }
  },

  /**
   * Get formatted balance with allocation info
   * Useful for dashboard displays
   * @param {string} key - Stellar public key
   * @returns {Promise} Combined balance and allocation data
   */
  async getBalanceWithAllocation(key) {
    try {
      const [balanceRes, allocationRes] = await Promise.all([
        this.getBalance(key),
        this.getAllocation(key)
      ]);

      return {
        balance: balanceRes.data.balance,
        allocation: allocationRes.data,
        isExpired: allocationRes.data.expiration ? 
          new Date(allocationRes.data.expiration) < new Date() : 
          false
      };
    } catch (error) {
      console.error('Failed to get balance with allocation:', error);
      throw this.enhanceError(error, 'Balance retrieval');
    }
  },

  /**
   * Enhance error with user-friendly message
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {Error} Enhanced error
   */
  enhanceError(error, operation) {
    const messages = {
      'Network Error': 'Unable to connect to Stellar network. Please check your connection.',
      'timeout': 'Transaction timeout. Please try again.',
      '401': 'Authentication required. Please log in.',
      '403': 'You do not have permission to perform this action.',
      '404': 'Resource not found.',
      'insufficient balance': 'Insufficient credits for this transaction.',
      'expired': 'Credits have expired.',
    };

    let userMessage = `${operation} failed`;
    
    for (const [key, msg] of Object.entries(messages)) {
      if (error.message?.includes(key) || error.response?.status?.toString() === key) {
        userMessage = msg;
        break;
      }
    }

    const enhancedError = new Error(userMessage);
    enhancedError.originalError = error;
    enhancedError.operation = operation;
    
    return enhancedError;
  },

  /**
   * Format amount for display
   * @param {number} amount - Amount in stroops or smallest unit
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted amount
   */
  formatAmount(amount, decimals = 2) {
    return (amount / Math.pow(10, 7)).toFixed(decimals);
  },

  /**
   * Validate Stellar public key format
   * @param {string} key - Public key to validate
   * @returns {boolean} True if valid
   */
  isValidPublicKey(key) {
    return /^G[A-Z0-9]{55}$/.test(key);
  },

  /**
   * Estimate transaction fee
   * @param {string} operationType - Type of operation
   * @returns {number} Estimated fee in stroops
   */
  estimateFee(operationType) {
    const baseFees = {
      'issue': 100000,
      'transfer': 50000,
      'burn': 50000,
      'initialize': 150000,
    };

    return baseFees[operationType] || 100000;
  },

  /**
   * Check if credits will expire soon
   * @param {string} expirationDate - ISO date string
   * @param {number} daysThreshold - Days before considering "soon"
   * @returns {boolean} True if expiring soon
   */
  isExpiringSoon(expirationDate, daysThreshold = 7) {
    if (!expirationDate) return false;
    
    const expDate = new Date(expirationDate);
    const daysUntil = (expDate - new Date()) / (1000 * 60 * 60 * 24);
    
    return daysUntil > 0 && daysUntil <= daysThreshold;
  },

  /**
   * Get Stellar explorer URL for transaction
   * @param {string} txHash - Transaction hash
   * @param {string} network - 'testnet' or 'public'
   * @returns {string} Explorer URL
   */
  getExplorerUrl(txHash, network = 'testnet') {
    const baseUrl = network === 'testnet' 
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
    
    return `${baseUrl}/tx/${txHash}`;
  },

  /**
   * Batch get balances for multiple keys
   * @param {Array<string>} keys - Array of public keys
   * @returns {Promise<Object>} Map of key to balance
   */
  async batchGetBalances(keys) {
    try {
      const response = await api.post('/soroban/batch-balances', { keys });
      return response.data;
    } catch (error) {
      console.error('Failed to batch get balances:', error);
      throw this.enhanceError(error, 'Batch balance retrieval');
    }
  }
};

export default sorobanService;
