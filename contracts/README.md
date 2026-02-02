# EduPass Soroban Smart Contract

This directory contains the Soroban smart contract for EduPass education credits on the Stellar blockchain.

## Overview

The EduPass smart contract provides:
- **Credit Issuance**: Issue education credits to beneficiaries
- **Credit Transfer**: Transfer credits from beneficiaries to schools
- **Credit Burning**: Redeem and remove credits from circulation
- **Balance Tracking**: Query balances and allocation details
- **Metadata Storage**: Store allocation purpose and expiration

## Contract Functions

### Administrative Functions
- `initialize(admin)` - Initialize the contract with an admin address

### Core Functions
- `issue_credits(issuer, beneficiary, amount, purpose, expires_at)` - Issue new credits
- `transfer(from, to, amount)` - Transfer credits between accounts
- `burn(account, amount)` - Burn (redeem) credits
- `balance(account)` - Get balance for an account
- `get_allocation(beneficiary)` - Get allocation metadata
- `total_issued()` - Get total credits issued

## Prerequisites

Before building the contract, ensure you have:
- **Rust** installed ([Install Guide](https://www.rust-lang.org/tools/install))
- **Soroban CLI** installed: `cargo install --locked soroban-cli`
- **WASM target**: `rustup target add wasm32-unknown-unknown`

## Building the Contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM file will be at:
```
target/wasm32-unknown-unknown/release/edupass_token.wasm
```

## Testing the Contract

Run the test suite:

```bash
cargo test
```

## Deploying to Testnet

### 1. Create an Identity

```powershell
stellar keys generate deployer --network testnet
```

### 2. Fund the Account

```powershell
stellar keys fund deployer --network testnet
```

### 3. Deploy the Contract

```powershell
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/edupass_token.wasm `
  --source-account deployer `
  --network testnet `
  --alias edupass_token
```

### 4. Initialize the Contract

```powershell
stellar contract invoke `
  --id <CONTRACT_ID> `
  --source-account deployer `
  --network testnet `
  -- initialize `
  --admin <ADMIN_ADDRESS>
```

### 5. Issue Credits

```powershell
stellar contract invoke `
  --id <CONTRACT_ID> `
  --source-account issuer `
  --network testnet `
  -- issue_credits `
  --issuer <ISSUER_ADDRESS> `
  --beneficiary <BENEFICIARY_ADDRESS> `
  --amount 1000 `
  --purpose "School Tuition" `
  --expires_at 1735689600
```

## Generating TypeScript Bindings

Generate TypeScript bindings for frontend integration:

```powershell
stellar contract bindings typescript `
  --contract-id <CONTRACT_ID> `
  --network testnet `
  --output-dir ../backend/src/contracts/bindings
```

## Integration with Backend

The backend will interact with this contract for:
1. Issuing credits when admins allocate to beneficiaries
2. Transferring credits when beneficiaries pay schools
3. Burning credits when schools redeem for fiat
4. Querying balances for dashboard displays

## Contract Architecture

```
EduPass Smart Contract
├── Data Storage
│   ├── Admin (contract admin)
│   ├── Credits (address balances)
│   ├── Allocations (metadata)
│   └── TotalIssued (total credits)
├── Functions
│   ├── Issue Credits
│   ├── Transfer Credits
│   ├── Burn Credits
│   └── Query Functions
└── Events (future)
    ├── CreditsIssued
    ├── CreditsTransferred
    └── CreditsBurned
```

## Security Considerations

- **Authorization**: All functions require proper authentication
- **Balance Checks**: Transfers validate sufficient balance
- **Positive Amounts**: All amounts must be positive
- **Initialization**: Contract can only be initialized once
- **Expiration**: Allocations include expiration timestamps

## Next Steps

1. Deploy contract to testnet
2. Generate TypeScript bindings
3. Integrate with backend API
4. Update frontend to use contract functions
5. Add event logging
6. Implement multi-signature for large issuances
7. Add pause/unpause functionality for emergencies

## Resources

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Soroban SDK](https://docs.rs/soroban-sdk/latest/soroban_sdk/)
- [Stellar Documentation](https://developers.stellar.org/)
