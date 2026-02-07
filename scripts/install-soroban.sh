#!/bin/bash

# Install Soroban CLI and dependencies
# This script installs everything needed to build and deploy Soroban smart contracts

set -e

echo "🌟 Installing Soroban Development Tools..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Rust not found. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust already installed"
fi

# Add wasm32 target
echo "🎯 Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# Install Stellar CLI (includes Soroban)
if ! command -v stellar &> /dev/null; then
    echo "⭐ Installing Stellar CLI..."
    cargo install --locked stellar-cli --features opt
else
    echo "✅ Stellar CLI already installed"
    echo "   Version: $(stellar version)"
fi

# Verify installation
echo ""
echo "🔍 Verifying installation..."
echo "   Rust version: $(rustc --version)"
echo "   Cargo version: $(cargo --version)"
echo "   Stellar CLI version: $(stellar version)"

echo ""
echo "✅ Soroban development tools installed successfully!"
echo ""
echo "📚 Next steps:"
echo "1. Configure Stellar CLI for testnet:"
echo "   stellar network add --global testnet \\"
echo "     --rpc-url https://soroban-testnet.stellar.org:443 \\"
echo "     --network-passphrase 'Test SDF Network ; September 2015'"
echo ""
echo "2. Create an identity (if you don't have one):"
echo "   stellar keys generate --global admin --network testnet"
echo ""
echo "3. Fund your account:"
echo "   stellar keys address admin | xargs -I {} curl -X POST \"https://friendbot.stellar.org?addr={}\""
echo ""
echo "4. Build the contract:"
echo "   cd scripts && ./build-contract.sh"
echo ""
echo "5. Deploy the contract:"
echo "   export ISSUER_SECRET_KEY=\$(stellar keys show admin)"
echo "   ./deploy-contract.sh"
