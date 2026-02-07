@echo off
REM Test Soroban Smart Contract for Windows
REM Runs all unit tests for the EduPass token contract

echo Testing EduPass Soroban Smart Contract...

REM Navigate to contracts directory
cd /d "%~dp0..\contracts\edupass-token"

REM Run tests
echo Running contract tests...
cargo test --release

if %errorlevel% neq 0 (
    echo Error: Tests failed
    exit /b %errorlevel%
)

echo.
echo All tests passed!
