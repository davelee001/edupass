# EduPass - Stellar Education Credits

A blockchain-based education credits system built on Stellar network. EduPass represents real utility for education funding with no speculation or DeFi complexity.

## What is EduPass?

EduPass is a Stellar-issued asset that represents education credits for:
- 🎓 School fees
- 📚 Tuition support
- 🏫 Training programs
- 📝 Exam fees

## How It Works

1. **Issued** by an authority (NGO / institution)
2. **Transferred** to beneficiaries (students)
3. **Redeemed** by schools/educational institutions
4. **Burned** after use to prevent reuse

## Key Features

- ✅ Real utility - no hype, no DeFi nonsense
- ✅ Transparent on Stellar blockchain
- ✅ Immutable transaction history
- ✅ Low transaction costs
- ✅ Fast settlement (3-5 seconds)
- ✅ Role-based access control

## Project Structure

```
edupass/
├── backend/          # Node.js/Express API server
├── frontend/         # React dashboard application
├── stellar/          # Stellar integration and scripts
├── docs/            # Documentation
└── scripts/         # Deployment and utility scripts
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Stellar testnet account (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/davelee001/edupass.git
cd edupass

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Running the Application

```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

Visit `http://localhost:5173` for the frontend and `http://localhost:3000` for the API.

## User Roles

### Issuer (Authority/NGO)
- Issue new education credits
- Manage beneficiaries
- Track credit distribution
- Generate reports

### Beneficiary (Student)
- View credit balance
- Transfer credits to schools
- View transaction history
- Download proof of funding

### School/Institution
- Accept credit transfers
- Redeem credits for payment
- Burn used credits
- Track redemptions

## Technology Stack

- **Blockchain**: Stellar Network
- **Backend**: Node.js, Express, Stellar SDK
- **Frontend**: React, Vite, TailwindCSS
- **Database**: PostgreSQL
- **Authentication**: JWT

## Documentation

- [API Reference](docs/API_REFERENCE.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Stellar Integration Guide](docs/STELLAR_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on GitHub.

---

**No hype. No DeFi nonsense. Just real utility.**
