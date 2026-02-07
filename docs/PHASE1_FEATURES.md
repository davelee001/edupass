# Phase 1 Advanced Stellar Features

This document covers the Phase 1 advanced features: **Clawback**, **Asset Authorization**, and **Multi-Signature** support for the EduPass education credits system.

## 🎯 Overview

Phase 1 adds three critical features for enterprise-grade asset management:

1. **Clawback** - Revoke credits from accounts (fraud prevention, expired credits)
2. **Asset Authorization** - Control who can hold EDUPASS credits (compliance)
3. **Multi-Signature** - Require multiple approvals for high-value transactions (governance)

These features enable:
- ✅ Fraud prevention and dispute resolution
- ✅ Regulatory compliance (KYC/AML)
- ✅ Democratic governance for large operations
- ✅ Enhanced security for high-value transactions

---

## 📋 Table of Contents

1. [Clawback](#clawback)
2. [Asset Authorization](#asset-authorization)
3. [Multi-Signature](#multi-signature)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Usage Examples](#usage-examples)
7. [Setup Guide](#setup-guide)

---

## 🚨 Clawback

### What is Clawback?

Clawback allows the asset issuer to **revoke credits** from an account. This is essential for:

- **Fraud Prevention**: Recover credits from fraudulent accounts
- **Expired Credits**: Remove credits that have expired
- **Refunds**: Return credits for cancelled services
- **Compliance**: Address regulatory violations

### How It Works

1. Issuer enables `CLAWBACK_ENABLED` flag on the asset
2. Issuer can call `clawbackCredits()` with account, amount, and reason
3. Transaction is logged in the database for audit trail
4. Credits are immediately removed from the account

### API Endpoints

#### Enable Clawback
```javascript
POST /api/advanced/enable-asset-controls
Authorization: Bearer {token}

Response:
{
  "message": "Asset controls enabled",
  "transactionHash": "abc123..."
}
```

#### Clawback Credits
```javascript
POST /api/advanced/clawback
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountPublicKey": "GXXX...",
  "amount": "100.50",
  "reason": "fraud" // fraud, expired, violation, error, refund, other
}

Response:
{
  "message": "Credits clawed back successfully",
  "transactionHash": "abc123...",
  "clawbackId": 42
}
```

#### Clawback History
```javascript
GET /api/advanced/clawback-history
Authorization: Bearer {token}

Response:
{
  "clawbacks": [
    {
      "id": 1,
      "from_user_id": 123,
      "stellar_public_key": "GXXX...",
      "amount": "100.50",
      "reason": "fraud",
      "transaction_hash": "abc123...",
      "clawed_back_by": 1,
      "issuer_name": "EduPass Admin",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Frontend Usage

```javascript
import advancedService from '../services/advancedService';

// Clawback credits
const result = await advancedService.clawbackCredits(
  'GXXX...', // account public key
  100.50,    // amount
  'fraud'    // reason
);

// Get history
const history = await advancedService.getClawbackHistory();
```

---

## 🔒 Asset Authorization

### What is Asset Authorization?

Asset Authorization allows the issuer to **control who can hold** EDUPASS credits. Accounts must be explicitly authorized before they can receive credits.

This enables:
- **KYC/AML Compliance**: Only verified accounts can hold credits
- **Access Control**: Grant/revoke access dynamically
- **Account Freezing**: Temporarily freeze suspicious accounts

### How It Works

1. Issuer enables `AUTH_REQUIRED` and `AUTH_REVOCABLE` flags
2. New accounts must be authorized before receiving credits
3. Issuer can revoke authorization to freeze accounts
4. Authorization status is tracked in the database

### API Endpoints

#### Authorize Account
```javascript
POST /api/advanced/authorize-account
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountPublicKey": "GXXX...",
  "reason": "Verified student account"
}

Response:
{
  "message": "Account authorized successfully",
  "transactionHash": "abc123...",
  "authorizationId": 42
}
```

#### Revoke Authorization
```javascript
POST /api/advanced/revoke-authorization
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountPublicKey": "GXXX...",
  "reason": "Suspicious activity"
}

Response:
{
  "message": "Authorization revoked successfully",
  "transactionHash": "abc123..."
}
```

#### Check Authorization Status
```javascript
GET /api/advanced/authorization-status/:publicKey
Authorization: Bearer {token}

Response:
{
  "isAuthorized": true,
  "isFrozen": false,
  "authorization": {
    "status": "authorized",
    "authorized_at": "2024-01-15T10:30:00Z",
    "authorized_by": "EduPass Admin",
    "reason": "Verified student"
  }
}
```

### Frontend Usage

```javascript
import advancedService from '../services/advancedService';

// Authorize account
await advancedService.authorizeAccount('GXXX...', 'Verified student');

// Revoke authorization
await advancedService.revokeAuthorization('GXXX...', 'Fraud detected');

// Check status
const status = await advancedService.getAuthorizationStatus('GXXX...');
if (status.isAuthorized && !status.isFrozen) {
  // Account can receive credits
}
```

---

## 🔐 Multi-Signature

### What is Multi-Signature?

Multi-Signature (multi-sig) requires **multiple approvals** before a transaction can be executed. This is critical for:

- **Large Transactions**: Require 2+ approvals for issuing >1000 credits
- **Governance**: Democratic decision-making for important operations
- **Security**: Prevent single-point-of-failure attacks
- **Compliance**: Separation of duties

### How It Works

1. Configure account with multiple signers (weights)
2. Set thresholds (low/medium/high) for different operation types
3. Create multi-sig transaction (saved as pending)
4. Signers approve the transaction
5. Once threshold is met, transaction is submitted to Stellar

### API Endpoints

#### Add Signer
```javascript
POST /api/advanced/add-signer
Authorization: Bearer {token}
Content-Type: application/json

{
  "signerPublicKey": "GXXX...",
  "weight": 1 // 1-255
}

Response:
{
  "message": "Signer added successfully",
  "transactionHash": "abc123..."
}
```

#### Remove Signer
```javascript
POST /api/advanced/remove-signer
Authorization: Bearer {token}
Content-Type: application/json

{
  "signerPublicKey": "GXXX..."
}

Response:
{
  "message": "Signer removed successfully",
  "transactionHash": "abc123..."
}
```

#### Set Thresholds
```javascript
POST /api/advanced/set-thresholds
Authorization: Bearer {token}
Content-Type: application/json

{
  "lowThreshold": 1,    // Payment operations
  "mediumThreshold": 2, // Trustline operations
  "highThreshold": 3    // Account operations
}

Response:
{
  "message": "Thresholds updated successfully",
  "transactionHash": "abc123..."
}
```

#### Create Multi-Sig Transaction
```javascript
POST /api/advanced/create-multisig-transaction
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionType": "issue_credits",
  "metadata": {
    "recipient": "GXXX...",
    "amount": 5000
  },
  "description": "Issue 5000 credits to scholarship program"
}

Response:
{
  "message": "Multi-sig transaction created",
  "transactionId": 42
}
```

#### Sign Transaction
```javascript
POST /api/advanced/sign-transaction
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": 42
}

