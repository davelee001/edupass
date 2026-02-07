@echo off
REM Deploy Soroban Smart Contract to Stellar Testnet for Windows
REM This script builds and deploys the EduPass token contract

setlocal enabledelayedexpansion

REM Configuration
set NETWORK=testnet
set ADMIN_SECRET=%ISSUER_SECRET_KEY%

if "%ADMIN_SECRET%"=="" (
    echo Error: ISSUER_SECRET_KEY environment variable not set
    echo Please set it first: set ISSUER_SECRET_KEY=your_secret_key
    exit /b 1
)

echo Deploying EduPass Smart Contract to Stellar %NETWORK%...

REM Build the contract first
echo Building contract...
call "%~dp0build-contract.bat"

if %errorlevel% neq 0 (
    echo Error: Contract build failed
    exit /b %errorlevel%
)

REM Navigate to contracts directory
cd /d "%~dp0..\contracts\edupass-token"

REM Deploy the contract
echo Deploying to %NETWORK%...
for /f "delims=" %%i in ('stellar contract deploy --wasm target\wasm32-unknown-unknown\release\edupass_token_optimized.wasm --source "%ADMIN_SECRET%" --network "%NETWORK%"') do set CONTRACT_ID=%%i

if %errorlevel% neq 0 (
    echo Error: Contract deployment failed
    exit /b %errorlevel%
)

echo.
echo Contract deployed successfully!
echo Contract ID: %CONTRACT_ID%
echo.
echo Next steps:
echo 1. Add this to your backend\.env file:
echo    SOROBAN_CONTRACT_ID=%CONTRACT_ID%
echo.

REM Save contract ID to a file
echo %CONTRACT_ID% > contract-id.txt
echo Contract ID saved to: contracts\edupass-token\contract-id.txt
