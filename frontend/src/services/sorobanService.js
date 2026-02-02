import api from './api';

/**
 * Frontend service for Soroban smart contract interactions
 * All requests are proxied through the backend API
 */

const sorobanService = {
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
      return response.data;
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error('Failed to issue credits:', error);
      throw error;
    }
  },

  /**
   * Transfer credits between accounts
   * @param {string} toKey - Recipient's Stellar public key
   * @param {number} amount - Amount to transfer
   * @param {string} description - Transfer description
   * @returns {Promise} Transaction result
   */
  async transferCredits(toKey, amount, description) {
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
   * @param {string} description - Redemption description
   * @returns {Promise} Redemption and transaction data
   */
  async burnCredits(amount, schoolId, description) {
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
      throw error;
    }
  }
};

export default sorobanService;
