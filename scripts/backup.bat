@echo off
REM EduPass Backup Script (Windows)
REM Creates backups of database and important configuration files

setlocal enabledelayedexpansion

REM Configuration
if "%BACKUP_DIR%"=="" set BACKUP_DIR=.\backups
set DATE=%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%
if "%DB_NAME%"=="" set DB_NAME=edupass
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ================================================
echo   EduPass Backup - %DATE%
echo ================================================
echo.

REM Backup database
echo Backing up database...
set BACKUP_FILE=%BACKUP_DIR%\edupass_db_%DATE%.sql

pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Database backup created: %BACKUP_FILE%
    
    REM Compress the backup (requires 7-Zip or similar)
    if exist "C:\Program Files\7-Zip\7z.exe" (
        "C:\Program Files\7-Zip\7z.exe" a -tgzip "%BACKUP_FILE%.gz" "%BACKUP_FILE%" >nul
        del "%BACKUP_FILE%"
        echo [OK] Compressed: %BACKUP_FILE%.gz
    )
) else (
    echo [FAILED] Database backup failed!
    exit /b 1
)

echo.
echo ================================================
echo [OK] Backup completed successfully!
echo ================================================

REM List backups
echo.
echo Current backups:
dir /b "%BACKUP_DIR%"

pause
