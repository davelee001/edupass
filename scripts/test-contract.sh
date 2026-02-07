#!/bin/bash

# Test Soroban Smart Contract
# Runs all unit tests for the EduPass token contract

set -e

echo "🧪 Testing EduPass Soroban Smart Contract..."

# Navigate to contracts directory
cd "$(dirname "$0")/../contracts/edupass-token"

# Run tests
echo "🔬 Running contract tests..."
cargo test --release

echo ""
echo "✅ All tests passed!"
