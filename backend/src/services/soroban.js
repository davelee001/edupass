const { Contract, Address, nativeToScVal, scValToNative } = require('@stellar/stellar-sdk');
const StellarSdk = require('@stellar/stellar-sdk');
const logger = require('../utils/logger');

// Contract configuration
const CONTRACT_ID = process.env.SOROBAN_CONTRACT_ID;
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'testnet' 
  ? StellarSdk.Networks.TESTNET 
  : StellarSdk.Networks.PUBLIC;

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

class SorobanContractService {
  constructor() {
    this.server = new StellarSdk.Horizon.Server(HORIZON_URL);
    this.contract = new Contract(CONTRACT_ID);
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
      const result = await this.server.submitTransaction(transaction);
      
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
      const result = await this.server.submitTransaction(transaction);

      logger.info('Credits issued successfully', {
        hash: result.hash,
        beneficiary: beneficiaryPublicKey,
        amount,
      });

      return {
        success: true,
        transactionHash: result.hash,
        beneficiary: beneficiaryPublicKey,
        amount,
        purpose,
        expiresAt,
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
      const result = await this.server.submitTransaction(transaction);

      logger.info('Credits transferred successfully', {
        hash: result.hash,
        from: fromKeypair.publicKey(),
        to: toPublicKey,
        amount,
      });

      return {
        success: true,
        transactionHash: result.hash,
        from: fromKeypair.publicKey(),
        to: toPublicKey,
        amount,
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
      const result = await this.server.submitTransaction(transaction);

      logger.info('Credits burned successfully', {
        hash: result.hash,
        account: accountKeypair.publicKey(),
        amount,
      });

      return {
        success: true,
        transactionHash: result.hash,
        account: accountKeypair.publicKey(),
        amount,
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
      const result = await this.contract.call(
        'balance',
        new Address(accountPublicKey).toScVal()
      );

      const balance = scValToNative(result);
      
      logger.debug('Balance retrieved', { account: accountPublicKey, balance });
      
      return balance;
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
      const result = await this.contract.call(
        'get_allocation',
        new Address(beneficiaryPublicKey).toScVal()
      );

      const allocation = scValToNative(result);
      
      logger.debug('Allocation retrieved', { beneficiary: beneficiaryPublicKey });
      
      return allocation;
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
      const result = await this.contract.call('total_issued');
      const total = scValToNative(result);
      
      logger.debug('Total issued retrieved', { total });
      
      return total;
    } catch (error) {
      logger.error('Error getting total issued:', error);
      throw error;
    }
  }
}

module.exports = new SorobanContractService();
