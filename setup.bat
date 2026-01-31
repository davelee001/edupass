@echo off
echo ============================================
echo     EduPass Setup Script for Windows
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed.
    pause
    exit /b 1
)

echo [OK] npm found
npm --version

REM Check PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] PostgreSQL not found.
    echo Please install PostgreSQL 14+ from https://www.postgresql.org/download/windows/
) else (
    echo [OK] PostgreSQL found
)

echo.
echo Installing dependencies...
echo.

REM Install root dependencies
echo Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================
echo     Installation Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Set up PostgreSQL database:
echo    psql -U postgres
echo    CREATE DATABASE edupass;
echo.
echo 2. Configure backend environment:
echo    cd backend
echo    copy .env.example .env
echo    notepad .env
echo.
echo 3. Create Stellar issuer account:
echo    Visit: https://laboratory.stellar.org/#account-creator?network=test
echo.
echo 4. Start development servers:
echo    npm run dev
echo.
echo Documentation:
echo    - docs\API_REFERENCE.md
echo    - docs\ARCHITECTURE.md
echo    - docs\STELLAR_GUIDE.md
echo    - docs\DEPLOYMENT.md
echo.
pause
