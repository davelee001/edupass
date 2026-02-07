@echo off
REM Deploy the EduPass Soroban Smart Contract to Stellar Network

setlocal enabledelayedexpansion

REM Configuration
if "%NETWORK%"=="" set NETWORK=testnet
set WASM_PATH=.\contracts\target\wasm32-unknown-unknown\release\edupass_token.wasm

echo Deploying EduPass Soroban Contract to %NETWORK%...

REM Check if WASM file exists
if not exist "%WASM_PATH%" (
    echo Error: WASM file not found at %WASM_PATH%
    echo Please run scripts\soroban-build.bat first
    exit /b 1
)

REM Check if soroban CLI is installed
where soroban >nul 2>nul
if errorlevel 1 (
    echo Error: Soroban CLI not found
    echo Install it with: cargo install --locked soroban-cli
    exit /b 1
)

REM Deploy the contract
echo Deploying contract...
for /f "delims=" %%i in ('soroban contract deploy --wasm "%WASM_PATH%" --source-account default --network %NETWORK%') do set CONTRACT_ID=%%i

echo.
echo Contract deployed successfully!
echo ================================================
echo Contract ID: %CONTRACT_ID%
echo ================================================
echo.
echo Next steps:
echo 1. Add this to your backend\.env file:
echo    SOROBAN_CONTRACT_ID=%CONTRACT_ID%
echo.
echo 2. Initialize the contract with an admin address
echo    See scripts\soroban-initialize.bat

endlocal
