# Phase 3: Advanced Stellar Features

This document covers the Phase 3 features: **Time-Bounded Transactions**, **Muxed Accounts**, **SEP-24 Anchor Integration**, **Path Payments**, **On-Chain Data Management**, and **Account Merging** for the EduPass education credits system.

## 🎯 Overview

Phase 3 adds six advanced features for enhanced transaction control, asset conversion, and account management:

1. **Time-Bounded Transactions** - Automatic expiration for time-sensitive payments
2. **Muxed Accounts** - Better organization with multiplexed addresses
3. **SEP-24 Anchors** - Fiat currency integration via regulated anchors
4. **Path Payments** - Automatic asset conversion through the network
5. **On-Chain Data Management** - Store metadata directly on the blockchain
6. **Account Merge** - Consolidate multiple accounts into one

These features enable:
- ✅ Time-sensitive scholarship distributions with auto-expiration
- ✅ Organized payment tracking with categorized addresses
- ✅ Seamless fiat-to-crypto conversion for accessibility
- ✅ Automatic asset conversion for cross-currency payments
- ✅ Permanent on-chain storage of student and institutional metadata
- ✅ Account consolidation and cleanup operations
- ✅ Enhanced security with transaction time windows
- ✅ Lower barrier to entry with fiat on/off ramps

---

## 📋 Table of Contents

