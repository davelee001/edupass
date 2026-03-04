@echo off
REM EduPass Production Health Check Script (Windows)
REM Run this script to verify all services are healthy

echo ================================================
echo   EduPass Production Health Check
echo ================================================
echo.

REM Configuration (update these for your environment)
if "%BACKEND_URL%"=="" set BACKEND_URL=http://localhost:3000
if "%FRONTEND_URL%"=="" set FRONTEND_URL=http://localhost

echo Service Health:
echo ---------------

REM Check Backend API
echo Checking Backend API...
curl -sf "%BACKEND_URL%/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend API
) else (
    echo [FAILED] Backend API
    set /a failed+=1
)

REM Check Frontend
echo Checking Frontend...
curl -sf "%FRONTEND_URL%/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend
) else (
    echo [FAILED] Frontend
    set /a failed+=1
)

REM Check Stellar Network
echo Checking Stellar Network...
set stellar_url=https://horizon-testnet.stellar.org
if "%STELLAR_NETWORK%"=="public" set stellar_url=https://horizon.stellar.org

curl -sf "%stellar_url%/" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Stellar Network
) else (
    echo [FAILED] Stellar Network
    set /a failed+=1
)

echo.
echo Docker Container Status:
echo ------------------------
docker-compose ps

echo.
echo ================================================
if %failed%==0 (
    echo [OK] All checks passed!
    exit /b 0
) else (
    echo [FAILED] %failed% check(s) failed!
    exit /b 1
)
