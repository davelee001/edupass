#!/bin/bash

# Initialize the deployed EduPass Soroban Contract
# This script calls the initialize function with an admin address

set -e

# Configuration
NETWORK="${NETWORK:-testnet}"
ADMIN_ADDRESS="${ADMIN_ADDRESS}"

# Read CONTRACT_ID from .env if not set
if [ -z "$CONTRACT_ID" ]; then
    if [ -f "./backend/.env" ]; then
        export $(grep SOROBAN_CONTRACT_ID ./backend/.env | xargs)
        CONTRACT_ID="$SOROBAN_CONTRACT_ID"
    fi
fi

echo "🔧 Initializing EduPass Soroban Contract..."

# Validate inputs
if [ -z "$CONTRACT_ID" ]; then
    echo "❌ Error: CONTRACT_ID not set"
    echo "Set it with: export CONTRACT_ID=YOUR_CONTRACT_ID"
    echo "Or add SOROBAN_CONTRACT_ID to backend/.env"
    exit 1
fi

if [ -z "$ADMIN_ADDRESS" ]; then
    echo "❌ Error: ADMIN_ADDRESS not set"
    echo "Set it with: export ADMIN_ADDRESS=YOUR_STELLAR_ADDRESS"
    exit 1
fi

# Check if soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Error: Soroban CLI not found"
    echo "Install it with: cargo install --locked soroban-cli"
    exit 1
fi

# Initialize the contract
echo "📝 Contract ID: $CONTRACT_ID"
echo "👤 Admin Address: $ADMIN_ADDRESS"
echo "🌐 Network: $NETWORK"
echo ""
echo "Initializing contract..."

soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source-account default \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS"

echo ""
echo "✅ Contract initialized successfully!"
echo ""
echo "You can now use the contract to:"
echo "  • Issue credits: issue_credits"
echo "  • Transfer credits: transfer"
echo "  • Burn credits: burn"
echo "  • Check balance: balance"
