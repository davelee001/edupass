const StellarSdk = require('stellar-sdk');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Determine network
const isTestnet = process.env.STELLAR_NETWORK === 'testnet';
const server = new StellarSdk.Horizon.Server(
  isTestnet 
    ? process.env.HORIZON_URL_TESTNET || 'https://horizon-testnet.stellar.org'
    : process.env.HORIZON_URL_PUBLIC || 'https://horizon.stellar.org'
);

const networkPassphrase = isTestnet 
  ? StellarSdk.Networks.TESTNET 
  : StellarSdk.Networks.PUBLIC;

/**
 * Create a sponsored account
 * The sponsor pays for the account creation and initial reserves
 * @param {string} sponsorSecretKey - Secret key of the sponsoring account
 * @param {string} newAccountPublicKey - Public key of the account to be created
 * @param {string} startingBalance - Starting balance for the new account (optional)
 * @returns {Promise<object>}
 */
async function createSponsoredAccount(sponsorSecretKey, newAccountPublicKey, startingBalance = '0') {
  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecretKey);
    const sponsorAccount = await server.loadAccount(sponsorKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(sponsorAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: networkPassphrase
    })
      // Begin sponsoring future reserves for the new account
      .addOperation(
        StellarSdk.Operation.beginSponsoringFutureReserves({
          sponsoredId: newAccountPublicKey
        })
      )
      // Create the account
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: newAccountPublicKey,
          startingBalance: startingBalance
        })
      )
      // End sponsorship
      .addOperation(
        StellarSdk.Operation.endSponsoringFutureReserves({
          source: newAccountPublicKey
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(sponsorKeypair);
    
    // Note: The new account must also sign to accept the sponsorship
    // This will need to be done by the client with the new account's secret key
    
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Sponsored account created: ${newAccountPublicKey} by ${sponsorKeypair.publicKey()}`);
    
    return {
      success: true,
      transactionId: result.id,
      sponsoredAccount: newAccountPublicKey,
      sponsor: sponsorKeypair.publicKey()
    };
  } catch (error) {
    logger.error('Error creating sponsored account:', error);
    throw error;
  }
}

/**
 * Establish a sponsored trustline
 * The sponsor pays for the trustline reserves
 * @param {string} sponsorSecretKey - Secret key of the sponsoring account
 * @param {string} accountSecretKey - Secret key of the account establishing the trustline
 * @param {object} asset - The asset to trust
 * @param {string} limit - Trust limit (default: max)
 * @returns {Promise<object>}
 */
async function establishSponsoredTrustline(sponsorSecretKey, accountSecretKey, asset, limit = '922337203685.4775807') {
  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecretKey);
    const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecretKey);
    
    const sponsorAccount = await server.loadAccount(sponsorKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(sponsorAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: networkPassphrase
    })
      // Begin sponsoring future reserves
      .addOperation(
        StellarSdk.Operation.beginSponsoringFutureReserves({
          sponsoredId: accountKeypair.publicKey()
        })
      )
      // Establish trustline
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: limit,
          source: accountKeypair.publicKey()
        })
      )
      // End sponsorship
      .addOperation(
        StellarSdk.Operation.endSponsoringFutureReserves({
          source: accountKeypair.publicKey()
        })
      )
      .setTimeout(180)
      .build();

    // Both sponsor and account must sign
    transaction.sign(sponsorKeypair);
    transaction.sign(accountKeypair);
    
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Sponsored trustline established for ${accountKeypair.publicKey()}`);
    
    return {
      success: true,
      transactionId: result.id,
      account: accountKeypair.publicKey(),
      asset: `${asset.code}:${asset.issuer}`
    };
  } catch (error) {
    logger.error('Error establishing sponsored trustline:', error);
    throw error;
  }
}

/**
 * Sponsor transaction fees (fee-bump transaction)
 * @param {string} sponsorSecretKey - Secret key of the fee sponsor
 * @param {string} innerTransactionXdr - The inner transaction to sponsor (XDR format)
 * @param {string} baseFee - Base fee for the fee-bump transaction
 * @returns {Promise<object>}
 */
