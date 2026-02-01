@echo off
REM EduPass PostgreSQL Database Setup Script for Windows

echo =====================================
echo EduPass Database Setup
echo =====================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL is not installed or not in PATH!
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.

REM Prompt for database credentials
set /p DB_USER="Enter PostgreSQL username (default: postgres): " || set DB_USER=postgres
set /p DB_NAME="Enter database name (default: edupass): " || set DB_NAME=edupass

echo.
echo Creating database '%DB_NAME%'...
echo.

REM Create the database
psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Database '%DB_NAME%' created successfully!
    echo.
    echo Running setup script...
    psql -U %DB_USER% -d %DB_NAME% -f "%~dp0setup-database.sql"
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✓ Database setup completed successfully!
        echo.
    ) else (
        echo.
        echo ✗ Error running setup script
        echo.
    )
) else (
    echo.
    echo ℹ Database might already exist or there was an error
    echo Trying to run setup script anyway...
    psql -U %DB_USER% -d %DB_NAME% -f "%~dp0setup-database.sql"
)

echo.
echo =====================================
echo Next Steps:
echo =====================================
echo 1. Copy .env.example to .env in backend folder
echo 2. Update database credentials in .env file
echo 3. Run 'npm run dev' from backend folder
echo.
echo The application will create tables automatically on first run.
echo =====================================

pause
