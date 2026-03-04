# EduPass - Quick Start Guide

Get EduPass up and running in under 10 minutes!

## 🚀 Quick Start (Docker - Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Git installed
- 5 minutes of your time

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd EduPass

# Copy environment file
cp .env.production.example .env

# Edit .env with a text editor
nano .env  # or use your preferred editor
```

### Step 2: Configure Minimum Required Variables

Edit `.env` and set these essentials:

```bash
# Generate a strong secret: openssl rand -base64 32
JWT_SECRET=your_generated_secret_here

# Database password (change from default)
DB_PASSWORD=your_secure_password

# For testing, use testnet
STELLAR_NETWORK=testnet

# These will be generated in next steps - leave blank for now
ISSUER_PUBLIC_KEY=
ISSUER_SECRET_KEY=
SOROBAN_CONTRACT_ID=
```

### Step 3: Start the Application

```bash
# Build and start all services
npm run docker:build
npm run docker:up

# Wait ~30 seconds for services to initialize
# Watch the logs
npm run docker:logs
```

### Step 4: Verify It's Running

Open your browser:
- Frontend: http://localhost
- Backend API: http://localhost:3000/health

You should see the EduPass login page!

### Step 5: Setup Stellar Accounts (Optional but Recommended)

```bash
# Install Stellar SDK globally (one-time)
npm install -g @stellar/stellar-sdk

# Create an issuer account
node scripts/create-issuer.js

# Copy the generated keys to your .env file
# Then restart: npm run docker:restart
```

### Step 6: Register Your First User

1. Open http://localhost
2. Click "Register"
3. Create an issuer account to start issuing credits

## 🛠️ Alternative: Local Development Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git installed

### Quick Commands

```bash
# Clone repository
git clone <your-repo-url>
cd EduPass

# Install all dependencies
npm run install:all

# Setup PostgreSQL database
createdb edupass
psql edupass < scripts/setup-database.sql
psql edupass < scripts/phase1-migration.sql
psql edupass < scripts/phase2-migration.sql
psql edupass < scripts/phase3-migration.sql

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env with your PostgreSQL credentials
nano backend/.env

# Start development servers
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📱 First Steps After Installation

### 1. Register Accounts

Register three types of accounts to test the full workflow:

1. **Issuer Account** (NGO/Authority)
   - Role: issuer
   - Can issue credits to beneficiaries

2. **Beneficiary Account** (Student)
   - Role: beneficiary
   - Receives credits, transfers to schools

3. **School Account** (Institution)
   - Role: school
   - Receives payments, redeems credits

### 2. Issue Your First Credits

As an issuer:
1. Login to your issuer account
2. Navigate to "Issue Credits"
3. Select a beneficiary
4. Enter amount and description
5. Submit transaction

### 3. Make a Payment

As a beneficiary:
1. Login to your beneficiary account
2. Check your balance (should show issued credits)
3. Navigate to "Pay School"
4. Select a school and enter amount
5. Submit payment

### 4. Redeem Credits

As a school:
1. Login to your school account
2. View pending transactions
3. Accept payment from beneficiary
4. Redeem credits for cash settlement

## 🔧 Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
npm run docker:logs

# Rebuild containers
npm run docker:clean
npm run docker:build
npm run docker:up
```

**Database connection failed:**
```bash
# Check if database is running
docker-compose ps

# Restart database
docker-compose restart database
```

### Local Development Issues

**"Cannot connect to database":**
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `backend/.env`
- Ensure database exists: `psql -l`

**"Port already in use":**
```bash
# Backend (port 3000)
lsof -ti:3000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3000   # Windows

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9  # Mac/Linux
```

**Frontend can't reach backend:**
- Check `VITE_API_URL` in `frontend/.env`
- Verify backend is running: `curl http://localhost:3000/health`

## 📚 Next Steps

- **Read the Documentation**
  - [Architecture Overview](./docs/ARCHITECTURE.md)
  - [API Reference](./docs/API_REFERENCE.md)
  - [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)

- **Setup Smart Contracts**
  - [Soroban Integration Guide](./docs/SOROBAN_INTEGRATION.md)
  - [Contract Deployment](./docs/SOROBAN_QUICKSTART.md)

- **Explore Features**
  - [Phase 1 Features](./docs/PHASE1_FEATURES.md)
  - [Phase 2 Features](./docs/PHASE2_FEATURES.md)
  - [Phase 3 Features](./docs/PHASE3_FEATURES.md)
  - [QR Code Guide](./docs/QR_CODE_GUIDE.md)

## 🆘 Getting Help

- **Documentation Issues**: Check the `/docs` folder
- **Bug Reports**: Open an issue on GitHub
- **Questions**: Check existing issues or open a new one

## 🎯 Development Workflow

```bash
# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Docker development
npm run docker:up    # Start
npm run docker:logs  # View logs
npm run docker:down  # Stop
```

## 🔐 Security Notes for Production

Before deploying to production:

1. ✅ Change all default passwords
2. ✅ Generate strong JWT secret (32+ chars)
3. ✅ Use SSL/TLS certificates (HTTPS)
4. ✅ Secure Stellar secret keys
5. ✅ Enable firewall rules
6. ✅ Setup regular backups
7. ✅ Configure monitoring

See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for full details.

## 🎉 Success!

You now have EduPass running! Start exploring the platform and issuing education credits.

**Pro Tips:**
- Use testnet for development and testing
- Switch to mainnet only when fully tested
- Keep your Stellar secret keys secure
- Regular backups are essential
- Monitor transaction costs on mainnet

---

**Need more help?** Check the [full documentation](./docs/) or open an issue!