async function sponsorTransactionFees(sponsorSecretKey, innerTransactionXdr, baseFee = null) {
  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecretKey);
    
    // Parse the inner transaction
    const innerTransaction = new StellarSdk.Transaction(innerTransactionXdr, networkPassphrase);
    
    // Calculate fee if not provided
    const fee = baseFee || (await server.fetchBaseFee() * (innerTransaction.operations.length + 1)).toString();
    
    // Create fee-bump transaction
    const feeBumpTransaction = new StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      sponsorKeypair,
      fee,
      innerTransaction,
      networkPassphrase
    );
    
    // Sign the fee-bump transaction
    feeBumpTransaction.sign(sponsorKeypair);
    
    const result = await server.submitTransaction(feeBumpTransaction);
    
    logger.info(`Transaction fees sponsored by ${sponsorKeypair.publicKey()}`);
    
    return {
      success: true,
      transactionId: result.id,
      sponsor: sponsorKeypair.publicKey()
    };
  } catch (error) {
    logger.error('Error sponsoring transaction fees:', error);
    throw error;
  }
}

/**
 * Revoke sponsorship of an account entry
 * @param {string} accountSecretKey - Secret key of the account revoking sponsorship
 * @param {string} sponsoredAccountId - Public key of the sponsored account
 * @returns {Promise<object>}
 */
async function revokeSponsorship(accountSecretKey, sponsoredAccountId) {
  try {
    const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecretKey);
    const account = await server.loadAccount(accountKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: networkPassphrase
    })
      .addOperation(
        StellarSdk.Operation.revokeAccountSponsorship({
          account: sponsoredAccountId
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(accountKeypair);
    
    const result = await server.submitTransaction(transaction);
    
    logger.info(`Sponsorship revoked for ${sponsoredAccountId}`);
    
    return {
      success: true,
      transactionId: result.id
    };
  } catch (error) {
    logger.error('Error revoking sponsorship:', error);
    throw error;
  }
}

/**
 * Get sponsorship information for an account
 * @param {string} accountId - Public key of the account
 * @returns {Promise<object>}
 */
async function getSponsorshipInfo(accountId) {
  try {
    const account = await server.loadAccount(accountId);
    
    const sponsorshipInfo = {
      account: accountId,
      numSponsoring: account.num_sponsoring,
      numSponsored: account.num_sponsored,
      sponsors: [],
      sponsoring: []
    };
    
    // Check for sponsored reserves in signers
    if (account.signers) {
      account.signers.forEach(signer => {
        if (signer.sponsor) {
          sponsorshipInfo.sponsors.push({
            type: 'signer',
            sponsor: signer.sponsor,
            key: signer.key
          });
        }
      });
    }
    
    // Check for sponsored trustlines
    if (account.balances) {
      account.balances.forEach(balance => {
        if (balance.sponsor) {
          sponsorshipInfo.sponsors.push({
            type: 'trustline',
            sponsor: balance.sponsor,
            asset: balance.asset_code ? `${balance.asset_code}:${balance.asset_issuer}` : 'native'
          });
        }
      });
    }
    
    return sponsorshipInfo;
  } catch (error) {
    logger.error('Error getting sponsorship info:', error);
    throw error;
  }
}

/**
 * Store sponsorship relationship in database
 * @param {string} sponsorId - User ID of sponsor
 * @param {string} sponsoredId - User ID of sponsored user
 * @param {string} type - Type of sponsorship (account, trustline, fees)
 * @returns {Promise<object>}
 */
async function recordSponsorship(sponsorId, sponsoredId, type, details = {}) {
  try {
    const result = await pool.query(
      `INSERT INTO sponsorships (sponsor_user_id, sponsored_user_id, sponsorship_type, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [sponsorId, sponsoredId, type, JSON.stringify(details)]
    );
    
    return result.rows[0];
  } catch (error) {
    logger.error('Error recording sponsorship:', error);
    throw error;
  }
}

module.exports = {
  createSponsoredAccount,
  establishSponsoredTrustline,
  sponsorTransactionFees,
  revokeSponsorship,
  getSponsorshipInfo,
  recordSponsorship
};