Response:
{
  "message": "Transaction signed successfully",
  "signatureCount": 2,
  "requiredSignatures": 3,
  "autoSubmitted": false
}
```

#### Submit Multi-Sig Transaction
```javascript
POST /api/advanced/submit-multisig-transaction
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": 42
}

Response:
{
  "message": "Transaction submitted successfully",
  "transactionHash": "abc123...",
  "result": "success"
}
```

### Frontend Usage

```javascript
import advancedService from '../services/advancedService';

// Add signer
await advancedService.addSigner('GXXX...', 1);

// Set thresholds (require 2 signatures for medium operations)
await advancedService.setThresholds(1, 2, 3);

// Create multi-sig transaction
const tx = await advancedService.createMultiSigTransaction(
  'issue_credits',
  { recipient: 'GXXX...', amount: 5000 },
  'Large scholarship issuance'
);

// Sign transaction
await advancedService.signTransaction(tx.transactionId);

// Check if ready to submit
if (advancedService.meetsThreshold(transaction)) {
  await advancedService.submitMultiSigTransaction(tx.transactionId);
}
```

---

## 📚 API Reference

### Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer {your_jwt_token}
```

### Rate Limiting

- 100 requests per minute per user
- 1000 requests per hour per IP

### Error Responses

```javascript
{
  "error": "Insufficient permissions",
  "code": "FORBIDDEN",
  "statusCode": 403
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not an issuer)
- `404` - Not Found
- `500` - Server Error

---

## 🗄️ Database Schema

### account_authorizations
```sql
CREATE TABLE account_authorizations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  stellar_public_key VARCHAR(56) NOT NULL,
  status VARCHAR(20) DEFAULT 'authorized',
  authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  authorized_by INTEGER REFERENCES users(id),
  revoked_at TIMESTAMP,
  revoked_by INTEGER REFERENCES users(id),
  reason TEXT
);
```

### clawbacks
```sql
CREATE TABLE clawbacks (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id),
  stellar_public_key VARCHAR(56) NOT NULL,
  amount DECIMAL(20, 7) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  transaction_hash VARCHAR(64) NOT NULL UNIQUE,
  clawed_back_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### account_signers
```sql
CREATE TABLE account_signers (
  id SERIAL PRIMARY KEY,
  account_public_key VARCHAR(56) NOT NULL,
  signer_public_key VARCHAR(56) NOT NULL,
  weight INTEGER DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER REFERENCES users(id),
  removed_at TIMESTAMP,
  removed_by INTEGER REFERENCES users(id)
);
```

### pending_multisig_transactions
```sql
CREATE TABLE pending_multisig_transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL,
  transaction_xdr TEXT NOT NULL,
  metadata JSONB,
  description TEXT,
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  transaction_hash VARCHAR(64) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending'
);
```

