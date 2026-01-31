const StellarSdk = require('stellar-sdk');
const logger = require('../utils/logger');

// Determine network
const isTestnet = process.env.STELLAR_NETWORK === 'testnet';
const server = new StellarSdk.Horizon.Server(
  isTestnet 
    ? process.env.HORIZON_URL_TESTNET || 'https://horizon-testnet.stellar.org'
    : process.env.HORIZON_URL_PUBLIC || 'https://horizon.stellar.org'
);

// Set network passphrase
if (isTestnet) {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}

// Asset configuration
const ASSET_CODE = process.env.ASSET_CODE || 'EDUPASS';
const ISSUER_PUBLIC_KEY = process.env.ISSUER_PUBLIC_KEY;

let edupassAsset = null;
if (ISSUER_PUBLIC_KEY) {
  edupassAsset = new StellarSdk.Asset(ASSET_CODE, ISSUER_PUBLIC_KEY);
}

/**
 * Create a new Stellar keypair
 */
const createKeypair = () => {
  return StellarSdk.Keypair.random();
};

/**
 * Fund account on testnet using Friendbot
 */
const fundTestnetAccount = async (publicKey) => {
  if (!isTestnet) {
    throw new Error('Friendbot only available on testnet');
  }
  
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    const responseJSON = await response.json();
    logger.info(`Testnet account ${publicKey} funded successfully`);
    return responseJSON;
  } catch (error) {
    logger.error(`Error funding testnet account: ${error}`);
    throw error;
  }
};

/**
 * Get account details
 */
const getAccount = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    return account;
  } catch (error) {
    logger.error(`Error loading account ${publicKey}:`, error);
    throw error;
  }
};

/**
 * Get account balance for specific asset
 */
const getAssetBalance = async (publicKey, assetCode = ASSET_CODE) => {
  try {
    const account = await getAccount(publicKey);
    const balance = account.balances.find(
      b => b.asset_code === assetCode && b.asset_issuer === ISSUER_PUBLIC_KEY
    );
    return balance ? parseFloat(balance.balance) : 0;
  } catch (error) {
    logger.error(`Error getting balance for ${publicKey}:`, error);
    return 0;
  }
};

/**
 * Establish trustline for EduPass asset
 */
const establishTrustline = async (secretKey, limit = '1000000') => {
  try {
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const account = await server.loadAccount(keypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: edupassAsset,
        limit: limit
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(keypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Trustline established for ${keypair.publicKey()}`);
    return result;
  } catch (error) {
    logger.error('Error establishing trustline:', error);
    throw error;
  }
};

/**
 * Issue EduPass credits
 */
const issueCredits = async (issuerSecretKey, destinationPublicKey, amount, memo = '') => {
  try {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    const transactionBuilder = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: destinationPublicKey,
        asset: edupassAsset,
        amount: amount.toString()
      }));
    
    if (memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(memo));
    }
    
    const transaction = transactionBuilder
      .setTimeout(30)
      .build();
    
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Issued ${amount} ${ASSET_CODE} to ${destinationPublicKey}`);
    return result;
  } catch (error) {
    logger.error('Error issuing credits:', error);
    throw error;
  }
};

/**
 * Transfer credits between accounts
 */
const transferCredits = async (senderSecretKey, receiverPublicKey, amount, memo = '') => {
  try {
    const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecretKey);
    const senderAccount = await server.loadAccount(senderKeypair.publicKey());
    
    const transactionBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: receiverPublicKey,
        asset: edupassAsset,
        amount: amount.toString()
      }));
    
    if (memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(memo));
    }
    
    const transaction = transactionBuilder
      .setTimeout(30)
      .build();
    
    transaction.sign(senderKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Transferred ${amount} ${ASSET_CODE} from ${senderKeypair.publicKey()} to ${receiverPublicKey}`);
    return result;
  } catch (error) {
    logger.error('Error transferring credits:', error);
    throw error;
  }
};

/**
 * Burn credits (send back to issuer and remove from circulation)
 */
const burnCredits = async (holderSecretKey, amount, memo = 'Burned after redemption') => {
  try {
    // Transfer back to issuer
    const result = await transferCredits(holderSecretKey, ISSUER_PUBLIC_KEY, amount, memo);
    
    logger.info(`Burned ${amount} ${ASSET_CODE}`);
    return result;
  } catch (error) {
    logger.error('Error burning credits:', error);
    throw error;
  }
};

/**
 * Get transaction history for an account
 */
const getTransactionHistory = async (publicKey, limit = 10) => {
  try {
    const transactions = await server
      .transactions()
      .forAccount(publicKey)
      .limit(limit)
      .order('desc')
      .call();
    
    return transactions.records;
  } catch (error) {
    logger.error('Error fetching transaction history:', error);
    throw error;
  }
};

module.exports = {
  server,
  edupassAsset,
  ASSET_CODE,
  ISSUER_PUBLIC_KEY,
  isTestnet,
  createKeypair,
  fundTestnetAccount,
  getAccount,
  getAssetBalance,
  establishTrustline,
  issueCredits,
  transferCredits,
  burnCredits,
  getTransactionHistory
};
