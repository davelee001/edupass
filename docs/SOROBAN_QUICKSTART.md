# Soroban Integration - Quick Start Guide

## 🎯 Overview

EduPass now includes a fully-enhanced Soroban smart contract integration with automatic retries, transaction confirmation, caching, and comprehensive error handling.

## ✅ What's Included

### Backend
- ✅ Smart contract service with retry logic
- ✅ Transaction simulation and confirmation
- ✅ Contract event parsing
- ✅ Health monitoring endpoint
- ✅ Read operation caching (30s TTL)
- ✅ Batch balance operations
- ✅ 7 REST API endpoints

### Frontend
- ✅ React hooks (`useSoroban`, `useBalance`, `usePendingTransactions`)
- ✅ Transaction tracking
- ✅ Enhanced error handling
- ✅ Utility functions (validation, formatting, etc.)
- ✅ UI components (`SorobanStatus`, `SorobanExample`)

### Smart Contract
- ✅ Rust implementation in `contracts/edupass-token/`
- ✅ Credit issuance, transfer, and burning
- ✅ Balance tracking and metadata
- ✅ Full test suite

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install @stellar/stellar-sdk

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables

Create/update `.env` files:

**Backend (.env):**
```env
# Stellar/Soroban Configuration
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_CONTRACT_ID=your_deployed_contract_id

# Issuer Keys (keep secure!)
ISSUER_PUBLIC_KEY=G...
ISSUER_SECRET_KEY=S...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/edupass

# JWT
JWT_SECRET=your_jwt_secret
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Build & Deploy Smart Contract

```bash
# Windows
.\scripts\build-contract.bat
.\scripts\deploy-contract.bat
.\scripts\soroban-initialize.bat

# Linux/Mac
./scripts/build-contract.sh
./scripts/deploy-contract.sh
./scripts/soroban-initialize.sh
```

Copy the contract ID from deployment output and add to backend `.env`.

### 4. Start Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 5. Verify Installation

**Check Backend Health:**
```bash
curl http://localhost:5000/api/soroban/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "message": "Soroban contract is operational"
}
```

**Check Frontend:**

Navigate to `http://localhost:5173` and you should see the application.

## 📱 Using in Your Components

### Simple Balance Display

```jsx
import { useBalance } from '../hooks/useSoroban';

function MyBalance({ publicKey }) {
  const { balance, loading, isExpired } = useBalance(publicKey);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h3>Balance: {balance / 10000000} Credits</h3>
      {isExpired && <span>⚠️ Expired</span>}
    </div>
  );
}
```

### Issue Credits

```jsx
import { useSoroban } from '../hooks/useSoroban';

function IssueForm() {
  const { issueCredits, loading, error } = useSoroban();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await issueCredits(beneficiaryId, 1000, 'Grant', expiresAt);
      alert('Credits issued!');
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={loading}>Issue</button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

### Network Status

```jsx
import SorobanStatus from '../components/SorobanStatus';

