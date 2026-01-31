# EduPass - Stellar Education Credits

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Stellar](https://img.shields.io/badge/Stellar-Network-blue)](https://stellar.org)

A blockchain-based education credits system built on Stellar network. EduPass represents **real utility** for education funding with no speculation or DeFi complexity.

## 🎓 What is EduPass?

EduPass is a Stellar-issued asset that represents education credits for:
- 💳 **School fees** - Tuition and enrollment costs
- 📚 **Tuition support** - Ongoing educational assistance
- 🏫 **Training programs** - Vocational and skills training
- 📝 **Exam fees** - Certification and testing costs
- 📖 **Books & Materials** - Educational resources

## 🔄 How It Works

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│   Issuer    │  Issue │ Beneficiary  │Transfer│   School    │
│  (NGO/Inst) ├───────>│  (Student)   ├───────>│(Institution)│
└─────────────┘        └──────────────┘        └──────┬──────┘
                                                       │
                                                       │ Redeem
                                                       │ & Burn
                                                       ▼
                                              ✅ Credit Removed
```

1. **Issue**: Authority/NGO issues credits to students
2. **Transfer**: Students pay schools using credits
3. **Redeem**: Schools redeem credits for payment
4. **Burn**: Credits removed from circulation after use

## ✨ Key Features

- ✅ **Real utility** - No hype, no speculation, no DeFi nonsense
- 🔗 **Blockchain transparency** - All transactions on Stellar network
- 📜 **Immutable history** - Complete audit trail
- 💰 **Low cost** - Minimal transaction fees (~$0.00001)
- ⚡ **Fast settlement** - 3-5 seconds confirmation
- 🔐 **Role-based access** - Issuer, Beneficiary, School permissions
- 🌍 **Cross-border ready** - Works globally via Stellar
- 📊 **Built-in reporting** - Transaction analytics and statistics

## 🚀 Quick Start

The fastest way to get started:

### Windows
```powershell
git clone https://github.com/davelee001/edupass.git
cd edupass
.\setup.bat
```

### Linux/Mac
```bash
git clone https://github.com/davelee001/edupass.git
cd edupass
chmod +x setup.sh
./setup.sh
```

Then follow the setup wizard to configure your environment.

## 📦 Project Structure

```
edupass/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── config/            # Database & Stellar config
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Authentication middleware
│   │   └── utils/             # Logger and utilities
│   ├── package.json
│   └── .env.example
├── frontend/                   # React dashboard application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Dashboard pages
│   │   ├── services/          # API service layer
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/                      # Comprehensive documentation
│   ├── API_REFERENCE.md       # API endpoints guide
│   ├── ARCHITECTURE.md        # System architecture
│   ├── STELLAR_GUIDE.md       # Blockchain integration
│   └── DEPLOYMENT.md          # Production deployment
├── scripts/                   # Utility scripts
│   └── create-issuer.js       # Stellar account creator
├── setup.bat                  # Windows setup script
├── setup.sh                   # Linux/Mac setup script
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites

Before you begin, ensure you have:
- **Node.js** 18+ and npm ([Download](https://nodejs.org))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))

### Step 1: Clone Repository

```bash
git clone https://github.com/davelee001/edupass.git
cd edupass
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Or install individually:
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Set Up PostgreSQL Database

**Option A: Using psql**
```bash
psql -U postgres
CREATE DATABASE edupass;
CREATE USER edupass_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE edupass TO edupass_user;
\q
```

**Option B: Using GUI tool (pgAdmin, DBeaver, etc.)**
- Create a new database named `edupass`
- Create a user with appropriate permissions

### Step 4: Configure Environment

**Backend Configuration:**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your settings:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edupass
DB_USER=edupass_user
DB_PASSWORD=your_secure_password

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Stellar Configuration
STELLAR_NETWORK=testnet  # Use 'testnet' for development
ASSET_CODE=EDUPASS
```

**Frontend Configuration:**
```bash
cd frontend
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

### Step 5: Create Stellar Issuer Account

For development on testnet:
```bash
node scripts/create-issuer.js
```

This script will:
1. Generate a new Stellar keypair
2. Fund the account on testnet (using Friendbot)
3. Display your issuer keys

**Copy the generated keys to your `backend/.env` file:**
```env
ISSUER_PUBLIC_KEY=GXXXXXXXXXX...
ISSUER_SECRET_KEY=SXXXXXXXXXX...
```

⚠️ **Important**: Never commit your secret keys to version control!

### Step 6: Start the Application

**Development Mode:**
```bash
# From root directory (runs both backend and frontend)
npm run dev

# Or start individually:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Access the Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health

## 👥 User Roles & Capabilities

### 🏛️ Issuer (Authority/NGO)
Manage education credit distribution:
- ✅ Issue new credits to beneficiaries
- ✅ View all beneficiaries and their balances
- ✅ Track total credits issued
- ✅ Generate issuance reports
- ✅ Monitor credit usage

**Use Case**: Educational NGO issuing scholarships, Government education programs

### 🎓 Beneficiary (Student)
Receive and use education credits:
- ✅ View credit balance in real-time
- ✅ Transfer credits to educational institutions
- ✅ View complete transaction history
- ✅ Get proof of funding
- ✅ Find registered schools

**Use Case**: Students receiving scholarships or education grants

### 🏫 School/Institution
Accept and redeem education credits:
- ✅ Receive credit transfers from students
- ✅ View pending transactions
- ✅ Redeem credits for payment
- ✅ Burn credits after service delivery
- ✅ Track redemption history by service type
- ✅ Generate financial reports

**Use Case**: Schools, universities, training centers, examination boards

## 💻 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Blockchain**: Stellar SDK
- **Authentication**: JWT (JSON Web Tokens)
- **Logging**: Winston
- **Security**: Helmet, bcryptjs, Rate limiting

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Charts**: Recharts (ready to integrate)

### Blockchain
- **Network**: Stellar (Testnet/Public)
- **SDK**: stellar-sdk v11.3.0
- **Asset**: Custom EDUPASS token
- **Operations**: Payment, Trustline, Burning

## 📚 Documentation

Comprehensive guides for developers and users:

- 📖 [**API Reference**](docs/API_REFERENCE.md) - Complete REST API documentation with examples
- 🏗️ [**Architecture Overview**](docs/ARCHITECTURE.md) - System design, data flow, and database schema
- ⭐ [**Stellar Integration Guide**](docs/STELLAR_GUIDE.md) - Blockchain integration details and best practices
- 🚀 [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment on VPS, Docker, Heroku, etc.

## 🧪 Testing

Run the test suite:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# All tests
npm test
```

## 🐛 Troubleshooting

### Backend won't start
- ✅ Check PostgreSQL is running: `pg_isready`
- ✅ Verify database credentials in `.env`
- ✅ Check logs: `backend/logs/error.log`

### Database connection error
- ✅ Ensure PostgreSQL service is running
- ✅ Verify database exists: `psql -U postgres -l`
- ✅ Check user permissions

### Stellar transactions failing
- ✅ Verify network setting (testnet vs public)
- ✅ Check issuer account has XLM balance
- ✅ Ensure trustlines are established
- ✅ View transaction details in Stellar Expert

### Frontend shows API errors
- ✅ Check backend is running on port 3000
- ✅ Verify CORS settings
- ✅ Check browser console for details

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ Free to use for personal and commercial projects
- ✅ Modify and distribute as needed
- ✅ No warranty provided

## 🌟 Project Status

**Current Version**: 1.0.0  
**Status**: Production Ready ✅

### Implemented Features
- ✅ Complete user authentication system
- ✅ Stellar blockchain integration
- ✅ Credit issuance, transfer, and burning
- ✅ Role-based dashboards
- ✅ Transaction history and reporting
- ✅ PostgreSQL database with migrations
- ✅ Comprehensive API documentation
- ✅ Production deployment guides

### Roadmap
- 🔄 Multi-signature support for large issuances
- 🔄 Email/SMS notifications
- 🔄 Advanced analytics dashboard
- 🔄 Mobile application (iOS/Android)
- 🔄 Batch credit issuance
- 🔄 KYC/AML integration
- 🔄 Multi-language support

## 💬 Support & Community

- **Issues**: [GitHub Issues](https://github.com/davelee001/edupass/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davelee001/edupass/discussions)
- **Stellar Community**: [Stellar Discord](https://discord.gg/stellardev)
- **Email**: support@edupass.example.com (coming soon)

## 🙏 Acknowledgments

- [Stellar Development Foundation](https://stellar.org) for the blockchain platform
- All contributors who help improve EduPass
- Educational institutions testing and providing feedback

## 📊 Stats

- **Total Commits**: 37+
- **Files**: 40+
- **Lines of Code**: 5000+
- **Documentation Pages**: 4
- **Supported Roles**: 3

---

**No hype. No DeFi nonsense. Just real utility.**
