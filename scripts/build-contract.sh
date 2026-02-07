#!/bin/bash

# Build Soroban Smart Contract
# This script builds the EduPass token contract for deployment

set -e

echo "🔨 Building EduPass Soroban Smart Contract..."

# Navigate to contracts directory
cd "$(dirname "$0")/../contracts/edupass-token"

# Build the contract
echo "📦 Compiling smart contract..."
cargo build --target wasm32-unknown-unknown --release

# Optimize the WASM binary
echo "⚡ Optimizing WASM binary..."
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/edupass_token.wasm \
  --wasm-out target/wasm32-unknown-unknown/release/edupass_token_optimized.wasm

echo "✅ Contract built successfully!"
echo "📄 Optimized WASM: target/wasm32-unknown-unknown/release/edupass_token_optimized.wasm"
