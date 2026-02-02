# Soroban Smart Contract Integration

## Overview

EduPass uses Soroban smart contracts on the Stellar blockchain to manage educational credit issuance, transfer, and redemption. This document explains the integration architecture and how the smart contract interacts with the backend and frontend.

## Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Vite + React)│
└────────┬────────┘
         │ HTTP Requests
         ↓
┌─────────────────┐
│  Express Backend│
│  (Node.js API)  │
├─────────────────┤
│ Soroban Service │  ← Wraps contract calls
│ Soroban Routes  │  ← API endpoints
└────────┬────────┘
         │ Stellar SDK
         ↓
┌─────────────────┐
│ Soroban Contract│
│  (Rust + WASM)  │
│                 │
│ - Issue Credits │
│ - Transfer      │
│ - Burn/Redeem   │
│ - Get Balance   │
└─────────────────┘
         ↓
   Stellar Network
    (Testnet/Mainnet)
```

## Smart Contract Functions

### Core Functions

#### 1. Initialize Contract
```rust
pub fn initialize(env: Env, issuer: Address, asset_code: Symbol)
```
- **Purpose**: Set up the contract with issuer and asset information
- **Called By**: System administrator (one-time setup)
- **Access**: Anyone (but can only be called once)

#### 2. Issue Credits
```rust
pub fn issue_credits(env: Env, issuer: Address, to: Address, amount: i128, 
                     purpose: String, expires_at: Option<u64>) -> i128
```
- **Purpose**: Issue new credits to a beneficiary
- **Called By**: Issuer (NGO/Authority)
- **Access**: Only the registered issuer
- **Returns**: New balance of the recipient

#### 3. Transfer Credits
```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> i128
```
- **Purpose**: Transfer credits between accounts
- **Called By**: Any account holder
- **Access**: Requires authentication from sender
- **Returns**: New balance of sender

#### 4. Burn Credits
```rust
pub fn burn(env: Env, from: Address, amount: i128) -> i128
```
- **Purpose**: Redeem/burn credits (when used at schools)
- **Called By**: Beneficiary when making purchases
- **Access**: Requires authentication from burner
- **Returns**: New balance after burning

#### 5. Get Balance
```rust
pub fn balance(env: Env, id: Address) -> i128
```
- **Purpose**: Query current credit balance
- **Called By**: Anyone
- **Access**: Public read
- **Returns**: Current balance

#### 6. Get Allocation
```rust
pub fn get_allocation(env: Env, id: Address) -> (String, Option<u64>)
```
- **Purpose**: Get metadata about a credit allocation (purpose, expiration)
- **Called By**: Anyone
- **Access**: Public read
- **Returns**: Tuple of (purpose, expiration_timestamp)

#### 7. Total Issued
```rust
pub fn total_issued(env: Env) -> i128
```
- **Purpose**: Get total credits issued by the contract
- **Called By**: Anyone
- **Access**: Public read
- **Returns**: Total issued amount

## Backend Integration

### Service Layer (`backend/src/services/soroban.js`)

The service layer wraps smart contract interactions:

```javascript
const SorobanService = {
  async initialize(issuerKey, assetCode) {...},
  async issueCredits(issuerKey, toKey, amount, purpose, expiresAt) {...},
  async transferCredits(fromKey, toKey, amount) {...},
  async burnCredits(fromKey, amount) {...},
  async getBalance(key) {...},
  async getAllocation(key) {...},
  async getTotalIssued() {...}
};
```

**Key Features**:
- Uses `@stellar/stellar-sdk` for transaction building
- Handles transaction signing and submission
- Provides error logging
- Returns formatted responses

### API Routes (`backend/src/routes/soroban.js`)

RESTful API endpoints for contract operations:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/soroban/initialize` | Initialize contract | Yes (Issuer) |
| POST | `/api/soroban/issue` | Issue credits | Yes (Issuer) |
| POST | `/api/soroban/transfer` | Transfer credits | Yes |
| POST | `/api/soroban/burn` | Burn/redeem credits | Yes |
| GET | `/api/soroban/balance/:key` | Get balance | Yes |
| GET | `/api/soroban/allocation/:key` | Get allocation info | Yes |
| GET | `/api/soroban/total-issued` | Get total issued | Yes |

**Additional Features**:
- Role-based access control (issuer, beneficiary, school)
- Database recording of all transactions
- Input validation
- Error handling

## Frontend Integration

### Service Layer (`frontend/src/services/sorobanService.js`)

The frontend service provides methods to interact with the backend API:

```javascript
import sorobanService from '@/services/sorobanService';

// Issue credits
await sorobanService.issueCredits(beneficiaryId, 1000, 'Tuition Q1', '2024-12-31');

// Transfer credits
await sorobanService.transferCredits(recipientKey, 500, 'Book purchase');

// Burn credits (redeem)
await sorobanService.burnCredits(300, schoolId, 'Uniform purchase');

// Check balance
const { balance } = await sorobanService.getBalance(userKey);

// Get balance with allocation
const data = await sorobanService.getBalanceWithAllocation(userKey);
// Returns: { balance, allocation: { purpose, expiration }, isExpired }
```

## Data Flow Example: Issue Credits