### multisig_signatures
```sql
CREATE TABLE multisig_signatures (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES pending_multisig_transactions(id),
  signer_user_id INTEGER REFERENCES users(id),
  signer_public_key VARCHAR(56) NOT NULL,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 💡 Usage Examples

### Example 1: Fraud Prevention Flow

```javascript
// 1. Detect fraudulent activity
const suspiciousAccount = 'GXXX...';

// 2. Freeze the account
await advancedService.revokeAuthorization(
  suspiciousAccount,
  'Suspicious activity detected'
);

// 3. Clawback all credits
await advancedService.clawbackCredits(
  suspiciousAccount,
  balance,
  'fraud'
);

// 4. Log incident
console.log('Account frozen and credits clawed back');
```

### Example 2: Large Issuance with Multi-Sig

```javascript
// 1. Create multi-sig transaction
const tx = await advancedService.createMultiSigTransaction(
  'issue_credits',
  {
    recipient: 'SCHOOL_ACCOUNT',
    amount: 10000
  },
  'Q1 scholarship program - 10,000 credits'
);

// 2. First approval (CFO)
await advancedService.signTransaction(tx.transactionId);

// 3. Second approval (CEO)
// (Another user signs the transaction)
await advancedService.signTransaction(tx.transactionId);

// 4. Auto-submitted when threshold is met
console.log('Transaction executed with 2-of-3 approval');
```

### Example 3: Student Onboarding

```javascript
// 1. Student registers
const student = await registerStudent({
  name: 'Alice Johnson',
  email: 'alice@university.edu'
});

// 2. KYC verification (manual process)
const verified = await verifyStudentDocuments(student.id);

// 3. Authorize account
if (verified) {
  await advancedService.authorizeAccount(
    student.stellar_public_key,
    `Verified student ID: ${student.student_id}`
  );
}

// 4. Student can now receive credits
console.log('Student account is ready to receive EDUPASS credits');
```

---

## ⚙️ Setup Guide

### 1. Run Database Migration

```bash
# Windows (PowerShell)
psql -U postgres -d edupass -f scripts/phase1-migration.sql

# Linux/Mac
psql -U postgres edupass < scripts/phase1-migration.sql
```

### 2. Enable Asset Controls

First-time setup requires enabling Stellar asset flags:

```javascript
// Backend - one-time setup
const { enableAssetControls } = require('./config/stellar');
await enableAssetControls();
```

Or via API:
```bash
curl -X POST http://localhost:3000/api/advanced/enable-asset-controls \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Configure Multi-Sig (Optional)

For organizations requiring multi-sig:

```javascript
// Add 2 additional signers
await advancedService.addSigner('SIGNER_1_PUBLIC_KEY', 1);
await advancedService.addSigner('SIGNER_2_PUBLIC_KEY', 1);

// Require 2-of-3 for medium operations (>1000 credits)
await advancedService.setThresholds(1, 2, 3);
```

### 4. Test the Features

```javascript
// Test authorization
const testAccount = 'GTEST...';
await advancedService.authorizeAccount(testAccount, 'Test account');

// Issue credits
await issueCredits(testAccount, 100);

// Test clawback
await advancedService.clawbackCredits(testAccount, 50, 'testing');

// Verify
const status = await advancedService.getAuthorizationStatus(testAccount);
console.log(status); // Should show authorized with 50 credits clawed back
```

---

## 🎨 UI Components

Phase 1 includes two React components:

### ClawbackManager.jsx
- **Clawback Tab**: Form to clawback credits with reason selection
- **Authorize Tab**: Authorize new accounts
- **History Tab**: View all clawback operations
- **Enable Controls Button**: One-click asset flag setup

Import and use:
```javascript
import ClawbackManager from '../components/ClawbackManager';

function IssuerDashboard() {
  return (
    <div>
      <ClawbackManager />
    </div>
  );
}
```

### MultiSigManager.jsx
- **Pending Tab**: View and sign pending transactions
- **Signers Tab**: Add/remove signers, set thresholds
- **Create Tab**: Create new multi-sig transactions

Import and use:
```javascript
import MultiSigManager from '../components/MultiSigManager';

function IssuerDashboard() {
  return (
    <div>
      <MultiSigManager />
    </div>
  );
}
```

---

## 🔍 Best Practices

### Clawback
- ✅ Always provide a clear reason
- ✅ Log clawback operations for audit trail
- ✅ Notify users before clawback (when possible)
- ❌ Don't use clawback for routine operations

### Authorization
- ✅ Implement proper KYC before authorization
- ✅ Regular audits of authorized accounts
- ✅ Clear revocation policy
- ❌ Don't freeze accounts without notification

### Multi-Sig
- ✅ Use for transactions > $1,000 equivalent
- ✅ Require 2+ independent approvals
- ✅ Document approval workflows
- ❌ Don't add too many signers (3-5 is optimal)

---

## 🔗 Related Documentation

- [Stellar Guide](./STELLAR_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Soroban Integration](./SOROBAN_INTEGRATION.md)
- [Database Setup](./DATABASE_SETUP.md)

---

## 📞 Support

For questions about Phase 1 features:
- GitHub Issues: https://github.com/davelee001/edupass/issues
- Email: support@edupass.io

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Status**: ✅ Production Ready
