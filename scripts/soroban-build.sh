#!/bin/bash

# Build the EduPass Soroban Smart Contract
# This script compiles the Rust contract to WASM

set -e

echo "🔨 Building EduPass Soroban Contract..."

# Navigate to the contract directory
cd "$(dirname "$0")/../contracts"

# Build the contract using Soroban SDK
echo "📦 Compiling contract to WASM..."
cargo build --target wasm32-unknown-unknown --release

# Optimize the WASM binary
echo "⚡ Optimizing WASM binary..."
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/edupass_token.wasm

echo "✅ Contract built successfully!"
echo "📄 WASM file: target/wasm32-unknown-unknown/release/edupass_token.wasm"
echo ""
echo "Next steps:"
echo "1. Deploy the contract: ./scripts/soroban-deploy.sh"
echo "2. Initialize the contract with an admin address"