1. **Frontend**: Issuer fills out form to issue 1000 credits to beneficiary
   ```javascript
   await sorobanService.issueCredits(beneficiaryId, 1000, 'School supplies', '2024-12-31');
   ```

2. **Backend API**: Validates request and checks issuer role
   ```javascript
   // POST /api/soroban/issue
   // Validates: user is issuer, beneficiary exists, amount > 0
   ```

3. **Backend Service**: Builds and submits Stellar transaction
   ```javascript
   const result = await sorobanService.issueCredits(
     issuerKey, beneficiaryKey, 1000, 'School supplies', expirationTimestamp
   );
   ```

4. **Smart Contract**: Executes on Stellar network
   ```rust
   // Updates balance: balances[beneficiary] += 1000
   // Stores allocation: allocations[beneficiary] = (purpose, expires_at)
   // Updates total: total_issued += 1000
   ```

5. **Database**: Records transaction
   ```sql
   INSERT INTO transactions (from_key, to_key, amount, type, description)
   VALUES (issuer_key, beneficiary_key, 1000, 'issue', 'School supplies');
   
   INSERT INTO credit_allocations (beneficiary_id, amount, purpose, expires_at)
   VALUES (beneficiary_id, 1000, 'School supplies', '2024-12-31');
   ```

6. **Frontend**: Receives confirmation and updates UI
   ```javascript
   // Response includes: transaction_id, new_balance, allocation_id
   ```

## Environment Configuration

### Backend (.env)

```bash
# Soroban Configuration
SOROBAN_CONTRACT_ID=CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# For production (mainnet)
# SOROBAN_RPC_URL=https://soroban.stellar.org
# SOROBAN_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000/api
```

## Database Schema Integration

The smart contract works alongside PostgreSQL for traditional queries:

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  from_key VARCHAR(56),      -- Stellar public key
  to_key VARCHAR(56),        -- Stellar public key
  amount DECIMAL(20, 7),
  type VARCHAR(20),          -- 'issue', 'transfer', 'burn'
  description TEXT,
  soroban_tx_hash VARCHAR(64), -- Stellar transaction hash
  created_at TIMESTAMP
);
```

### Credit Allocations Table
```sql
CREATE TABLE credit_allocations (
  id UUID PRIMARY KEY,
  beneficiary_id UUID REFERENCES beneficiaries(id),
  amount DECIMAL(20, 7),
  purpose TEXT,
  expires_at TIMESTAMP,
  soroban_key VARCHAR(56),   -- Stellar public key for on-chain lookup
  created_at TIMESTAMP
);
```

## Security Considerations

1. **Authorization**: All write operations require JWT authentication
2. **Role-Based Access**: Only issuers can issue credits
3. **Signature Verification**: Contract verifies signatures on-chain
4. **Secret Key Management**: Backend securely stores issuer secret key
5. **Input Validation**: Amount, addresses, and dates validated before submission

## Testing

### Local Testing (Testnet)

1. Deploy contract to testnet:
   ```bash
   cd contracts/edupass-token
   soroban contract deploy --wasm target/wasm32-unknown-unknown/release/edupass_token.wasm --network testnet
   ```

2. Initialize contract:
   ```bash
   curl -X POST http://localhost:3000/api/soroban/initialize \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"issuer_key": "GXXXXXXX", "asset_code": "EDUPASS"}'
   ```

3. Test issuance:
   ```bash
   curl -X POST http://localhost:3000/api/soroban/issue \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "beneficiary_id": "uuid-here",
       "amount": 1000,
       "description": "Test issuance"
     }'
   ```

### Unit Tests

Run smart contract tests:
```bash
cd contracts/edupass-token
cargo test
```

## Deployment Checklist

- [ ] Compile smart contract: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Optimize WASM: `soroban contract optimize`
- [ ] Deploy to testnet: `soroban contract deploy`
- [ ] Initialize contract with issuer
- [ ] Update `SOROBAN_CONTRACT_ID` in backend .env
- [ ] Test all endpoints on testnet
- [ ] Deploy contract to mainnet (when ready)
- [ ] Update RPC URL and network passphrase for mainnet

## Troubleshooting

### Common Issues

**Issue**: "Contract not found"
- **Solution**: Verify `SOROBAN_CONTRACT_ID` is correctly set in .env
- **Solution**: Ensure contract is deployed to the correct network

**Issue**: "Unauthorized" error when issuing
- **Solution**: Check JWT token is valid and user has issuer role
- **Solution**: Verify issuer public key matches contract's registered issuer

**Issue**: Transaction timeout
- **Solution**: Increase timeout in Stellar SDK configuration
- **Solution**: Check Soroban RPC endpoint is responsive

**Issue**: "Insufficient balance" when transferring
- **Solution**: Verify account has enough credits via `/balance` endpoint
- **Solution**: Check if credits have expired

## Future Enhancements

- [ ] Multi-issuer support
- [ ] Batch issuance for multiple beneficiaries
- [ ] Credit splitting/partial transfers
- [ ] Automatic expiration handling
- [ ] Integration with Stellar DEX for credit trading
- [ ] Mobile app integration
- [ ] Real-time balance updates via WebSocket

## Resources

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [EduPass Smart Contract Code](../contracts/edupass-token/src/lib.rs)
- [API Reference](./API_REFERENCE.md)
