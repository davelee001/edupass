# EduPass Database Setup Guide

## Prerequisites

- PostgreSQL 12 or higher installed
- PostgreSQL command-line tools (psql) accessible from PATH

## Quick Setup (Windows)

1. **Run the automated setup script:**
   ```bash
   cd scripts
   setup-database.bat
   ```

2. **Configure environment variables:**
   - Copy `backend\.env.example` to `backend\.env`
   - Update the database credentials in `.env`:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=edupass
     DB_USER=postgres
     DB_PASSWORD=your_actual_password
     ```

3. **Start the backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

The application will automatically create all required tables on first run.

## Manual Setup

### 1. Install PostgreSQL

Download and install from: https://www.postgresql.org/download/windows/

During installation, remember your postgres user password.

### 2. Create Database

Open Command Prompt or PowerShell and run:

```bash
psql -U postgres
```

Then in psql:

```sql
CREATE DATABASE edupass;
\c edupass
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 3. Configure Application

Copy environment file:
```bash
copy backend\.env.example backend\.env
```

Edit `backend\.env` with your database credentials.

### 4. Test Connection

```bash
cd backend
npm install
npm run dev
```

## Database Schema

The application uses the following tables:

### users
- Stores user accounts (issuers, beneficiaries, schools)
- Includes Stellar public keys and authentication data

### transactions
- Records all Stellar blockchain transactions
- Tracks credit issuance, transfers, and redemptions

### credit_allocations
- Manages credit allocations to beneficiaries
- Tracks purpose, amount, and expiration

### redemptions
- Records credit redemptions at schools
- Links to transactions and tracks burning status

## Troubleshooting

### PostgreSQL not found
Add PostgreSQL bin directory to PATH:
```
C:\Program Files\PostgreSQL\15\bin
```

### Connection refused
1. Check PostgreSQL service is running:
   - Services → postgresql-x64-15
2. Verify pg_hba.conf allows local connections

### Permission denied
Grant privileges to your database user:
```sql
GRANT ALL PRIVILEGES ON DATABASE edupass TO your_username;
```

## Useful Commands

### Check database exists:
```bash
psql -U postgres -l
```

### Connect to database:
```bash
psql -U postgres -d edupass
```

### List tables:
```sql
\dt
```

### Drop and recreate database:
```bash
psql -U postgres
DROP DATABASE edupass;
CREATE DATABASE edupass;
\q
```

## Next Steps

After database setup:
1. Review [API_REFERENCE.md](../docs/API_REFERENCE.md)
2. Configure Stellar accounts (see [STELLAR_GUIDE.md](../docs/STELLAR_GUIDE.md))
3. Run the backend server
4. Test API endpoints