1. [Time-Bounded Transactions](#time-bounded-transactions)
2. [Muxed Accounts](#muxed-accounts)
3. [SEP-24 Anchor Integration](#sep-24-anchor-integration)
4. [Path Payments](#path-payments)
5. [On-Chain Data Management](#on-chain-data-management)
6. [Account Merge](#account-merge)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Usage Examples](#usage-examples)
7. [Setup Guide](#setup-guide)

---

## ⏰ Time-Bounded Transactions

### What are Time-Bounded Transactions?

Time-bounded transactions have **automatic expiration** using `minTime` and `maxTime` parameters. They become invalid outside the specified time window, preventing late submissions and enabling time-sensitive operations.

**Benefits:**
- **Automatic Expiration**: Transactions expire without manual intervention
- **Time-Sensitive Payments**: Perfect for flash scholarships or limited offers
- **Security**: Prevents replay attacks and stale transactions
- **Conditional Validity**: Set future start times for scheduled payments

### How It Works

```
Transaction Created
├── minTime: 0 (or future timestamp)
├── maxTime: current + 3600 (expires in 1 hour)
│
├─→ Before minTime: Transaction INVALID ❌
├─→ Between min/max: Transaction VALID ✅
└─→ After maxTime: Transaction EXPIRED ❌
```

### Use Cases

#### 1. Flash Scholarships
```javascript
// Scholarship valid for 24 hours only
const scholarship = await createTimeBoundedTransaction(
  studentPublicKey,
  500,  // 500 EDUPASS
  1440, // expires in 24 hours
  0,    // valid immediately
  "Flash Scholarship - 24h only"
);
```

#### 2. Scheduled Future Payments
```javascript
// Payment valid only next semester (starts in 30 days, expires in 60 days)
const futurePayment = await createTimeBoundedTransaction(
  studentPublicKey,
  1000,
  86400, // valid for 60 days
  43200, // but only starts in 30 days
  "Next semester tuition"
);
```

#### 3. Limited-Time Offers
```javascript
// Cafeteria discount valid for lunch hour only
const lunchDiscount = await createTimeBoundedTransaction(
  cafeteriaPublicKey,
  10,
  60,  // expires in 1 hour
  0,
  "Lunch hour discount"
);
```

### API Endpoints

#### Create Time-Bounded Transaction
```http
POST /api/phase3/time-bounded-transaction
Authorization: Bearer <token>

{
  "destinationPublicKey": "GBXXX...",
  "amount": 100,
  "expiresInMinutes": 60,      // 0 = no expiration
  "validAfterMinutes": 0,       // 0 = immediately valid
  "memo": "Time-sensitive payment"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "abc123...",
  "minTime": 1709897234,
  "maxTime": 1709900834,
  "expiresAt": "2024-03-08T15:00:34.000Z",
  "validAfter": null
}
```

#### Check Transaction Expiration
```http
GET /api/phase3/check-expiration/:maxTime
```

**Response:**
```json
{
  "expired": false,
  "message": "Transaction is still valid",
  "expiresAt": "2024-03-08T15:00:34.000Z",
  "timeRemaining": 2847
}
```

### Frontend Component

```jsx
import TimeBoundedTransactionManager from '../components/TimeBoundedTransactionManager';

// In your page
<TimeBoundedTransactionManager />
```

### Database Changes

Transaction table columns added:
- `min_time`: BIGINT - Minimum valid timestamp (0 = no minimum)
- `max_time`: BIGINT - Maximum valid timestamp (0 = no maximum)

---

## 🔢 Muxed Accounts

### What are Muxed Accounts?

Muxed (multiplexed) accounts allow **multiple virtual addresses** that map to the same Stellar account. Instead of one address (G...), you can have many categorized addresses (M...) for better organization.

**Benefits:**
- **Better Organization**: Separate addresses for different payment types
- **Payment Tracking**: Easily identify payment sources/purposes
- **Privacy**: Don't reveal your main public key
- **Simplified Accounting**: Categorize income streams automatically

### How It Works

```
Base Account: GBXXX...XXX (Your main Stellar account)
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
Muxed #1      Muxed #2      Muxed #3      Muxed #4
Tuition       Cafeteria     Supplies      Scholarships
MAAA...001    MAAA...002    MAAA...003    MAAA...004
```

All payments to any muxed account arrive at the same base account, but you can track which category received the payment.

### Use Cases

#### 1. School Payment Categories
```javascript
// Create separate muxed accounts for different departments
const tuitionAccount = await createMuxedAccount('1001', 'Tuition Payments');
const cafeteriaAccount = await createMuxedAccount('1002', 'Cafeteria');
const suppliesAccount = await createMuxedAccount('1003', 'School Supplies');

// Share different addresses with different payers
// All payments arrive at your account but are categorized
```

#### 2. Multi-Department Organization
```javascript
// University with multiple departments
const departments = [
  { id: '2001', label: 'Computer Science Dept' },
  { id: '2002', label: 'Mathematics Dept' },
  { id: '2003', label: 'Physics Dept' }
];

for (const dept of departments) {
  await createMuxedAccount(dept.id, dept.label);
}
```

#### 3. Student Income Tracking
```javascript
// Track different scholarship sources
await createMuxedAccount('3001', 'Merit Scholarship');
await createMuxedAccount('3002', 'Need-Based Grant');
await createMuxedAccount('3003', 'Athletic Scholarship');
```

### API Endpoints

#### Create Muxed Account
```http
POST /api/phase3/create-muxed-account
Authorization: Bearer <token>

{
  "id": "1234567890",
  "label": "Tuition Payments"
}
```

**Response:**
```json
{
  "success": true,
  "muxedAccount": {
    "muxedAddress": "MAAAAAAAAAAA....",
    "baseAddress": "GBXXX...XXX",
    "id": "1234567890"
  }
}
```

#### Get All Muxed Accounts
```http
GET /api/phase3/muxed-accounts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "muxedAccounts": [
    {
      "muxed_address": "MAAA...001",
      "muxed_id": "1001",
      "label": "Tuition",
      "created_at": "2024-03-01T10:00:00Z"
    }
  ]
}
```

#### Parse Muxed Account
```http
POST /api/phase3/parse-muxed-account

{
  "muxedAddress": "MAAA...001"
}
```

**Response:**
```json
{
  "success": true,
  "muxedAddress": "MAAA...001",
  "baseAddress": "GBXXX...XXX",
  "id": "1001"
}
```

#### Send to Muxed Account
```http
POST /api/phase3/send-to-muxed
Authorization: Bearer <token>

{
  "muxedDestination": "MAAA...001",
  "amount": 100
}
```

### Frontend Component

```jsx
import MuxedAccountManager from '../components/MuxedAccountManager';

// In your page
<MuxedAccountManager />
```

### Database Schema

**muxed_accounts table:**
```sql
CREATE TABLE muxed_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    base_address VARCHAR(56),
    muxed_address VARCHAR(100) UNIQUE,
    muxed_id VARCHAR(20),
    label VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, muxed_id)
);
```

---

## 💱 SEP-24 Anchor Integration

### What is SEP-24?

SEP-24 is the **Hosted Deposit and Withdrawal** standard that enables seamless **fiat-to-crypto** and **crypto-to-fiat** conversion through regulated anchor services.

**Benefits:**
- **Fiat On-Ramp**: Convert USD, EUR, etc. into EDUPASS credits
- **Fiat Off-Ramp**: Cash out EDUPASS back to bank account
- **Regulatory Compliance**: Anchors handle KYC/AML requirements
- **Lower Barrier**: Users can fund accounts with familiar fiat
- **Interactive Flow**: User-friendly web interface for deposits/withdrawals

### How It Works

#### Deposit Flow (Fiat → Crypto)
```
1. User initiates deposit via API
2. API returns interactive URL
3. User completes KYC/payment at anchor website
4. Anchor issues EDUPASS credits to user's account
5. User receives credits on Stellar
```

#### Withdrawal Flow (Crypto → Fiat)
```
1. User initiates withdrawal via API
2. API returns interactive URL
3. User provides bank details at anchor website
4. User sends EDUPASS to anchor
5. Anchor deposits fiat to user's bank account
```

### Use Cases

#### 1. Parent Funding Student Account
```javascript
// Parent deposits $500 to fund student's EDUPASS account
const deposit = await initiateSEP24Deposit('EDUPASS', 500);

// Opens interactive window for parent to:
// - Complete KYC verification
// - Link bank account
// - Transfer $500 via ACH/wire
// - Receive 500 EDUPASS credits

window.open(deposit.interactiveUrl);
```

#### 2. Student Cashing Out Scholarship
```javascript
// Student won scholarship, wants to withdraw to bank
const withdrawal = await initiateSEP24Withdrawal('EDUPASS', 1000);

// Student provides:
// - Bank account details
// - Sends 1000 EDUPASS to anchor
// - Receives $1000 in bank account

window.open(withdrawal.interactiveUrl);
```

#### 3. School Accepting Fiat Tuition
```javascript
// School helps parents pay tuition using fiat
// They initiate deposit on behalf of parent
const tuitionDeposit = await initiateSEP24Deposit('EDUPASS', 5000);

// Parent completes payment, student receives credits
```

### API Endpoints

#### Initiate Deposit (Fiat → Crypto)
```http
POST /api/phase3/sep24/deposit
Authorization: Bearer <token>

{
  "assetCode": "EDUPASS",
  "amount": 500,
  "anchorDomain": "testanchor.stellar.org"
}
```

**Response:**
```json
{
  "success": true,
  "id": "deposit_1234567890",
  "type": "deposit",
  "status": "pending_user_transfer_start",
  "assetCode": "EDUPASS",
  "amount": 500,
  "interactiveUrl": "https://testanchor.stellar.org/deposit?transaction_id=...",
  "message": "Please complete the deposit at the interactive URL"
}
```

#### Initiate Withdrawal (Crypto → Fiat)
```http
POST /api/phase3/sep24/withdrawal
Authorization: Bearer <token>

{
  "assetCode": "EDUPASS",
  "amount": 1000,
  "anchorDomain": "testanchor.stellar.org"
}
```

**Response:**
```json
{
  "success": true,
  "id": "withdrawal_1234567890",
  "type": "withdrawal",
  "status": "pending_user_transfer_start",
  "assetCode": "EDUPASS",
  "amount": 1000,
  "interactiveUrl": "https://testanchor.stellar.org/withdraw?transaction_id=...",
  "message": "Please complete the withdrawal at the interactive URL"
}
```

#### Get Transaction Status
```http
GET /api/phase3/sep24/transaction/:transactionId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "id": "deposit_1234567890",
  "status": "completed",
  "type": "deposit",
  "amount": 500,
  "assetCode": "EDUPASS",
  "message": "Transaction completed successfully"
}
```

#### Get All Transactions
```http
GET /api/phase3/sep24/transactions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "transaction_id": "deposit_123",
      "type": "deposit",
      "asset_code": "EDUPASS",
      "amount": 500,
      "status": "completed",
      "anchor_domain": "testanchor.stellar.org",
      "created_at": "2024-03-01T10:00:00Z"
    }
  ]
}
```

### Transaction Statuses

- `pending_user_transfer_start` - Waiting for user to start the process
- `pending_anchor` - Anchor is processing the transaction
- `pending_stellar` - Transaction submitted to Stellar network
- `completed` - Transaction finished successfully
- `error` - Transaction failed

### Frontend Component

```jsx
import SEP24Manager from '../components/SEP24Manager';

// In your page
<SEP24Manager />
```

### Database Schema

**sep24_transactions table:**
```sql
CREATE TABLE sep24_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_id VARCHAR(255) UNIQUE,
    type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal')),
    asset_code VARCHAR(12),
    amount DECIMAL(20, 7),
    status VARCHAR(50),
    anchor_domain VARCHAR(255),
    interactive_url TEXT,
    stellar_transaction_id VARCHAR(64),
    external_transaction_id VARCHAR(255),
    more_info_url TEXT,
    message TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## � Path Payments

### What are Path Payments?

Path payments enable **automatic asset conversion** through the Stellar network. You can send one asset type and the recipient receives a different asset type, with conversion happening automatically through the best available market paths.

**Benefits:**
- **Automatic Conversion**: Network handles currency exchange
- **Best Rates**: Automatically finds optimal conversion path
- **Cross-Currency Payments**: Send XLM, recipient gets EDUPASS
- **Transparency**: Know maximum send amount upfront
- **Multi-Hop**: Can convert through multiple intermediary assets

### How It Works

```
Sender Account (XLM)
    ↓
Path Payment Operation
    ↓ (automatic conversion via DEX)
Recipient Account (EDUPASS)
```

**Process:**
1. Specify destination account and amount they should receive
2. Specify maximum amount you're willing to send
3. Network finds best conversion path through order books
4. Transaction executes if path exists within send limit
5. Recipient gets exact amount in their desired asset

### Use Cases for EduPass

1. **Cross-Currency Scholarships**: School sends XLM, student receives EDUPASS credits
2. **Fiat Integration**: Convert from anchored USD to EDUPASS seamlessly
3. **Flexible Donations**: Donors send any asset, institution receives EDUPASS
4. **Payment Flexibility**: Students pay fees in any supported asset

### Frontend Component

The `PathPaymentManager` component provides two main functions:

**Send Payment Tab:**
- Select destination account
- Specify amount to receive and asset type
- Set maximum amount willing to send
- Choose source asset (XLM or custom)
- Execute path payment with automatic conversion

**Find Paths Tab:**
- Search for available payment paths
- View all possible conversion routes
- See estimated costs for each path
- Compare exchange rates

### Backend Implementation

```javascript
// Send path payment
POST /api/phase3/path-payment
{
  "destinationPublicKey": "GXXX...",
  "destAmount": 100,
  "destAssetCode": "EDUPASS",
  "sendMax": 110,
  "sendAssetCode": null  // null = XLM
}

// Find available paths
POST /api/phase3/find-paths
{
  "destinationPublicKey": "GXXX...",
  "destAssetCode": "EDUPASS",
  "destAmount": 100
}
```

---

## 📝 On-Chain Data Management

### What is On-Chain Data?

Stellar accounts can store **up to 64 bytes of metadata per entry** directly on the blockchain. This data is publicly readable, permanent, and associated with the account.

**Benefits:**
- **Permanent Storage**: Data lives on blockchain forever
- **Publicly Verifiable**: Anyone can read and verify
- **Immutable History**: Changes are tracked on ledger
- **No External Database**: Decentralized storage
- **Low Cost**: Small fee per entry

### How It Works

```
Account Data Entries
├── Key: "student_id" → Value: "STU-2024-001"
├── Key: "institution" → Value: "Harvard"
├── Key: "graduation_year" → Value: "2028"
└── Key: "program" → Value: "CS-BS"
```

**Data Entry Operations:**
- **Add**: Set new key-value pair
- **Update**: Change value for existing key
- **Delete**: Set value to null to remove entry

### Use Cases for EduPass

1. **Student Identification**: Store student ID numbers on-chain
2. **Institutional Metadata**: University name, department codes
3. **Credential Verification**: Link to off-chain credential hashes
4. **Contact Info**: Store email hashes for recovery
5. **Program Tracking**: Degree program, expected graduation year

### Data Entry Limits

- **Key**: Max 64 characters (string)
- **Value**: Max 64 bytes (base64 encoded)
- **Count**: Unlimited entries (each increases minimum balance)
- **Fee**: 0.5 XLM base reserve per entry

### Frontend Component

The `DataManager` component provides:

**Add/Update Tab:**
- Enter key name (e.g., "student_id")
- Enter value (e.g., "STU-2024-001")
- Leave value empty to delete entry
- Submit to blockchain

**View Data Tab:**
- Enter any account public key
- Load all data entries for that account
- View key-value pairs
- Delete your own entries

### Backend Implementation

```javascript
// Add or update data
POST /api/phase3/manage-data
{
  "key": "student_id",
  "value": "STU-2024-001"  // null to delete
}

// Get account data entries
GET /api/phase3/account-data?publicKey=GXXX...
```

---

## 🔀 Account Merge

### What is Account Merge?

Account merging is a **permanent, irreversible operation** that transfers all XLM from one account to another and deletes the source account.

**⚠️ WARNING: This operation CANNOT be undone!**

**What Happens:**
- All XLM balance transferred to destination
- Source account permanently deleted
- All trustlines removed
- All data entries removed
- All offers cancelled
- Base reserve returned

### Requirements for Merging

An account can only be merged if:
- ✅ No active trustlines
- ✅ No open offers on the DEX
- ✅ Sufficient XLM balance (above minimum)
- ✅ No outstanding clawback flags
- ✅ Destination account exists

### How It Works

```
Source Account
├── Balance: 100 XLM
├── Trustlines: 0 (must be removed first)
├── Offers: 0 (must be cancelled first)
└── Data: 0 (will be deleted)
    ↓ MERGE OPERATION
Destination Account
└── Balance: +100 XLM

Source Account → DELETED PERMANENTLY
```

### Use Cases for EduPass

1. **Account Consolidation**: Merge test accounts into main account
2. **Cleanup**: Remove unused student accounts after graduation
3. **Fund Recovery**: Retrieve XLM from old accounts
4. **Simplification**: Combine multiple institutional accounts

### Frontend Component

The `AccountMergeManager` component provides:

**Check Eligibility Tab:**
- Enter account public key to check
- View balance, subentries, signers
- See if account can be merged
- Get detailed eligibility report

**Merge Account Tab:**
- ⚠️ Multiple warning dialogs
- Enter destination public key
- Confirm irreversible action
- Execute merge operation
- View final transaction details

### Backend Implementation

```javascript
// Check if account can be merged
GET /api/phase3/can-merge?publicKey=GXXX...

// Merge account (IRREVERSIBLE!)
POST /api/phase3/merge-account
{
  "destinationPublicKey": "GXXX..."
}
```

### Security Considerations

- ⚠️ **Irreversible**: No undo, backup data first
- ⚠️ **Permanent Deletion**: Account gone forever
- ⚠️ **Preparation Required**: Remove trustlines and offers first
- ✅ **Verification**: Check eligibility before merging
- ✅ **Confirmation**: Multiple confirmation dialogs

---

## �📚 API Reference

### Time-Bounded Transactions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/phase3/time-bounded-transaction` | POST | ✅ | Create time-bounded transaction |
| `/api/phase3/check-expiration/:maxTime` | GET | ❌ | Check if transaction expired |

### Muxed Accounts

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/phase3/create-muxed-account` | POST | ✅ | Create new muxed account |
| `/api/phase3/muxed-accounts` | GET | ✅ | Get all user's muxed accounts |
| `/api/phase3/parse-muxed-account` | POST | ❌ | Parse muxed address |
| `/api/phase3/send-to-muxed` | POST | ✅ | Send credits to muxed account |

### SEP-24 Anchors

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/phase3/sep24/deposit` | POST | ✅ | Initiate fiat deposit |
| `/api/phase3/sep24/withdrawal` | POST | ✅ | Initiate fiat withdrawal |
| `/api/phase3/sep24/transaction/:id` | GET | ✅ | Get transaction status |
| `/api/phase3/sep24/transactions` | GET | ✅ | Get all transactions |

### Path Payments

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/phase3/path-payment` | POST | ✅ | Send payment with automatic conversion |
| `/api/phase3/find-paths` | POST | ✅ | Find available payment paths |

### On-Chain Data Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/phase3/manage-data` | POST | ✅ | Add/update/delete account data |
| `/api/phase3/account-data` | GET | ❌ | Get all data entries for an account |

### Account Merge

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/phase3/can-merge` | GET | ❌ | Check if account can be merged |
| `/api/phase3/merge-account` | POST | ✅ | Merge account (IRREVERSIBLE!) |

---

## 🗄️ Database Schema

### Transactions Table Updates
```sql
ALTER TABLE transactions
ADD COLUMN min_time BIGINT DEFAULT 0,
ADD COLUMN max_time BIGINT DEFAULT 0,
ADD COLUMN muxed_destination VARCHAR(100);
```

### New Tables

See the complete migration in `/scripts/phase3-migration.sql`

---

## 💻 Setup Guide

### 1. Run Database Migration

```bash
# Windows
cd scripts
psql -U postgres -d edupass -f phase3-migration.sql

# Linux/Mac
cd scripts
psql -U postgres -d edupass < phase3-migration.sql
```

### 2. Backend Setup

No additional dependencies needed! Phase 3 uses the existing Stellar SDK.

### 3. Test the Features

```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```

### 4. Access Phase 3 Features

Navigate to the appropriate dashboard page and import the Phase 3 components:

```jsx
import TimeBoundedTransactionManager from '../components/TimeBoundedTransactionManager';
import MuxedAccountManager from '../components/MuxedAccountManager';
import SEP24Manager from '../components/SEP24Manager';
```

---

## 🎓 Usage Examples

### Complete Workflow Example

```javascript
// 1. CREATE MUXED ACCOUNTS FOR ORGANIZATION
const tuitionMuxed = await createMuxedAccount('5001', 'Tuition');
const cafeteriaMuxed = await createMuxedAccount('5002', 'Cafeteria');

// 2. SHARE MUXED ADDRESSES
console.log(`Pay tuition to: ${tuitionMuxed.muxedAddress}`);
console.log(`Pay cafeteria to: ${cafeteriaMuxed.muxedAddress}`);

// 3. PARENT DEPOSITS FIAT VIA SEP-24
const deposit = await initiateSEP24Deposit('EDUPASS', 1000);
window.open(deposit.interactiveUrl);
// Parent completes KYC and bank transfer

// 4. CREATE TIME-BOUNDED SCHOLARSHIP
const scholarship = await createTimeBoundedTransaction(
  studentPublicKey,
  500,
  1440, // 24 hour expiration
  0,
  "Flash scholarship - claim within 24h!"
);

// 5. STUDENT RECEIVES PAYMENT TO MUXED ACCOUNT
await sendToMuxedAccount(tuitionMuxed.muxedAddress, 500);

// 6. TRACK ALL SEP-24 TRANSACTIONS
const transactions = await getSEP24Transactions();
console.log('All fiat conversions:', transactions);
```

---

## 🔒 Security Considerations

### Time-Bounded Transactions
- ⚠️ Ensure system clocks are synchronized
- ⚠️ Account for network latency when setting expiration
- ⚠️ Use reasonable time windows (not too short)

### Muxed Accounts
- ✅ Muxed IDs must be unique per user
- ✅ Store labels securely in database
- ✅ Parse muxed addresses before displaying

### SEP-24
- ⚠️ Always use HTTPS for interactive URLs
- ⚠️ Verify anchor domain authenticity
- ⚠️ Never store user bank details
- ✅ Let anchors handle KYC/AML compliance

### Path Payments
- ⚠️ Always set realistic sendMax to avoid overpaying
- ⚠️ Check available paths before executing payment
- ⚠️ Account for slippage in conversion rates
- ✅ Monitor order book depth for large payments

### On-Chain Data
- ⚠️ Never store sensitive information (passwords, private keys)
- ⚠️ Data is publicly readable by anyone
- ⚠️ Consider GDPR/privacy before storing personal data
- ✅ Use hashes instead of raw data when possible
- ✅ Each entry increases minimum balance requirement

### Account Merge
- ⚠️ IRREVERSIBLE - cannot undo after execution
- ⚠️ Must remove all trustlines before merging
- ⚠️ Must cancel all DEX offers before merging
- ⚠️ Backup any important data entries first
- ✅ Always check eligibility before attempting merge
- ✅ Double-check destination address

---

## 🚀 Next Steps

**Phase 3 Complete!** You now have:
- ✅ Time-bounded transactions for expiring payments
- ✅ Muxed accounts for organized payment tracking
- ✅ SEP-24 integration for fiat on/off ramps
- ✅ Path payments for automatic currency conversion
- ✅ On-chain data management for metadata storage
- ✅ Account merge for consolidation and cleanup

**Potential Future Enhancements:**
- Liquidity pools for EDUPASS trading
- Automated market makers (AMM) for better liquidity
- Atomic swaps with other educational institutions
- Cross-border payments with anchors in multiple countries
- Claimable balances for conditional payments
- Regulated assets compliance integration

---

## 📞 Support

For questions or issues:
- Check the API Reference section
- Review the database migration SQL
- Test with the provided frontend components
- Consult Stellar documentation: https://developers.stellar.org

---

**Built with ❤️ for the EduPass Education Credits System**