function Dashboard() {
  return (
    <div>
      <SorobanStatus showDetails={true} />
      {/* rest of dashboard */}
    </div>
  );
}
```

## 🎯 Common Operations

### 1. Issue Credits (Issuer Only)

```javascript
const result = await sorobanService.issueCredits(
  beneficiaryId: 123,
  amount: 1000,
  description: 'Educational grant',
  expiresAt: '2026-12-31'
);
```

### 2. Transfer Credits (Beneficiary)

```javascript
const result = await sorobanService.transferCredits(
  toKey: 'G...',
  amount: 500,
  description: 'Transfer to friend'
);
```

### 3. Burn Credits (School)

```javascript
const result = await sorobanService.burnCredits(
  amount: 200,
  schoolId: 456,
  description: 'Tuition payment'
);
```

### 4. Check Balance

```javascript
const balanceData = await sorobanService.getBalance('G...');
```

### 5. Get Allocation Details

```javascript
const allocation = await sorobanService.getAllocation('G...');
// Returns: { purpose, expiration, ... }
```

## 🔧 Configuration

### Adjust Retry Settings

Edit `backend/src/services/soroban.js`:

```javascript
const MAX_RETRIES = 3;          // Retry attempts
const RETRY_DELAY = 2000;       // Delay between retries (ms)
const TX_POLL_TIMEOUT = 30000;  // Transaction timeout (ms)
```

### Adjust Cache Settings

```javascript
this.cacheTimeout = 30000; // Cache duration (ms)
```

### Change Poll Interval for Balance

```jsx
const { balance } = useBalance(publicKey, 60000); // Poll every 60s
```

## 🚨 Troubleshooting

### "Contract not found"
- Ensure `SOROBAN_CONTRACT_ID` is set in backend `.env`
- Verify contract is deployed: check deployment logs
- Test contract manually using Stellar CLI

### "Network timeout"
- Check Stellar network status
- Verify `STELLAR_HORIZON_URL` is correct
- Try increasing `TX_POLL_TIMEOUT`

### "Insufficient balance"
- Fund accounts on testnet: https://laboratory.stellar.org/#account-creator
- Check balance using Stellar Expert
- Verify trustline is established

### "Authentication failed"
- Ensure JWT token is valid
- Check authorization header in requests
- Verify user role matches operation requirements

### Stale balance/data
- Clear cache: `POST /api/soroban/clear-cache`
- Decrease cache timeout
- Manually refresh in UI

## 📊 Monitoring

### Health Check

Add to monitoring service:
```bash
curl http://localhost:5000/api/soroban/health
```

### View Logs

```bash
# Development
npm run dev

# Production
pm2 logs backend
```

### Check Transactions

Use Stellar Expert:
- Testnet: https://stellar.expert/explorer/testnet
- Public: https://stellar.expert/explorer/public

## 🔐 Security Checklist

- [ ] Secret keys stored securely (encrypted in DB)
- [ ] Never expose secret keys in frontend
- [ ] JWT authentication on all endpoints
- [ ] Input validation on all operations
- [ ] Public key format validation
- [ ] Role-based access control
- [ ] HTTPS in production
- [ ] Rate limiting enabled

## 📚 Next Steps

1. **Customize UI** - Update `SorobanExample.jsx` for your needs
2. **Add to Dashboards** - Integrate components into existing pages
3. **Set Up Monitoring** - Configure health check monitoring
4. **Test Thoroughly** - Test all operations on testnet
5. **Deploy Contract** - Deploy to production when ready
6. **Enable Mainnet** - Update network configuration

## 🔗 Additional Resources

- [Enhanced Documentation](./SOROBAN_ENHANCED.md) - Detailed feature docs
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Architecture Guide](./ARCHITECTURE.md) - System architecture
- [Soroban Docs](https://soroban.stellar.org/) - Official Soroban documentation

## 💡 Tips

1. **Use the hooks** - They handle loading/error states automatically
2. **Show network status** - Users should know if network is down
3. **Cache wisely** - Clear cache after write operations
4. **Validate inputs** - Use `isValidPublicKey()` before operations
5. **Format amounts** - Use `formatAmount()` for display
6. **Link to explorer** - Use `getExplorerUrl()` for transparency
7. **Monitor health** - Set up automated checks
8. **Test on testnet** - Always test before production

## 🎉 You're All Set!

Your Soroban integration is now enhanced with:
- ✅ Automatic retries and error recovery
- ✅ Transaction confirmation and tracking
- ✅ Performance optimizations (caching, batching)
- ✅ Comprehensive error handling
- ✅ React hooks and UI components
- ✅ Network health monitoring
- ✅ Production-ready architecture

Happy coding! 🚀

---

**Questions?** Check the [Enhanced Documentation](./SOROBAN_ENHANCED.md) or contact the development team.
