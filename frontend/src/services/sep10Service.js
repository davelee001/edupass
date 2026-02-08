import * as StellarSdk from 'stellar-sdk';
import api from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * SEP-10 Authentication Service
 * Provides Stellar-native authentication using challenge-response
 */
class SEP10Service {
  /**
   * Authenticate a user with SEP-10
   * @param {string} secretKey - The user's Stellar secret key
   * @returns {Promise<{token: string, account: string}>}
   */
  async authenticate(secretKey) {
    try {
      // Create keypair from secret
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const publicKey = keypair.publicKey();

      // Step 1: Request challenge from server
      const challengeResponse = await fetch(
        `${API_BASE}/sep10/challenge?account=${publicKey}`
      );

      if (!challengeResponse.ok) {
        const error = await challengeResponse.json();
        throw new Error(error.error || 'Failed to get challenge');
      }

      const { transaction: challengeXdr, network_passphrase } = 
        await challengeResponse.json();

      // Step 2: Sign the challenge transaction
      const transaction = new StellarSdk.Transaction(
        challengeXdr,
        network_passphrase
      );

      // Client signs the transaction
      transaction.sign(keypair);

      // Step 3: Submit signed transaction to get JWT
      const tokenResponse = await fetch(`${API_BASE}/sep10/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction: transaction.toXDR(),
          account: publicKey
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error || 'Failed to get token');
      }

      const { token, expires_in } = await tokenResponse.json();

      // Store token and account info
      localStorage.setItem('sep10_token', token);
      localStorage.setItem('stellar_account', publicKey);
      localStorage.setItem('token_expires', Date.now() + (expires_in * 1000));

      return { token, account: publicKey };
    } catch (error) {
      console.error('SEP-10 authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get stored SEP-10 token
   * @returns {string|null}
   */
  getToken() {
    const token = localStorage.getItem('sep10_token');
    const expires = localStorage.getItem('token_expires');

    // Check if token has expired
    if (expires && Date.now() > parseInt(expires)) {
      this.logout();
      return null;
    }

    return token;
  }

  /**
   * Get stored Stellar account
   * @returns {string|null}
   */
  getAccount() {
    return localStorage.getItem('stellar_account');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Verify the current token
   * @returns {Promise<{valid: boolean, account?: string, role?: string}>}
   */
  async verifyToken() {
    const token = this.getToken();
    
    if (!token) {
      return { valid: false };
    }

    try {
      const response = await fetch(`${API_BASE}/sep10/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Token verification failed:', error);
      return { valid: false };
    }
  }

  /**
   * Logout and clear stored credentials
   */
  logout() {
    localStorage.removeItem('sep10_token');
    localStorage.removeItem('stellar_account');
    localStorage.removeItem('token_expires');
  }

  /**
   * Authenticate and update API client
   * @param {string} secretKey - The user's Stellar secret key
   * @returns {Promise<object>} User data
   */
  async authenticateAndSetup(secretKey) {
    const { token, account } = await this.authenticate(secretKey);
    
    // Update the API service to use this token
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Verify and get user info
    const userInfo = await this.verifyToken();
    
    return {
      token,
      account,
      ...userInfo
    };
  }
}

export default new SEP10Service();
