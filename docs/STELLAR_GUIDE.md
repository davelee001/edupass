# EduPass Stellar Integration Guide

## Overview

EduPass uses the Stellar blockchain to manage education credits as a custom asset. This guide explains how the Stellar integration works and how to set it up.

## Stellar Network Basics

### What is Stellar?
Stellar is a decentralized blockchain network designed for fast, low-cost cross-border payments and asset transfers. EduPass uses Stellar to:
- Issue custom EDUPASS tokens
- Transfer credits between accounts
- Maintain transparent transaction history
- Enable quick settlements (3-5 seconds)

### Networks
- **Testnet**: For development and testing (free XLM from Friendbot)
- **Public Network**: For production use (requires real XLM)

## Setting Up Stellar Integration

### 1. Environment Configuration

Create a `.env` file in the backend directory:

```bash
# Stellar Network Configuration
STELLAR_NETWORK=testnet  # or 'public' for production
ASSET_CODE=EDUPASS

# Issuer Account Keys
ISSUER_PUBLIC_KEY=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ISSUER_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Horizon URLs
HORIZON_URL_TESTNET=https://horizon-testnet.stellar.org
HORIZON_URL_PUBLIC=https://horizon.stellar.org
```

### 2. Creating the Issuer Account

#### For Testnet:

```javascript
const StellarSdk = require('stellar-sdk');

// Create keypair
const issuerKeypair = StellarSdk.Keypair.random();
console.log('Public Key:', issuerKeypair.publicKey());
console.log('Secret Key:', issuerKeypair.secret());

// Fund account using Friendbot
await fetch(
  `https://friendbot.stellar.org?addr=${issuerKeypair.publicKey()}`
);
```

#### For Production:

1. Generate keypair using Stellar Laboratory: https://laboratory.stellar.org/#account-creator
2. Fund account with XLM from an exchange
3. Store keys securely (consider using hardware wallets)

### 3. Asset Issuance Process

The EDUPASS asset must be issued by the designated issuer account. Here's how it works:

1. **Beneficiary establishes trustline** to EDUPASS asset
2. **Issuer sends EDUPASS** tokens to beneficiary
3. **Transaction recorded** on Stellar blockchain

```javascript
const { issueCredits } = require('./config/stellar');

// Issue 1000 EDUPASS to beneficiary
const result = await issueCredits(
  issuerSecretKey,
  beneficiaryPublicKey,
  '1000',
  'School fees for 2024'
);
```

## Key Stellar Operations

### 1. Create Account & Establish Trustline

```javascript
const { createKeypair, fundTestnetAccount, establishTrustline } = require('./config/stellar');

// Create new account
const keypair = createKeypair();

// Fund on testnet
await fundTestnetAccount(keypair.publicKey());

// Establish trustline to EDUPASS
await establishTrustline(keypair.secret());
```

### 2. Issue Credits

```javascript
const { issueCredits } = require('./config/stellar');

await issueCredits(
  issuerSecretKey,      // Issuer's secret key
  recipientPublicKey,   // Beneficiary's public key
  amount,               // Amount to issue
  memo                  // Optional memo
);
```

### 3. Transfer Credits

```javascript
const { transferCredits } = require('./config/stellar');

await transferCredits(
  senderSecretKey,      // Beneficiary's secret key
  receiverPublicKey,    // School's public key
  amount,               // Amount to transfer
  memo                  // Optional memo
);
```

### 4. Burn Credits

```javascript
const { burnCredits } = require('./config/stellar');

await burnCredits(
  holderSecretKey,      // School's secret key
  amount,               // Amount to burn
  memo                  // Optional memo
);
```

### 5. Check Balance

```javascript
const { getAssetBalance } = require('./config/stellar');

const balance = await getAssetBalance(publicKey);
console.log(`Balance: ${balance} EDUPASS`);
```

### 6. Get Transaction History

```javascript
const { getTransactionHistory } = require('./config/stellar');

const transactions = await getTransactionHistory(publicKey, 10);
transactions.forEach(tx => {
  console.log(`Hash: ${tx.hash}`);
  console.log(`Ledger: ${tx.ledger}`);
  console.log(`Created: ${tx.created_at}`);
});
```

## Transaction Flow

### Issue Credits (Issuer → Beneficiary)

```
1. Issuer initiates issuance via API
2. Backend validates request
3. Stellar transaction created:
   - Operation: Payment
   - Asset: EDUPASS
   - Destination: Beneficiary
