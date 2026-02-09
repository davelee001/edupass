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

// ============================================================================
// PHASE 1: CLAWBACK OPERATIONS
// ============================================================================

/**
 * Set asset authorization flags on issuer account
 * Enables AUTH_REQUIRED, AUTH_REVOCABLE, and AUTH_CLAWBACK_ENABLED
 */
const enableAssetControls = async (issuerSecretKey) => {
  try {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.setOptions({
        setFlags: StellarSdk.AuthRevocableFlag | 
                  StellarSdk.AuthRequiredFlag | 
                  StellarSdk.AuthClawbackEnabledFlag
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info('Asset authorization controls enabled successfully');
    return result;
  } catch (error) {
    logger.error('Error enabling asset controls:', error);
    throw error;
  }
};

/**
 * Authorize an account to hold the asset
 * Required when AUTH_REQUIRED flag is set
 */
const authorizeAccount = async (issuerSecretKey, accountPublicKey) => {
  try {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.setTrustLineFlags({
        trustor: accountPublicKey,
        asset: edupassAsset,
        flags: {
          authorized: true
        }
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Account ${accountPublicKey} authorized successfully`);
    return result;
  } catch (error) {
    logger.error('Error authorizing account:', error);
    throw error;
  }
};

/**
 * Revoke authorization from an account
 * Freezes the account's ability to send/receive credits
 */
const revokeAccountAuthorization = async (issuerSecretKey, accountPublicKey) => {
  try {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.setTrustLineFlags({
        trustor: accountPublicKey,
        asset: edupassAsset,
        flags: {
          authorized: false,
          authorizedToMaintainLiabilities: true
        }
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Account ${accountPublicKey} authorization revoked`);
    return result;
  } catch (error) {
    logger.error('Error revoking account authorization:', error);
    throw error;
  }
};

/**
 * Clawback credits from an account
 * Removes credits from holder's account (fraud prevention)
 */
const clawbackCredits = async (issuerSecretKey, fromAccountPublicKey, amount, memo = 'Clawback') => {
  try {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    const transactionBuilder = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.clawback({
        from: fromAccountPublicKey,
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
    
    logger.info(`Clawed back ${amount} ${ASSET_CODE} from ${fromAccountPublicKey}`);
    return result;
  } catch (error) {
    logger.error('Error clawing back credits:', error);
   

 throw error;
  }
};

// ============================================================================
// PHASE 1: MULTI-SIGNATURE OPERATIONS
// ============================================================================

/**
 * Add signer to account (for multi-sig)
 */
const addSigner = async (accountSecretKey, signerPublicKey, weight = 1) => {
  try {
    const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecretKey);
    const account = await server.loadAccount(accountKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: signerPublicKey,
          weight: weight
        }
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(accountKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Signer ${signerPublicKey} added to account ${accountKeypair.publicKey()}`);
    return result;
  } catch (error) {
    logger.error('Error adding signer:', error);
    throw error;
  }
};

/**
 * Remove signer from account
 */
const removeSigner = async (accountSecretKey, signerPublicKey) => {
  try {
    const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecretKey);
    const account = await server.loadAccount(accountKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: signerPublicKey,
          weight: 0
        }
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(accountKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Signer ${signerPublicKey} removed from account`);
    return result;
  } catch (error) {
    logger.error('Error removing signer:', error);
    throw error;
  }
};

/**
 * Set account thresholds for multi-sig requirements
 */
const setAccountThresholds = async (accountSecretKey, low = 0, medium = 1, high = 2) => {
  try {
    const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecretKey);
    const account = await server.loadAccount(accountKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(StellarSdk.Operation.setOptions({
        lowThreshold: low,
        medThreshold: medium,
        highThreshold: high
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(accountKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Account thresholds set: low=${low}, medium=${medium}, high=${high}`);
    return result;
  } catch (error) {
    logger.error('Error setting account thresholds:', error);
    throw error;
  }
};

/**
 * Create multi-signed transaction (requires multiple signatures)
 */
const createMultiSigTransaction = async (sourcePublicKey, operations, memo = '') => {
  try {
    const sourceAccount = await server.loadAccount(sourcePublicKey);
    
    const transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    });
    
    // Add all operations
    operations.forEach(op => transactionBuilder.addOperation(op));
    
    if (memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(memo));
    }
    
    const transaction = transactionBuilder
      .setTimeout(300) // 5 minutes for multi-sig collection
      .build();
    
    // Return unsigned transaction (XDR) for signing by multiple parties
    const xdr = transaction.toXDR();
    
    logger.info('Multi-sig transaction created');
    return {
      xdr,
      hash: transaction.hash().toString('hex')
    };
  } catch (error) {
    logger.error('Error creating multi-sig transaction:', error);
    throw error;
  }
};

/**
 * Sign existing transaction with additional signature
 */
const signTransaction = async (transactionXDR, signerSecretKey) => {
  try {
    const transaction = new StellarSdk.Transaction(
      transactionXDR,
      isTestnet ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC
    );
    
    const keypair = StellarSdk.Keypair.fromSecret(signerSecretKey);
    transaction.sign(keypair);
    
    logger.info(`Transaction signed by ${keypair.publicKey()}`);
    return transaction.toXDR();
  } catch (error) {
    logger.error('Error signing transaction:', error);
    throw error;
  }
};

/**
 * Submit multi-signed transaction
 */
const submitMultiSigTransaction = async (signedTransactionXDR) => {
  try {
    const transaction = new StellarSdk.Transaction(
      signedTransactionXDR,
      isTestnet ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC
    );
    
    const result = await server.submitTransaction(transaction);
    
    logger.info('Multi-sig transaction submitted successfully');
    return result;
  } catch (error) {
    logger.error('Error submitting multi-sig transaction:', error);
    throw error;
  }
};

/**
 * Get account signers and thresholds
 */
const getAccountSigners = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    
    return {
      signers: account.signers,
      thresholds: account.thresholds
    };
  } catch (error) {
    logger.error('Error getting account signers:', error);
    throw error;
  }
};

// ============================================================================
// PHASE 3: TIME-BOUNDED TRANSACTIONS
// ============================================================================

/**
 * Create a time-bounded transaction that expires automatically
 * @param {string} sourceSecretKey - Source account secret key
 * @param {string} destinationPublicKey - Destination account public key
 * @param {string} amount - Amount to send
 * @param {number} minTime - Minimum time (unix timestamp, 0 = no minimum)
 * @param {number} maxTime - Maximum time (unix timestamp, 0 = no maximum)
 * @param {string} memo - Optional memo
 */
const createTimeBoundedTransaction = async (
  sourceSecretKey,
  destinationPublicKey,
  amount,
  minTime = 0,
  maxTime = 0,
  memo = null
) => {
  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    
    const transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC,
      timebounds: {
        minTime: minTime.toString(),
        maxTime: maxTime.toString()
      }
    });
    
    // Add payment operation
    transactionBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination: destinationPublicKey,
        asset: edupassAsset,
        amount: amount.toString()
      })
    );
    
    // Add memo if provided
    if (memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(memo));
    }
    
    const transaction = transactionBuilder.build();
    transaction.sign(sourceKeypair);
    
    const result = await server.submitTransaction(transaction);
    
    logger.info('Time-bounded transaction created successfully');
    return {
      hash: result.hash,
      minTime,
      maxTime,
      expiresAt: maxTime > 0 ? new Date(maxTime * 1000) : null
    };
  } catch (error) {
    logger.error('Error creating time-bounded transaction:', error);
    throw error;
  }
};

/**
 * Check if a transaction has expired based on its time bounds
 * @param {number} maxTime - Maximum time from transaction
 */
const checkTransactionExpiration = (maxTime) => {
  if (maxTime === 0) {
    return { expired: false, message: 'Transaction has no expiration' };
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expired = currentTime > maxTime;
  
  return {
    expired,
    message: expired ? 'Transaction has expired' : 'Transaction is still valid',
    expiresAt: new Date(maxTime * 1000),
    timeRemaining: expired ? 0 : maxTime - currentTime
  };
};

// ============================================================================
// PHASE 3: MUXED ACCOUNTS
// ============================================================================

/**
 * Create a muxed account address
 * @param {string} publicKey - Base Stellar public key (G...)
 * @param {string} id - Unique identifier for the muxed account
 */
const createMuxedAccount = (publicKey, id) => {
  try {
    // Convert id to BigInt (muxed accounts use 64-bit unsigned integers)
    const muxedId = BigInt(id);
    
    const muxedAccount = new StellarSdk.MuxedAccount(
      new StellarSdk.Account(publicKey, '0'),
      muxedId.toString()
    );
    
    logger.info(`Muxed account created: ${muxedAccount.accountId()}`);
    return {
      muxedAddress: muxedAccount.accountId(), // M... address
      baseAddress: publicKey, // G... address
      id: id
    };
  } catch (error) {
    logger.error('Error creating muxed account:', error);
    throw error;
  }
};

/**
 * Parse a muxed account address to get base account and ID
 * @param {string} muxedAddress - Muxed account address (M...)
 */
const parseMuxedAccount = (muxedAddress) => {
  try {
    if (!muxedAddress.startsWith('M')) {
      throw new Error('Not a muxed account address');
    }
    
    const muxedAccount = StellarSdk.MuxedAccount.fromAddress(muxedAddress, '0');
    
    return {
      muxedAddress,
      baseAddress: muxedAccount.baseAccount().accountId(),
      id: muxedAccount.id()
    };
  } catch (error) {
    logger.error('Error parsing muxed account:', error);
    throw error;
  }
};

/**
 * Send credits to a muxed account
 * @param {string} sourceSecretKey - Source account secret key
 * @param {string} muxedDestination - Destination muxed account (M...)
 * @param {string} amount - Amount to send
 */
const sendToMuxedAccount = async (sourceSecretKey, muxedDestination, amount) => {
  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: isTestnet 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: muxedDestination,
          asset: edupassAsset,
          amount: amount.toString()
        })
      )
      .setTimeout(30)
      .build();
    
    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);
    
    logger.info('Payment to muxed account successful');
    return result;
  } catch (error) {
    logger.error('Error sending to muxed account:', error);
    throw error;
  }
};

// ============================================================================
// PHASE 3: SEP-24 ANCHOR INTEGRATION
// ============================================================================

/**
 * Initiate a SEP-24 deposit (fiat to crypto)
 * @param {string} assetCode - Asset to deposit
 * @param {string} accountPublicKey - Recipient Stellar account
 * @param {number} amount - Amount to deposit
 * @param {string} anchorDomain - Anchor domain (e.g., 'testanchor.stellar.org')
 */
const initiateSEP24Deposit = async (assetCode, accountPublicKey, amount, anchorDomain) => {
  try {
    // In production, this would:
    // 1. Get anchor's TOML file
    // 2. Authenticate with SEP-10
    // 3. Call /deposit endpoint
    // 4. Return interactive URL for user
    
    // For demonstration, we'll create a mock response
    const mockTransactionId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`SEP-24 deposit initiated: ${mockTransactionId}`);
    
    return {
      id: mockTransactionId,
      type: 'deposit',
      status: 'pending_user_transfer_start',
      assetCode,
      amount,
      accountPublicKey,
      anchorDomain,
      // This URL would normally come from the anchor
      interactiveUrl: `https://${anchorDomain}/deposit?transaction_id=${mockTransactionId}`,
      message: 'Please complete the deposit at the interactive URL'
    };
  } catch (error) {
    logger.error('Error initiating SEP-24 deposit:', error);
    throw error;
  }
};

/**
 * Initiate a SEP-24 withdrawal (crypto to fiat)
 * @param {string} assetCode - Asset to withdraw
 * @param {string} accountPublicKey - Source Stellar account
 * @param {number} amount - Amount to withdraw
 * @param {string} anchorDomain - Anchor domain
 */
const initiateSEP24Withdrawal = async (assetCode, accountPublicKey, amount, anchorDomain) => {
  try {
    const mockTransactionId = `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`SEP-24 withdrawal initiated: ${mockTransactionId}`);
    
    return {
      id: mockTransactionId,
      type: 'withdrawal',
      status: 'pending_user_transfer_start',
      assetCode,
      amount,
      accountPublicKey,
      anchorDomain,
      interactiveUrl: `https://${anchorDomain}/withdraw?transaction_id=${mockTransactionId}`,
      message: 'Please complete the withdrawal at the interactive URL'
    };
  } catch (error) {
    logger.error('Error initiating SEP-24 withdrawal:', error);
    throw error;
  }
};

/**
 * Get SEP-24 transaction status
 * @param {string} transactionId - Transaction ID from initiate call
 * @param {string} anchorDomain - Anchor domain
 */
const getSEP24TransactionStatus = async (transactionId, anchorDomain) => {
  try {
    // In production, this would query the anchor's /transaction endpoint
    // For demonstration, return mock status
    
    const status = {
      id: transactionId,
      status: 'completed',
      statusEta: null,
      moreInfoUrl: `https://${anchorDomain}/transaction/${transactionId}`,
      message: 'Transaction completed successfully'
    };
    
    logger.info(`SEP-24 transaction status retrieved: ${transactionId}`);
    return status;
  } catch (error) {
    logger.error('Error getting SEP-24 transaction status:', error);
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
  getTransactionHistory,
  // Phase 1: Clawback & Authorization
  enableAssetControls,
  authorizeAccount,
  revokeAccountAuthorization,
  clawbackCredits,
  // Phase 1: Multi-signature
  addSigner,
  removeSigner,
  setAccountThresholds,
  createMultiSigTransaction,
  signTransaction,
  submitMultiSigTransaction,
  getAccountSigners,
  // Phase 3: Time-bounded transactions
  createTimeBoundedTransaction,
  checkTransactionExpiration,
  // Phase 3: Muxed accounts
  createMuxedAccount,
  parseMuxedAccount,
  sendToMuxedAccount,
  // Phase 3: SEP-24 integration
  initiateSEP24Deposit,
  initiateSEP24Withdrawal,
  getSEP24TransactionStatus
};
