@echo off
REM Install Soroban CLI and dependencies for Windows
REM This script installs everything needed to build and deploy Soroban smart contracts

echo Installing Soroban Development Tools...

REM Check if Rust is installed
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo Rust not found. Please install Rust first from:
    echo https://rustup.rs/
    echo.
    echo After installing Rust, run this script again.
    pause
    exit /b 1
) else (
    echo Rust already installed
)

REM Add wasm32 target
echo Adding wasm32-unknown-unknown target...
rustup target add wasm32-unknown-unknown

if %errorlevel% neq 0 (
    echo Error: Failed to add wasm32 target
    exit /b %errorlevel%
)

REM Install Stellar CLI (includes Soroban)
where stellar >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Stellar CLI...
    cargo install --locked stellar-cli --features opt
    
    if %errorlevel% neq 0 (
        echo Error: Failed to install Stellar CLI
        exit /b %errorlevel%
    )
) else (
    echo Stellar CLI already installed
    stellar version
)

REM Verify installation
echo.
echo Verifying installation...
rustc --version
cargo --version
stellar version

echo.
echo Soroban development tools installed successfully!
echo.
echo Next steps:
echo 1. Configure Stellar CLI for testnet:
echo    stellar network add --global testnet ^
echo      --rpc-url https://soroban-testnet.stellar.org:443 ^
echo      --network-passphrase "Test SDF Network ; September 2015"
echo.
echo 2. Create an identity (if you don't have one):
echo    stellar keys generate --global admin --network testnet
echo.
echo 3. Fund your account using Stellar Friendbot
echo.
echo 4. Build the contract:
echo    cd scripts
echo    build-contract.bat
echo.
echo 5. Deploy the contract:
echo    set ISSUER_SECRET_KEY=(your secret key)
echo    deploy-contract.bat
echo.
pause
