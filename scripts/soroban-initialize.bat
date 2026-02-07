@echo off
REM Initialize the deployed EduPass Soroban Contract

setlocal enabledelayedexpansion

REM Configuration
if "%NETWORK%"=="" set NETWORK=testnet

REM Read CONTRACT_ID from .env if not set
if "%CONTRACT_ID%"=="" (
    if exist ".\backend\.env" (
        for /f "tokens=2 delims==" %%a in ('findstr /C:"SOROBAN_CONTRACT_ID" .\backend\.env') do set CONTRACT_ID=%%a
    )
)

echo Initializing EduPass Soroban Contract...

REM Validate inputs
if "%CONTRACT_ID%"=="" (
    echo Error: CONTRACT_ID not set
    echo Set it with: set CONTRACT_ID=YOUR_CONTRACT_ID
    echo Or add SOROBAN_CONTRACT_ID to backend\.env
    exit /b 1
)

if "%ADMIN_ADDRESS%"=="" (
    echo Error: ADMIN_ADDRESS not set
    echo Set it with: set ADMIN_ADDRESS=YOUR_STELLAR_ADDRESS
    exit /b 1
)

REM Check if soroban CLI is installed
where soroban >nul 2>nul
if errorlevel 1 (
    echo Error: Soroban CLI not found
    echo Install it with: cargo install --locked soroban-cli
    exit /b 1
)

REM Initialize the contract
echo Contract ID: %CONTRACT_ID%
echo Admin Address: %ADMIN_ADDRESS%
echo Network: %NETWORK%
echo.
echo Initializing contract...

soroban contract invoke ^
  --id "%CONTRACT_ID%" ^
  --source-account default ^
  --network %NETWORK% ^
  -- initialize ^
  --admin %ADMIN_ADDRESS%

echo.
echo Contract initialized successfully!
echo.
echo You can now use the contract to issue, transfer, and burn credits

endlocal
