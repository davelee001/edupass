const { Contract, Address, nativeToScVal, scValToNative } = require('@stellar/stellar-sdk');
const StellarSdk = require('@stellar/stellar-sdk');
const logger = require('../utils/logger');

// Contract configuration
const CONTRACT_ID = process.env.SOROBAN_CONTRACT_ID;
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'testnet' 
  ? StellarSdk.Networks.TESTNET 
  : StellarSdk.Networks.PUBLIC;

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // milliseconds
const TX_POLL_INTERVAL = 1000; // milliseconds
const TX_POLL_TIMEOUT = 30000; // milliseconds

class SorobanContractService {
  constructor() {
    this.server = new StellarSdk.Horizon.Server(HORIZON_URL);
    this.contract = new Contract(CONTRACT_ID);
    this.readCache = new Map(); // Simple cache for read operations
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Check if connection to Stellar network is healthy
   */
  async healthCheck() {
    try {
      const ledgers = await this.server.ledgers().limit(1).call();
      return {
        healthy: true,
        network: process.env.STELLAR_NETWORK || 'testnet',
        latestLedger: ledgers.records[0]?.sequence,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Wait for transaction to be confirmed
   * @param {string} txHash - Transaction hash
   * @returns {Promise} Transaction result
   */
  async waitForTransaction(txHash) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < TX_POLL_TIMEOUT) {
      try {
        const tx = await this.server.transactions().transaction(txHash).call();
        if (tx.successful) {
          logger.info('Transaction confirmed', { hash: txHash });
          return tx;
        }
        if (!tx.successful) {
          throw new Error(`Transaction failed: ${tx.result_xdr}`);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // Transaction not yet in ledger, wait and retry
          await new Promise(resolve => setTimeout(resolve, TX_POLL_INTERVAL));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Simulate transaction before submitting
   * @param {Transaction} transaction - Transaction to simulate
   * @returns {Promise} Simulation result
   */
  async simulateTransaction(transaction) {
    try {
      const simulated = await this.server.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
        logger.error('Transaction simulation failed', { error: simulated.error });
        throw new Error(`Simulation failed: ${simulated.error}`);
      }
      
      logger.debug('Transaction simulation successful', {
        cost: simulated.cost,
        latestLedger: simulated.latestLedger,
      });
      
      return simulated;
    } catch (error) {
      logger.error('Error simulating transaction:', error);
      throw error;
    }
  }

  /**
   * Submit transaction with retry logic
   * @param {Transaction} transaction - Transaction to submit
   * @param {number} retries - Number of retries remaining
   * @returns {Promise} Transaction result
   */
  async submitWithRetry(transaction, retries = MAX_RETRIES) {
    try {
      const result = await this.server.submitTransaction(transaction);
      
      // Wait for confirmation
      await this.waitForTransaction(result.hash);
      
      return result;
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        logger.warn(`Transaction failed, retrying... (${retries} attempts left)`, {
          error: error.message,
        });
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.submitWithRetry(transaction, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'timeout',
      'network',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'tx_bad_seq', // Sequence number issue
    ];
    
    return retryableErrors.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Parse contract events from transaction result
   * @param {object} txResult - Transaction result
   * @returns {Array} Parsed events
   */
  parseContractEvents(txResult) {
    try {
      if (!txResult.result_meta_xdr) {
        return [];
      }
      
      const meta = StellarSdk.xdr.TransactionMeta.fromXDR(
        txResult.result_meta_xdr,
        'base64'
      );
      
      const events = [];
      // Parse Soroban events from meta
      // This is a simplified version - adjust based on actual event structure
      
      logger.debug('Contract events parsed', { count: events.length });
      return events;
    } catch (error) {
      logger.error('Error parsing contract events:', error);
      return [];
    }
  }

  /**
   * Get cached value or execute function
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @returns {Promise} Cached or fresh value
   */
  async getCached(key, fn) {
    const cached = this.readCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug('Cache hit', { key });
      return cached.value;
    }
    
    const value = await fn();
    this.readCache.set(key, { value, timestamp: Date.now() });
    
    // Clean up old cache entries
    if (this.readCache.size > 1000) {
      const oldestKeys = Array.from(this.readCache.keys()).slice(0, 100);
      oldestKeys.forEach(k => this.readCache.delete(k));
    }
    
    return value;
  }

  /**
   * Initialize the contract with admin address
   * @param {string} adminSecretKey - Admin's secret key
   * @param {string} adminPublicKey - Admin's public key
   */
  async initialize(adminSecretKey, adminPublicKey) {
    try {
      const sourceKeypair = StellarSdk.Keypair.fromSecret(adminSecretKey);
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'initialize',
            new Address(adminPublicKey).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);
      
      // Simulate before submitting
      await this.simulateTransaction(transaction);
      
      const result = await this.submitWithRetry(transaction);
      
      logger.info('Contract initialized successfully', { hash: result.hash });
      return result;
    } catch (error) {
      logger.error('Error initializing contract:', error);
      throw error;
    }
  }

  /**
   * Issue credits to a beneficiary
   * @param {string} issuerSecretKey - Issuer's secret key
   * @param {string} beneficiaryPublicKey - Beneficiary's public key
   * @param {number} amount - Amount of credits to issue
   * @param {string} purpose - Purpose of the credit allocation
   * @param {number} expiresAt - Unix timestamp for expiration
   */
  async issueCredits(issuerSecretKey, beneficiaryPublicKey, amount, purpose, expiresAt) {
    try {
      const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
      const sourceAccount = await this.server.loadAccount(issuerKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'issue_credits',
            new Address(issuerKeypair.publicKey()).toScVal(),
            new Address(beneficiaryPublicKey).toScVal(),
            nativeToScVal(amount, { type: 'i128' }),
            nativeToScVal(purpose, { type: 'string' }),
            nativeToScVal(expiresAt, { type: 'u64' })
          )
        )
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeypair);
      
      // Simulate before submitting
      await this.simulateTransaction(transaction);
      
      const result = await this.submitWithRetry(transaction);
      
      // Parse events
      const events = this.parseContractEvents(result);

      logger.info('Credits issued successfully', {
        hash: result.hash,
        beneficiary: beneficiaryPublicKey,
        amount,
        events: events.length,
      });

      return {
        success: true,
        transactionHash: result.hash,
        beneficiary: beneficiaryPublicKey,
        amount,
        purpose,
        expiresAt,
        events,
      };
    } catch (error) {
      logger.error('Error issuing credits:', error);
      throw error;
    }
  }

  /**
   * Transfer credits from one account to another
   * @param {string} fromSecretKey - Sender's secret key
   * @param {string} toPublicKey - Recipient's public key
   * @param {number} amount - Amount to transfer
   */
  async transferCredits(fromSecretKey, toPublicKey, amount) {
    try {
      const fromKeypair = StellarSdk.Keypair.fromSecret(fromSecretKey);
      const sourceAccount = await this.server.loadAccount(fromKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'transfer',
            new Address(fromKeypair.publicKey()).toScVal(),
            new Address(toPublicKey).toScVal(),
            nativeToScVal(amount, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      transaction.sign(fromKeypair);
      
      // Simulate before submitting
      await this.simulateTransaction(transaction);
      
      const result = await this.submitWithRetry(transaction);
      
      // Parse events
      const events = this.parseContractEvents(result);

      logger.info('Credits transferred successfully', {
        hash: result.hash,
        from: fromKeypair.publicKey(),
        to: toPublicKey,
        amount,
        events: events.length,
      });

      return {
        success: true,
        transactionHash: result.hash,
        from: fromKeypair.publicKey(),
        to: toPublicKey,
        amount,
        events,
      };
    } catch (error) {
      logger.error('Error transferring credits:', error);
      throw error;
    }
  }

  /**
   * Burn (redeem) credits
   * @param {string} accountSecretKey - Account's secret key
   * @param {number} amount - Amount to burn
   */
  async burnCredits(accountSecretKey, amount) {
    try {
      const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecretKey);
      const sourceAccount = await this.server.loadAccount(accountKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'burn',
            new Address(accountKeypair.publicKey()).toScVal(),
            nativeToScVal(amount, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      transaction.sign(accountKeypair);
      
      // Simulate before submitting
      await this.simulateTransaction(transaction);
      
      const result = await this.submitWithRetry(transaction);
      
      // Parse events
      const events = this.parseContractEvents(result);

      logger.info('Credits burned successfully', {
        hash: result.hash,
        account: accountKeypair.publicKey(),
        amount,
        events: events.length,
      });

      return {
        success: true,
        transactionHash: result.hash,
        account: accountKeypair.publicKey(),
        amount,
        events,
      };
    } catch (error) {
      logger.error('Error burning credits:', error);
      throw error;
    }
  }

  /**
   * Get balance for an account
   * @param {string} accountPublicKey - Account's public key
   */
  async getBalance(accountPublicKey) {
    try {
      // Use cache for read operations
      return await this.getCached(`balance_${accountPublicKey}`, async () => {
        const result = await this.contract.call(
          'balance',
          new Address(accountPublicKey).toScVal()
        );

        const balance = scValToNative(result);
        
        logger.debug('Balance retrieved', { account: accountPublicKey, balance });
        
        return balance;
      });
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Get allocation details for a beneficiary
   * @param {string} beneficiaryPublicKey - Beneficiary's public key
   */
  async getAllocation(beneficiaryPublicKey) {
    try {
      // Use cache for read operations
      return await this.getCached(`allocation_${beneficiaryPublicKey}`, async () => {
        const result = await this.contract.call(
          'get_allocation',
          new Address(beneficiaryPublicKey).toScVal()
        );

        const allocation = scValToNative(result);
        
        logger.debug('Allocation retrieved', { beneficiary: beneficiaryPublicKey });
        
        return allocation;
      });
    } catch (error) {
      logger.error('Error getting allocation:', error);
      throw error;
    }
  }

  /**
   * Get total credits issued
   */
  async getTotalIssued() {
    try {
      // Use cache for read operations
      return await this.getCached('total_issued', async () => {
        const result = await this.contract.call('total_issued');
        const total = scValToNative(result);
        
        logger.debug('Total issued retrieved', { total });
        
        return total;
      });
    } catch (error) {
      logger.error('Error getting total issued:', error);
      throw error;
    }
  }

  /**
   * Clear cache (useful after write operations)
   * @param {string} key - Specific key to clear, or null to clear all
   */
  clearCache(key = null) {
    if (key) {
      this.readCache.delete(key);
      logger.debug('Cache cleared', { key });
    } else {
      this.readCache.clear();
      logger.debug('All cache cleared');
    }
  }

  /**
   * Batch get balances for multiple accounts
   * @param {Array<string>} publicKeys - Array of public keys
   * @returns {Promise<Object>} Map of public key to balance
   */
  async batchGetBalances(publicKeys) {
    try {
      const balances = await Promise.all(
        publicKeys.map(async (key) => {
          const balance = await this.getBalance(key);
          return { key, balance };
        })
      );
      
      return balances.reduce((acc, { key, balance }) => {
        acc[key] = balance;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error batch getting balances:', error);
      throw error;
    }
  }
}

module.exports = new SorobanContractService();