4. Transaction signed by issuer
5. Submitted to Stellar network
6. Confirmation received (3-5 seconds)
7. Database updated with transaction hash
```

### Transfer Credits (Beneficiary → School)

```
1. Beneficiary initiates transfer via API
2. Backend validates balance
3. Stellar transaction created:
   - Operation: Payment
   - Asset: EDUPASS
   - Destination: School
4. Transaction signed by beneficiary
5. Submitted to Stellar network
6. Confirmation received
7. Database updated
```

### Burn Credits (School → Issuer)

```
1. School redeems credits via API
2. Backend validates redemption
3. Stellar transaction created:
   - Operation: Payment
   - Asset: EDUPASS
   - Destination: Issuer (return to circulation)
4. Transaction signed by school
5. Submitted to Stellar network
6. Marked as burned in database
```

## Security Best Practices

### Secret Key Management

1. **Never commit secret keys to version control**
2. **Use environment variables** for configuration
3. **Encrypt secret keys** in database (current implementation uses base64, upgrade to AES-256)
4. **Consider hardware wallets** for issuer account in production

### Transaction Security

1. **Verify recipient addresses** before sending
2. **Implement transaction limits** for large amounts
3. **Use memos** for transaction tracking
4. **Log all transactions** for audit trail

### Network Security

1. **Use HTTPS** for Horizon API calls
2. **Validate Stellar responses** before processing
3. **Implement retry logic** for network failures
4. **Monitor account balances** regularly

## Monitoring & Debugging

### Stellar Laboratory
Use Stellar Laboratory to inspect transactions:
- Testnet: https://laboratory.stellar.org/#explorer?network=test
- Public: https://laboratory.stellar.org/#explorer?network=public

### Stellar Expert
View detailed account and transaction information:
- Testnet: https://stellar.expert/explorer/testnet
- Public: https://stellar.expert/explorer/public

### Horizon API
Query Stellar directly:
```bash
# Get account details
curl https://horizon-testnet.stellar.org/accounts/{PUBLIC_KEY}

# Get transactions
curl https://horizon-testnet.stellar.org/accounts/{PUBLIC_KEY}/transactions
```

## Common Issues & Solutions

### Issue: Account not found
**Solution**: Fund the account first (testnet: use Friendbot, public: send XLM)

### Issue: Trustline not established
**Solution**: Call `establishTrustline()` before receiving EDUPASS

### Issue: Insufficient balance
**Solution**: Ensure account has minimum XLM balance (base reserve + operation fees)

### Issue: Transaction failed
**Solution**: Check Horizon response for error details, verify signatures and sequence numbers

## Migration from Testnet to Public

1. **Create new issuer account** on public network
2. **Update environment variables**:
   ```
   STELLAR_NETWORK=public
   ISSUER_PUBLIC_KEY=<new_public_key>
   ISSUER_SECRET_KEY=<new_secret_key>
   ```
3. **Migrate user accounts**: Users must create new accounts on public network
4. **Re-establish trustlines**: All users must trust the new EDUPASS asset
5. **Test thoroughly**: Verify all operations work on public network

## Asset Distribution Control

### Limit Total Supply (Optional)

```javascript
// Lock the issuer account to prevent further issuance
const lockIssuer = async () => {
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
  
  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: StellarSdk.Networks.TESTNET
  })
    .addOperation(StellarSdk.Operation.setOptions({
      masterWeight: 0, // Remove signing power
      lowThreshold: 1,
      medThreshold: 1,
      highThreshold: 1
    }))
    .setTimeout(30)
    .build();
  
  transaction.sign(issuerKeypair);
  await server.submitTransaction(transaction);
};
```

### Authorized Trustlines (Optional)

Enable authorization required flag to control who can hold EDUPASS:

```javascript
const enableAuth = async () => {
  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: StellarSdk.Networks.TESTNET
  })
    .addOperation(StellarSdk.Operation.setOptions({
      setFlags: StellarSdk.AuthRequiredFlag | StellarSdk.AuthRevocableFlag
    }))
    .setTimeout(30)
    .build();
  
  transaction.sign(issuerKeypair);
  await server.submitTransaction(transaction);
};
```

## Resources

- [Stellar Documentation](https://developers.stellar.org/docs)
- [Stellar SDK Reference](https://stellar.github.io/js-stellar-sdk/)
- [Asset Issuance Guide](https://developers.stellar.org/docs/issuing-assets/)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Stellar Expert](https://stellar.expert/)
