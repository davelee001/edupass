const StellarSdk = require('stellar-sdk');
const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// SEP-10 configuration
const SERVER_SIGNING_KEY = process.env.SEP10_SIGNING_KEY 
  ? StellarSdk.Keypair.fromSecret(process.env.SEP10_SIGNING_KEY)
  : StellarSdk.Keypair.random(); // Generate random keypair if not set

const CHALLENGE_EXPIRES_IN = 300; // 5 minutes
const JWT_EXPIRES_IN = 3600; // 1 hour
const HOME_DOMAIN = process.env.HOME_DOMAIN || 'edupass.local';
const WEB_AUTH_DOMAIN = process.env.WEB_AUTH_DOMAIN || 'edupass.local';

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
 * Generate a SEP-10 challenge transaction
 * @param {string} clientAccountId - The Stellar account requesting authentication
 * @param {string} memo - Optional memo for the user
 * @returns {Promise<{transaction: string, network_passphrase: string}>}
 */
async function generateChallenge(clientAccountId, memo = null) {
  try {
    // Validate the client account ID
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(clientAccountId)) {
      throw new Error('Invalid Stellar account ID');
    }

    // Load the server account
    const serverAccount = await server.loadAccount(SERVER_SIGNING_KEY.publicKey());

    // Create a random nonce for this challenge
    const nonce = crypto.randomBytes(48).toString('base64');

    // Build the challenge transaction
    const now = Math.floor(Date.now() / 1000);
    const transaction = new StellarSdk.TransactionBuilder(serverAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: networkPassphrase,
      timebounds: {
        minTime: now,
        maxTime: now + CHALLENGE_EXPIRES_IN
      }
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `${HOME_DOMAIN} auth`,
          value: nonce,
          source: clientAccountId
        })
      )
      .addOperation(
        StellarSdk.Operation.manageData({
          name: 'web_auth_domain',
          value: WEB_AUTH_DOMAIN,
          source: SERVER_SIGNING_KEY.publicKey()
        })
      );

    // Add memo if provided
    if (memo) {
      transaction.addMemo(StellarSdk.Memo.text(memo));
    }

    const challenge = transaction.build();
    
    // Server signs the transaction
    challenge.sign(SERVER_SIGNING_KEY);

    // Store challenge in memory or database (for production, use Redis)
    // For now, we'll just return it and verify signatures later
    
    logger.info(`SEP-10 challenge generated for ${clientAccountId}`);

    return {
      transaction: challenge.toXDR(),
      network_passphrase: networkPassphrase
    };
  } catch (error) {
    logger.error('Error generating SEP-10 challenge:', error);
    throw error;
  }
}

/**
 * Verify a signed SEP-10 challenge transaction
 * @param {string} transactionXdr - The signed challenge transaction in XDR format
 * @param {string} clientAccountId - The expected client account ID
 * @returns {Promise<{valid: boolean, clientAccountId: string}>}
 */
async function verifyChallenge(transactionXdr, clientAccountId) {
  try {
    // Parse the transaction
    const transaction = new StellarSdk.Transaction(transactionXdr, networkPassphrase);

    // Verify the transaction is properly formed
    if (!transaction.operations || transaction.operations.length < 2) {
      throw new Error('Invalid challenge transaction structure');
    }

    // Verify the first operation is a manageData operation from the client
    const authOp = transaction.operations[0];
    if (authOp.type !== 'manageData') {
      throw new Error('First operation must be manageData');
    }

    if (!authOp.name.includes('auth')) {
      throw new Error('Invalid manageData operation name');
    }

    // Verify the source account matches
    const clientAccount = authOp.source || transaction.source;
    if (clientAccount !== clientAccountId) {
      throw new Error('Client account mismatch');
    }

    // Verify the transaction hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (transaction.timeBounds) {
      if (now < parseInt(transaction.timeBounds.minTime)) {
        throw new Error('Challenge transaction not yet valid');
      }
      if (now > parseInt(transaction.timeBounds.maxTime)) {
        throw new Error('Challenge transaction has expired');
      }
    }

    // Verify signatures
    const serverPublicKey = SERVER_SIGNING_KEY.publicKey();
    
    // Check that both server and client have signed
    const signatures = transaction.signatures;
    if (signatures.length < 2) {
      throw new Error('Transaction must be signed by both server and client');
    }

    // Verify server signature
    const serverSigned = transaction.signatures.some(sig => {
      const hint = sig.hint();
      const serverHint = SERVER_SIGNING_KEY.rawPublicKey().slice(-4);
      return hint.equals(serverHint);
    });

    if (!serverSigned) {
      throw new Error('Server signature not found');
    }

    // Verify client signature by checking the transaction hash
    const clientKeypair = StellarSdk.Keypair.fromPublicKey(clientAccountId);
    const txHash = transaction.hash();
    
    const clientSigned = signatures.some(sig => {
      try {
        return clientKeypair.verify(txHash, sig.signature());
      } catch (e) {
        return false;
      }
    });

    if (!clientSigned) {
      throw new Error('Client signature not found or invalid');
    }

    logger.info(`SEP-10 challenge verified for ${clientAccountId}`);

    return {
      valid: true,
      clientAccountId: clientAccount
    };
  } catch (error) {
    logger.error('Error verifying SEP-10 challenge:', error);
    throw error;
  }
}

/**
 * Get user information from database by Stellar public key
 * @param {string} stellarPublicKey
 * @returns {Promise<object|null>}
 */
async function getUserByStellarKey(stellarPublicKey) {
  try {
    const result = await pool.query(
      'SELECT id, email, role, stellar_public_key, name, organization FROM users WHERE stellar_public_key = $1',
      [stellarPublicKey]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Error fetching user by Stellar key:', error);
    throw error;
  }
}

/**
 * Generate SEP-10 JWT token
 * @param {string} clientAccountId
 * @returns {Promise<string>}
 */
async function generateSEP10Token(clientAccountId) {
  const jwt = require('jsonwebtoken');
  
  // Get user info from database
  const user = await getUserByStellarKey(clientAccountId);
  
  if (!user) {
    throw new Error('User not found for this Stellar account');
  }

  // Generate JWT with user information
  const token = jwt.sign(
    {
      sub: clientAccountId,
      userId: user.id,
      email: user.email,
      role: user.role,
      iss: HOME_DOMAIN,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN
    },
    process.env.JWT_SECRET
  );

  logger.info(`SEP-10 JWT generated for user ${user.id}`);

  return token;
}

module.exports = {
  generateChallenge,
  verifyChallenge,
  generateSEP10Token,
  getUserByStellarKey,
  SERVER_SIGNING_KEY: SERVER_SIGNING_KEY.publicKey()
};
