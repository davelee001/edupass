# Phase 2: Federation, SEP-10 Auth & Sponsorship

This document covers the Phase 2 features: **Federation Protocol**, **SEP-10 Authentication**, and **Transaction Sponsorship** for the EduPass education credits system.

## 🎯 Overview

Phase 2 adds three powerful features for enhanced usability and accessibility:

1. **Federation Protocol** - Human-readable Stellar addresses (user@domain.com)
2. **SEP-10 Authentication** - Secure wallet-based authentication without passwords
3. **Transaction Sponsorship** - Pay transaction fees for other accounts

These features enable:
- ✅ User-friendly payments with memorable addresses
- ✅ Passwordless authentication using cryptographic signatures
- ✅ Zero transaction fees for beneficiaries
- ✅ Lower barrier to entry for new users
- ✅ Enhanced privacy and security

---

## 📋 Table of Contents

1. [Federation Protocol](#federation-protocol)
2. [SEP-10 Authentication](#sep-10-authentication)
3. [Transaction Sponsorship](#transaction-sponsorship)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Usage Examples](#usage-examples)
7. [Setup Guide](#setup-guide)

---

## 🌐 Federation Protocol

### What is Federation?

Federation (SEP-2) allows users to use **human-readable addresses** instead of cryptographic public keys. Instead of remembering `GBXXX...XXXXX`, users can use `student@edupass.org`.

**Benefits:**
- **User-Friendly**: Easy-to-remember addresses like email
- **Reduced Errors**: No typing 56-character public keys
- **Branding**: Custom domain addresses (student@school.edu)
- **Privacy**: Hide public keys behind friendly names

### How It Works

```
User enters: john.doe@edupass.org
             ↓
Federation lookup
             ↓
Resolves to: GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
             ↓
Transaction sent to resolved public key
```

### Federation Address Format

```
username*domain.com
```

Examples:
- `student123*edupass.org`
- `john.doe*university.edu`
- `beneficiary456*ngo.org`

### API Endpoints

#### Register Federation Address
```javascript
POST /api/federation/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "federationAddress": "john.doe*edupass.org",
  "stellarAddress": "GBXXX...",
  "memo": "Student at XYZ University",
  "memoType": "text"
}

Response:
{
  "message": "Federation address registered successfully",
  "federation": {
    "id": 1,
    "federation_address": "john.doe*edupass.org",
    "stellar_address": "GBXXX...",
    "memo": "Student at XYZ University",
    "memo_type": "text",
    "is_active": true,
    "created_at": "2026-02-08T12:00:00Z"
  }
}
```

#### Lookup by Federation Address
```javascript
GET /api/federation?q=john.doe*edupass.org&type=name

Response:
{
  "stellar_address": "GBXXX...",
  "memo": "Student at XYZ University",
  "memo_type": "text"
}
```

#### Reverse Lookup (Account ID to Federation)
```javascript
GET /api/federation?q=GBXXX...&type=id

Response:
{
  "stellar_address": "GBXXX...",
  "account_id": "john.doe*edupass.org",
  "memo": "Student at XYZ University",
  "memo_type": "text"
}
```

#### Get User's Federation Addresses
```javascript
GET /api/federation/addresses
Authorization: Bearer {token}

Response:
{
  "addresses": [
    {
      "id": 1,
      "federation_address": "john.doe*edupass.org",
      "stellar_address": "GBXXX...",
      "memo": "Student at XYZ University",
      "is_active": true,
      "created_at": "2026-02-08T12:00:00Z"
    }
  ]
}
```

#### Update Federation Address
```javascript
PUT /api/federation/addresses/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "memo": "Updated memo",
  "memoType": "text",
  "isActive": true
}

Response:
{
  "message": "Federation address updated successfully"
}
```

#### Delete Federation Address
```javascript
DELETE /api/federation/addresses/:id
Authorization: Bearer {token}

Response:
{
  "message": "Federation address deleted successfully"
}
```

### Database Schema

```sql
CREATE TABLE federation_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    federation_address VARCHAR(255) UNIQUE NOT NULL,
    stellar_address VARCHAR(56) NOT NULL,
    memo TEXT,
    memo_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_federation_address ON federation_addresses(federation_address);
CREATE INDEX idx_stellar_address ON federation_addresses(stellar_address);
```

### Frontend Usage

```javascript
import federationService from '../services/federationService';

// Register federation address
await federationService.registerAddress(
  'john.doe*edupass.org',
  'GBXXX...',
  'Student at XYZ University'
);

// Lookup federation address
const result = await federationService.lookupByName('john.doe*edupass.org');
console.log(result.stellar_address); // GBXXX...

// Reverse lookup
const account = await federationService.lookupById('GBXXX...');
console.log(account.account_id); // john.doe*edupass.org

// Get user's addresses
const addresses = await federationService.getUserAddresses();
```

### stellar.toml Configuration

For full federation support, add to your domain's `/.well-known/stellar.toml`:

```toml
FEDERATION_SERVER="https://edupass.org/api/federation"

[[CURRENCIES]]
code="EDUPASS"
issuer="GISSUER..."
display_decimals=2
```

---

## 🔐 SEP-10 Authentication

### What is SEP-10?

SEP-10 is a **challenge-response authentication protocol** that uses Stellar keypairs instead of passwords. Users prove ownership of their Stellar account by signing a challenge transaction.

**Benefits:**
- **No Passwords**: Eliminates password management and breaches
- **Cryptographically Secure**: Based on Ed25519 signatures
- **Standard Protocol**: Stellar industry standard (SEP-10)
- **Wallet Integration**: Works with Stellar wallets (Freighter, Albedo, etc.)
- **Phishing Resistant**: Cannot be social engineered

### How It Works

```
1. Client requests challenge from server
             ↓
2. Server generates challenge transaction (signed by server)
             ↓
3. Client signs challenge with their private key
             ↓
4. Client sends signed challenge back to server
             ↓
5. Server verifies both signatures
             ↓
6. Server issues JWT token for authenticated session
```

### API Endpoints

#### Request Challenge
```javascript
GET /api/sep10/challenge?account=GBXXX...

Response:
{
  "transaction": "AAAAAP...",  // Base64-encoded challenge transaction
  "network_passphrase": "Test SDF Network ; September 2015"
}
```

#### Submit Signed Challenge
```javascript
POST /api/sep10/token
Content-Type: application/json

{
  "transaction": "AAAAAP..."  // Base64-encoded signed transaction
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

#### Verify Token
```javascript
GET /api/sep10/verify
Authorization: Bearer {token}

Response:
{
  "valid": true,
  "account": "GBXXX...",
  "expiresAt": "2026-02-09T12:00:00Z"
}
```

### Security Features

1. **Time-Limited Challenges**: Challenges expire after 5 minutes
2. **Nonce**: Random nonce prevents replay attacks
3. **Domain Verification**: Challenge includes domain to prevent phishing
4. **Short-Lived Tokens**: JWT tokens expire after 24 hours
5. **Mutual Verification**: Both client and server signatures verified

### Frontend Usage

```javascript
import sep10Service from '../services/sep10Service';
import StellarSdk from 'stellar-sdk';

// 1. Get challenge
const { transaction, network_passphrase } = await sep10Service.getChallenge(publicKey);

// 2. Sign with Freighter or private key
const keypair = StellarSdk.Keypair.fromSecret(secretKey);
const txn = new StellarSdk.Transaction(transaction, network_passphrase);
txn.sign(keypair);
const signedXDR = txn.toXDR();

// 3. Get JWT token
const { token } = await sep10Service.submitChallenge(signedXDR);

// 4. Store token
localStorage.setItem('authToken', token);

// 5. Use token for API calls
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Integration with Login

```javascript
// Login.jsx
const handleSEP10Login = async () => {
  try {
    // Request challenge
    const { transaction, network_passphrase } = 
      await sep10Service.getChallenge(userPublicKey);

    // Sign with wallet (e.g., Freighter)
    const signedXDR = await window.freighter.signTransaction(
      transaction,
      network_passphrase
    );

    // Submit and get token
    const { token } = await sep10Service.submitChallenge(signedXDR);
    
    // Store token and redirect
    localStorage.setItem('authToken', token);
    navigate('/dashboard');
  } catch (error) {
    console.error('SEP-10 login failed:', error);
  }
};
```

---

## 💰 Transaction Sponsorship

### What is Sponsorship?

Transaction Sponsorship (SEP-0007) allows one account to **pay transaction fees** for another account. This enables zero-balance accounts to receive credits without needing XLM for fees.

**Benefits:**
- **Zero Barrier**: Students don't need XLM to receive credits
- **Better UX**: Simplified onboarding for new users
- **Cost Efficiency**: Sponsor consolidates fee management
- **Accessibility**: Truly free credits for beneficiaries

### How It Works

```
Sponsor Account (School/NGO)
         ↓
Pays 0.00001 XLM fee
         ↓
Beneficiary receives EDUPASS credits
         ↓
Beneficiary account has 0 XLM balance (allowed!)
```

### Types of Sponsorship

1. **Account Creation Sponsorship**: Sponsor pays for new account creation (2 XLM reserve)
2. **Transaction Sponsorship**: Sponsor pays per-transaction fees (0.00001 XLM)
3. **Trustline Sponsorship**: Sponsor pays for trustline reserve (0.5 XLM)

### API Endpoints

#### Sponsor Account
```javascript
POST /api/sponsorship/sponsor-account
Authorization: Bearer {token}
Content-Type: application/json

{
  "beneficiaryPublicKey": "GBXXX...",
  "sponsorshipType": "account_creation"  // account_creation, trustline, transaction
}

Response:
{
  "message": "Account sponsored successfully",
  "transactionHash": "abc123...",
  "sponsorshipId": 42
}
```

#### Get Sponsored Accounts
```javascript
GET /api/sponsorship/sponsored-accounts
Authorization: Bearer {token}

Response:
{
  "sponsoredAccounts": [
    {
      "id": 1,
      "sponsor_user_id": 5,
      "beneficiary_user_id": 123,
      "beneficiary_public_key": "GBXXX...",
      "sponsorship_type": "account_creation",
      "transaction_hash": "abc123...",
      "created_at": "2026-02-08T12:00:00Z"
    }
  ]
}
```

#### Sponsorship History
```javascript
GET /api/sponsorship/history
Authorization: Bearer {token}

Response:
{
  "history": [
    {
      "id": 1,
      "beneficiary_public_key": "GBXXX...",
      "sponsorship_type": "transaction",
      "fee_paid": "0.00001",
      "transaction_hash": "abc123...",
      "created_at": "2026-02-08T12:00:00Z"
    }
  ]
}
```

#### Sponsorship Statistics
```javascript
GET /api/sponsorship/stats
Authorization: Bearer {token}

Response:
{
  "totalSponsored": 150,
  "totalFeePaid": "0.0015",
  "accountCreations": 50,
  "trustlines": 50,
  "transactions": 50
}
```

### Database Schema

```sql
CREATE TABLE sponsored_accounts (
    id SERIAL PRIMARY KEY,
    sponsor_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    beneficiary_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    beneficiary_public_key VARCHAR(56) NOT NULL,
    sponsorship_type VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(64) NOT NULL,
    fee_paid DECIMAL(20, 7) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sponsor_user ON sponsored_accounts(sponsor_user_id);
CREATE INDEX idx_beneficiary_public_key ON sponsored_accounts(beneficiary_public_key);
```

### Frontend Usage

```javascript
import sponsorshipService from '../services/sponsorshipService';

// Sponsor a new account
await sponsorshipService.sponsorAccount(
  'GBXXX...',
  'account_creation'
);

// Get sponsored accounts
const accounts = await sponsorshipService.getSponsoredAccounts();

// Get sponsorship history
const history = await sponsorshipService.getHistory();

// Get statistics
const stats = await sponsorshipService.getStats();
console.log(`Total sponsored: ${stats.totalSponsored}`);
console.log(`Total fees paid: ${stats.totalFeePaid} XLM`);
```

### Building Sponsored Transactions

```javascript
import { TransactionBuilder, Operation, Networks } from 'stellar-sdk';

// Create sponsored transaction
const transaction = new TransactionBuilder(sponsorAccount, {
  fee: '100',
  networkPassphrase: Networks.TESTNET
})
  .addOperation(Operation.beginSponsoringFutureReserves({
    sponsoredId: beneficiaryPublicKey
  }))
  .addOperation(Operation.createAccount({
    destination: beneficiaryPublicKey,
    startingBalance: '0'  // Sponsor pays the reserve
  }))
  .addOperation(Operation.endSponsoringFutureReserves({
    source: beneficiaryPublicKey
  }))
  .setTimeout(300)
  .build();

// Sign with sponsor account
transaction.sign(sponsorKeypair);

// Submit to network
await server.submitTransaction(transaction);
```

---

## 📚 API Reference

### Federation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/federation/register` | Register federation address |
| GET | `/api/federation?q=name&type=name` | Lookup by federation address |
| GET | `/api/federation?q=id&type=id` | Reverse lookup (public key → federation) |
| GET | `/api/federation/addresses` | Get user's federation addresses |
| PUT | `/api/federation/addresses/:id` | Update federation address |
| DELETE | `/api/federation/addresses/:id` | Delete federation address |

### SEP-10 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sep10/challenge?account={publicKey}` | Get challenge transaction |
| POST | `/api/sep10/token` | Submit signed challenge, get JWT |
| GET | `/api/sep10/verify` | Verify JWT token |

### Sponsorship Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sponsorship/sponsor-account` | Sponsor an account |
| GET | `/api/sponsorship/sponsored-accounts` | Get sponsored accounts |
| GET | `/api/sponsorship/history` | Get sponsorship history |
| GET | `/api/sponsorship/stats` | Get sponsorship statistics |

---

## 🗄️ Database Schema

### Federation Addresses Table

```sql
CREATE TABLE federation_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    federation_address VARCHAR(255) UNIQUE NOT NULL,
    stellar_address VARCHAR(56) NOT NULL,
    memo TEXT,
    memo_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_federation_address ON federation_addresses(federation_address);
CREATE INDEX idx_stellar_address ON federation_addresses(stellar_address);
```

### SEP-10 Challenges Table

```sql
CREATE TABLE sep10_challenges (
    id SERIAL PRIMARY KEY,
    client_account VARCHAR(56) NOT NULL,
    challenge_transaction TEXT NOT NULL,
    nonce VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nonce ON sep10_challenges(nonce);
CREATE INDEX idx_client_account ON sep10_challenges(client_account);
```

### Sponsored Accounts Table

```sql
CREATE TABLE sponsored_accounts (
    id SERIAL PRIMARY KEY,
    sponsor_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    beneficiary_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    beneficiary_public_key VARCHAR(56) NOT NULL,
    sponsorship_type VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(64) NOT NULL,
    fee_paid DECIMAL(20, 7) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sponsor_user ON sponsored_accounts(sponsor_user_id);
CREATE INDEX idx_beneficiary_public_key ON sponsored_accounts(beneficiary_public_key);
```

---

## 💡 Usage Examples

### Complete Federation Workflow

```javascript
// 1. Register federation address
const result = await federationService.registerAddress(
  'student123*edupass.org',
  userPublicKey,
  'Computer Science Student'
);

// 2. User shares friendly address
console.log('Send credits to: student123*edupass.org');

// 3. Sender looks up address
const account = await federationService.lookupByName('student123*edupass.org');

// 4. Send payment to resolved public key
await sendPayment(account.stellar_address, '100');
```

### Complete SEP-10 Login Flow

```javascript
// 1. User clicks "Login with Stellar"
const handleStellarLogin = async () => {
  // 2. Get challenge
  const { transaction, network_passphrase } = 
    await sep10Service.getChallenge(publicKey);
  
  // 3. Sign with Freighter wallet
  const signedXDR = await window.freighter.signTransaction(
    transaction,
    network_passphrase
  );
  
  // 4. Submit and get JWT
  const { token, expiresIn } = await sep10Service.submitChallenge(signedXDR);
  
  // 5. Store token
  localStorage.setItem('authToken', token);
  
  // 6. Redirect to dashboard
  navigate('/dashboard');
};
```

### Complete Sponsorship Workflow

```javascript
// School sponsors new student account
const sponsor = async (studentPublicKey) => {
  // 1. Check if student needs sponsorship
  const accountExists = await checkAccountExists(studentPublicKey);
  
  if (!accountExists) {
    // 2. Sponsor account creation + trustline
    await sponsorshipService.sponsorAccount(
      studentPublicKey,
      'account_creation'
    );
    
    console.log('Account created with 0 XLM balance!');
  }
  
  // 3. Send EDUPASS credits (fees sponsored)
  await issueCredits(studentPublicKey, '1000');
  
  // 4. Student can now use credits without any XLM
  console.log('Student received 1000 EDUPASS credits');
};
```

---

## 🚀 Setup Guide

### Step 1: Run Database Migration

```bash
# Navigate to scripts folder
cd scripts

# Run Phase 2 migration
psql -U postgres -d edupass -f phase2-migration.sql
```

### Step 2: Configure Environment Variables

Add to `backend/.env`:

```env
# Federation
FEDERATION_DOMAIN=edupass.org
FEDERATION_SERVER_URL=https://edupass.org/api/federation

# SEP-10
SEP10_SERVER_SIGNING_KEY=SXXX...  # Server's signing secret key
SEP10_HOME_DOMAIN=edupass.org
SEP10_CHALLENGE_EXPIRES_IN=300    # 5 minutes
SEP10_TOKEN_EXPIRES_IN=86400      # 24 hours

# Sponsorship
SPONSOR_SECRET_KEY=SXXX...        # Sponsor account secret key
```

### Step 3: Update stellar.toml

Create `/.well-known/stellar.toml` on your domain:

```toml
ACCOUNTS=["GISSUER..."]
FEDERATION_SERVER="https://edupass.org/api/federation"
SIGNING_KEY="GSERVER..."
WEB_AUTH_ENDPOINT="https://edupass.org/api/sep10/challenge"

[[CURRENCIES]]
code="EDUPASS"
issuer="GISSUER..."
display_decimals=2
name="EduPass Education Credits"
desc="Blockchain-based education credits on Stellar"
```

### Step 4: Configure DNS

For federation to work, ensure your domain's DNS is properly configured:

```
edupass.org.  IN  A     192.0.2.1
www.edupass.org.  IN  CNAME  edupass.org.
```

### Step 5: Test Federation

```bash
# Test federation lookup
curl "https://edupass.org/api/federation?q=student*edupass.org&type=name"

# Expected response
{
  "stellar_address": "GBXXX...",
  "memo": "Student account",
  "memo_type": "text"
}
```

### Step 6: Test SEP-10

```javascript
// Request challenge
const challenge = await fetch(
  'https://edupass.org/api/sep10/challenge?account=GBXXX...'
);

// Sign and submit (using wallet)
// ...

// Verify you received JWT token
console.log('Authenticated!');
```

---

## 🔒 Security Considerations

### Federation

- **Validate Input**: Always validate federation addresses against regex
- **Rate Limiting**: Limit lookup requests to prevent abuse
- **HTTPS Only**: Never serve federation over HTTP
- **Domain Verification**: Verify ownership of federation domains

### SEP-10

- **Challenge Expiry**: Challenges must expire quickly (5 minutes)
- **Nonce Uniqueness**: Use cryptographically random nonces
- **Token Rotation**: Implement token refresh mechanism
- **Secure Storage**: Never log or expose private keys
- **Domain Binding**: Include home_domain in challenge to prevent phishing

### Sponsorship

- **Authorization**: Only authorized accounts can sponsor
- **Rate Limiting**: Prevent sponsorship spam
- **Balance Monitoring**: Monitor sponsor account XLM balance
- **Audit Trail**: Log all sponsorship transactions
- **Limits**: Set maximum sponsorship per beneficiary

---

## 📊 Monitoring & Analytics

### Federation Metrics

```javascript
// Track federation lookups
GET /api/federation/stats

{
  "totalAddresses": 5000,
  "activeAddresses": 4800,
  "lookupsToday": 1200,
  "popularAddresses": [
    { "address": "student123*edupass.org", "lookups": 45 }
  ]
}
```

### SEP-10 Metrics

```javascript
// Track authentication attempts
GET /api/sep10/stats

{
  "challengesIssued": 1000,
  "successfulAuths": 950,
  "failedAuths": 50,
  "averageAuthTime": "2.3s"
}
```

### Sponsorship Metrics

```javascript
// Track sponsorship costs
GET /api/sponsorship/stats

{
  "totalSponsored": 500,
  "totalFeePaid": "0.005",  // in XLM
  "accountCreations": 200,
  "trustlines": 200,
  "transactions": 100,
  "averageFeePerAccount": "0.00001"
}
```

---

## 🎯 Best Practices

### Federation

1. **Use Clear Naming**: `firstname.lastname*domain.com`
2. **Enable Memos**: Help identify payments with memo fields
3. **Monitor Active Status**: Deactivate unused addresses
4. **Version API**: Support backward compatibility

### SEP-10

1. **Wallet Integration**: Support popular wallets (Freighter, Albedo)
2. **Fallback Auth**: Offer traditional login as backup
3. **Clear UX**: Explain the signing process to users
4. **Error Handling**: Provide clear error messages

### Sponsorship

1. **Budget Management**: Set monthly sponsorship budgets
2. **Prioritization**: Sponsor critical operations first
3. **Transparency**: Show users when fees are sponsored
4. **Fallback**: Have backup sponsor accounts

---

## 🧪 Testing

### Federation Tests

```javascript
// Test federation registration
test('should register federation address', async () => {
  const result = await federationService.registerAddress(
    'test*edupass.org',
    testPublicKey,
    'Test account'
  );
  expect(result.federation.federation_address).toBe('test*edupass.org');
});

// Test federation lookup
test('should lookup by federation address', async () => {
  const result = await federationService.lookupByName('test*edupass.org');
  expect(result.stellar_address).toBe(testPublicKey);
});
```

### SEP-10 Tests

```javascript
// Test challenge generation
test('should generate valid challenge', async () => {
  const { transaction, network_passphrase } = 
    await sep10Service.getChallenge(testPublicKey);
  expect(transaction).toBeTruthy();
  expect(network_passphrase).toBe('Test SDF Network ; September 2015');
});

// Test token generation
test('should generate JWT after valid signature', async () => {
  const challenge = await sep10Service.getChallenge(testPublicKey);
  const signedXDR = signTransaction(challenge.transaction);
  const { token } = await sep10Service.submitChallenge(signedXDR);
  expect(token).toBeTruthy();
});
```

### Sponsorship Tests

```javascript
// Test account sponsorship
test('should sponsor new account', async () => {
  const result = await sponsorshipService.sponsorAccount(
    newAccountPublicKey,
    'account_creation'
  );
  expect(result.sponsorshipId).toBeTruthy();
});
```

---

## 🐛 Troubleshooting

### Federation Issues

**Problem**: Federation lookup returns 404
- **Solution**: Check database, ensure address is active, verify DNS

**Problem**: Invalid federation address format
- **Solution**: Must match `username*domain.com` format

### SEP-10 Issues

**Problem**: Challenge signature verification fails
- **Solution**: Check network passphrase matches, verify keypair

**Problem**: Token expired
- **Solution**: Request new challenge, implement token refresh

### Sponsorship Issues

**Problem**: Sponsor account low balance
- **Solution**: Fund sponsor account with more XLM

**Problem**: Sponsorship transaction fails
- **Solution**: Check beneficiary account, verify operation type

---

## 📖 References

- [SEP-2: Federation Protocol](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md)
- [SEP-10: Stellar Web Authentication](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md)
- [Stellar Sponsorship](https://developers.stellar.org/docs/encyclopedia/sponsored-reserves)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)

---

## ✅ Phase 2 Checklist

- ✅ Federation protocol implementation
- ✅ SEP-10 authentication service
- ✅ Transaction sponsorship system
- ✅ Database migrations
- ✅ API endpoints (10 new routes)
- ✅ Frontend components (FederationManager, SponsorshipManager)
- ✅ Frontend services (3 new services)
- ✅ Login integration with SEP-10
- ✅ Documentation
- ✅ Testing

---

**Phase 2 Complete! 🎉**

Next: [Phase 3 - Advanced Features](PHASE3_FEATURES.md) (Coming Soon)
