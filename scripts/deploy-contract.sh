#!/bin/bash

# Deploy Soroban Smart Contract to Stellar Testnet
# This script builds and deploys the EduPass token contract

set -e

# Configuration
NETWORK="testnet"
ADMIN_SECRET="${ISSUER_SECRET_KEY:-}"

if [ -z "$ADMIN_SECRET" ]; then
    echo "Error: ISSUER_SECRET_KEY environment variable not set"
    echo "Please set it first: export ISSUER_SECRET_KEY=your_secret_key"
    exit 1
fi

echo "🚀 Deploying EduPass Smart Contract to Stellar $NETWORK..."

# Build the contract first
echo "📦 Building contract..."
bash "$(dirname "$0")/build-contract.sh"

# Navigate to contracts directory
cd "$(dirname "$0")/../contracts/edupass-token"

# Deploy the contract
echo "🌐 Deploying to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/edupass_token_optimized.wasm \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK")

echo ""
echo "✅ Contract deployed successfully!"
echo "📋 Contract ID: $CONTRACT_ID"
echo ""
echo "🔧 Next steps:"
echo "1. Add this to your backend/.env file:"
echo "   SOROBAN_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "2. Initialize the contract:"
echo "   stellar contract invoke \\"
echo "     --id $CONTRACT_ID \\"
echo "     --source-account $ADMIN_SECRET \\"
echo "     --network $NETWORK \\"
echo "     -- \\"
echo "     initialize \\"
echo "     --admin \$(stellar keys address admin)"
echo ""

# Save contract ID to a file
echo "$CONTRACT_ID" > contract-id.txt
echo "Contract ID saved to: contracts/edupass-token/contract-id.txt"
