#!/bin/bash

# Deploy the EduPass Soroban Smart Contract to Stellar Network
# This script deploys the compiled WASM contract and generates a contract ID

set -e

# Configuration
NETWORK="${NETWORK:-testnet}"
WASM_PATH="./contracts/target/wasm32-unknown-unknown/release/edupass_token.wasm"

echo "🚀 Deploying EduPass Soroban Contract to $NETWORK..."

# Check if WASM file exists
if [ ! -f "$WASM_PATH" ]; then
    echo "❌ Error: WASM file not found at $WASM_PATH"
    echo "Please run ./scripts/soroban-build.sh first"
    exit 1
fi

# Check if soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Error: Soroban CLI not found"
    echo "Install it with: cargo install --locked soroban-cli"
    exit 1
fi

# Deploy the contract
echo "📤 Deploying contract..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm "$WASM_PATH" \
  --source-account default \
  --network "$NETWORK")

echo ""
echo "✅ Contract deployed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Contract ID: $CONTRACT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚙️  Next steps:"
echo "1. Add this to your backend/.env file:"
echo "   SOROBAN_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "2. Initialize the contract:"
echo "   soroban contract invoke \\"
echo "     --id $CONTRACT_ID \\"
echo "     --source-account default \\"
echo "     --network $NETWORK \\"
echo "     -- initialize \\"
echo "     --admin YOUR_ADMIN_ADDRESS"
echo ""
echo "3. Or use the initialization script:"
echo "   ADMIN_ADDRESS=YOUR_ADDRESS ./scripts/soroban-initialize.sh"
