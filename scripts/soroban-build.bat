@echo off
REM Build the EduPass Soroban Smart Contract
REM This script compiles the Rust contract to WASM

echo Building EduPass Soroban Contract...

REM Navigate to the contract directory
cd /d "%~dp0..\contracts"

REM Build the contract using Soroban SDK
echo Compiling contract to WASM...
cargo build --target wasm32-unknown-unknown --release

if errorlevel 1 (
    echo Error: Failed to build contract
    exit /b 1
)

REM Optimize the WASM binary
echo Optimizing WASM binary...
soroban contract optimize --wasm target\wasm32-unknown-unknown\release\edupass_token.wasm

if errorlevel 1 (
    echo Error: Failed to optimize WASM
    exit /b 1
)

echo Contract built successfully!
echo WASM file: target\wasm32-unknown-unknown\release\edupass_token.wasm
echo.
echo Next steps:
echo 1. Deploy the contract: scripts\soroban-deploy.bat
echo 2. Initialize the contract with an admin address
