@echo off
REM Build Soroban Smart Contract for Windows
REM This script builds the EduPass token contract for deployment

echo Building EduPass Soroban Smart Contract...

REM Navigate to contracts directory
cd /d "%~dp0..\contracts\edupass-token"

REM Build the contract
echo Compiling smart contract...
cargo build --target wasm32-unknown-unknown --release

if %errorlevel% neq 0 (
    echo Error: Contract compilation failed
    exit /b %errorlevel%
)

REM Optimize the WASM binary
echo Optimizing WASM binary...
stellar contract optimize ^
  --wasm target\wasm32-unknown-unknown\release\edupass_token.wasm ^
  --wasm-out target\wasm32-unknown-unknown\release\edupass_token_optimized.wasm

if %errorlevel% neq 0 (
    echo Error: WASM optimization failed
    exit /b %errorlevel%
)

echo Contract built successfully!
echo Optimized WASM: target\wasm32-unknown-unknown\release\edupass_token_optimized.wasm
