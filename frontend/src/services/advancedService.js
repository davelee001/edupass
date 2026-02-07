import api from './api';

/**
 * Frontend service for Phase 1 Advanced Features
 * Handles: Clawback, Asset Authorization, Multi-signature
 */

const advancedService = {
  // =========================================================================
  // CLAWBACK & AUTHORIZATION
  // =========================================================================

  /**
   * Enable asset authorization controls (AUTH_REQUIRED, CLAWBACK_ENABLED)
   * @returns {Promise} Transaction result
   */
  async enableAssetControls() {
    try {
      const response = await api.post('/advanced/enable-asset-controls');
      return response.data;
    } catch (error) {
      console.error('Failed to enable asset controls:', error);
      throw error;
    }
  },

  /**
   * Authorize an account to hold EDUPASS credits
   * @param {string} accountPublicKey - Account to authorize
   * @param {string} reason - Reason for authorization
   * @returns {Promise} Authorization result
   */
  async authorizeAccount(accountPublicKey, reason = '') {
    try {
      const response = await api.post('/advanced/authorize-account', {
        accountPublicKey,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Failed to authorize account:', error);
      throw error;
    }
  },

  /**
   * Revoke account authorization (freeze account)
   * @param {string} accountPublicKey - Account to revoke
   * @param {string} reason - Reason for revocation
   * @returns {Promise} Revocation result
   */
  async revokeAuthorization(accountPublicKey, reason) {
    try {
      const response = await api.post('/advanced/revoke-authorization', {
        accountPublicKey,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Failed to revoke authorization:', error);
      throw error;
    }
  },

  /**
   * Clawback credits from an account
   * @param {string} fromAccountPublicKey - Account to clawback from
   * @param {number} amount - Amount to clawback
   * @param {string} reason - Reason for clawback
   * @returns {Promise} Clawback result
   */
  async clawbackCredits(fromAccountPublicKey, amount, reason) {
    try {
      const response = await api.post('/advanced/clawback', {
        fromAccountPublicKey,
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Failed to clawback credits:', error);
      throw error;
    }
  },

  /**
   * Get authorization status for an account
   * @param {string} publicKey - Account public key
   * @returns {Promise} Authorization status
   */
  async getAuthorizationStatus(publicKey) {
    try {
      const response = await api.get(`/advanced/authorization-status/${publicKey}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get authorization status:', error);
      throw error;
    }
  },

  /**
   * Get clawback history
   * @returns {Promise} Clawback history
   */
  async getClawbackHistory() {
    try {
      const response = await api.get('/advanced/clawback-history');
      return response.data;
    } catch (error) {
      console.error('Failed to get clawback history:', error);
      throw error;
    }
  },

  // =========================================================================
  // MULTI-SIGNATURE
  // =========================================================================

  /**
   * Add signer to account for multi-sig
   * @param {string} signerPublicKey - Signer to add
   * @param {number} weight - Signer weight (1-255)
   * @returns {Promise} Add signer result
   */
  async addSigner(signerPublicKey, weight = 1) {
    try {
      const response = await api.post('/advanced/add-signer', {
        signerPublicKey,
        weight
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add signer:', error);
      throw error;
    }
  },

  /**
   * Remove signer from account
   * @param {string} signerPublicKey - Signer to remove
   * @returns {Promise} Remove signer result
   */
  async removeSigner(signerPublicKey) {
    try {
      const response = await api.post('/advanced/remove-signer', {
        signerPublicKey
      });
      return response.data;
    } catch (error) {
      console.error('Failed to remove signer:', error);
      throw error;
    }
  },

  /**
   * Set account thresholds for multi-sig requirements
   * @param {number} low - Low threshold (allow trust, bump sequence)
   * @param {number} medium - Medium threshold (everything else)
   * @param {number} high - High threshold (set options, account merge)
   * @returns {Promise} Set thresholds result
   */
  async setThresholds(low, medium, high) {
    try {
      const response = await api.post('/advanced/set-thresholds', {
        low,
        medium,
        high
      });
      return response.data;
    } catch (error) {
      console.error('Failed to set thresholds:', error);
      throw error;
    }
  },

  /**
   * Get account signers and thresholds
   * @param {string} publicKey - Account public key
   * @returns {Promise} Signers and thresholds
   */
  async getSigners(publicKey) {
    try {
      const response = await api.get(`/advanced/signers/${publicKey}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get signers:', error);
      throw error;
    }
  },

  /**
   * Create multi-sig transaction
   * @param {Array} operations - Array of operations
   * @param {string} memo - Optional memo
   * @returns {Promise} Transaction XDR and hash
   */
  async createMultiSigTransaction(operations, memo = '') {
    try {
      const response = await api.post('/advanced/create-multisig-transaction', {
        operations,
        memo
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create multi-sig transaction:', error);
      throw error;
    }
  },

  /**
   * Sign a multi-sig transaction
   * @param {string} transactionXDR - Transaction XDR to sign
   * @returns {Promise} Signed transaction  XDR
   */
  async signTransaction(transactionXDR) {
    try {
      const response = await api.post('/advanced/sign-transaction', {
        transactionXDR
      });
      return response.data;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  },

  /**
   * Submit fully signed multi-sig transaction
   * @param {string} signedXDR - Fully signed transaction XDR
   * @returns {Promise} Submission result
   */
  async submitMultiSigTransaction(signedXDR) {
    try {
      const response = await api.post('/advanced/submit-multisig-transaction', {
        signedXDR
      });
      return response.data;
    } catch (error) {
      console.error('Failed to submit multi-sig transaction:', error);
      throw error;
    }
  },

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  /**
   * Check if an account is frozen/revoked
   * @param {string} publicKey - Account to check
   * @returns {Promise<boolean>} True if frozen
   */
  async isAccountFrozen(publicKey) {
    try {
      const status = await this.getAuthorizationStatus(publicKey);
      return status.authorized === false;
    } catch (error) {
      console.error('Failed to check if account is frozen:', error);
      return false;
    }
  },

  /**
   * Format clawback reason for display
   * @param {string} reason - Clawback reason
   * @returns {string} Formatted reason
   */
  formatClawbackReason(reason) {
    const reasons = {
      'fraud': '🚨 Fraudulent Activity Detected',
      'expired': '⏰ Credits Expired',
      'violation': '⚠️ Terms Violation',
      'error': '🔧 Administrative Error',
      'refund': '💰 Refund Processed'
    };

    for (const [key, value] of Object.entries(reasons)) {
      if (reason.toLowerCase().includes(key)) {
        return value;
      }
    }

    return reason;
  },

  /**
   * Calculate required signatures for a threshold
   * @param {object} thresholds - Account thresholds
   * @param {string} operationType - 'low', 'medium', or 'high'
   * @returns {number} Required signature weight
   */
  getRequiredSignatures(thresholds, operationType = 'medium') {
    const thresholdMap = {
      'low': thresholds?.low_threshold || 0,
      'medium': thresholds?.med_threshold || 1,
      'high': thresholds?.high_threshold || 2
    };

    return thresholdMap[operationType] || 1;
  },

  /**
   * Check if account meets multi-sig threshold
   * @param {Array} signers - Account signers
   * @param {object} thresholds - Account thresholds
   * @param {number} signatureWeight - Current signature weight
   * @param {string} operationType - Operation type
   * @returns {boolean} True if threshold met
   */
  meetsThreshold(signers, thresholds, signatureWeight, operationType = 'medium') {
    const required = this.getRequiredSignatures(thresholds, operationType);
    return signatureWeight >= required;
  },

  /**
   * Get Stellar explorer URL for clawback transaction
   * @param {string} txHash - Transaction hash
   * @param {string} network - 'testnet' or 'public'
   * @returns {string} Explorer URL
   */
  getClawbackExplorerUrl(txHash, network = 'testnet') {
    const baseUrl = network === 'testnet' 
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
    
    return `${baseUrl}/tx/${txHash}`;
  }
};

export default advancedService;
