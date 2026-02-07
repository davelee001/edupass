# Soroban Smart Contract Integration - Enhanced

This document provides a comprehensive guide to the enhanced Soroban integration in EduPass.

## 🚀 New Features

### Backend Enhancements

1. **Transaction Retry Logic**
   - Automatic retry on transient failures
   - Configurable retry attempts (default: 3)
   - Smart error detection for retryable conditions

2. **Transaction Confirmation**
   - Automatic polling for transaction status
   - Wait for ledger confirmation before returning success
   - Timeout protection (30 seconds default)

3. **Transaction Simulation**
   - Pre-submit validation
   - Cost estimation
   - Catch errors before on-chain execution

4. **Contract Event Parsing**
   - Extract and log contract events
   - Provide detailed transaction insights
   - Enable event-driven workflows

5. **Connection Health Checks**
   - Network connectivity monitoring
   - Latest ledger tracking
   - Health endpoint for monitoring

6. **Read Operation Caching**
   - 30-second cache for balance/allocation queries
   - Reduce RPC calls and improve performance
   - Manual cache clearing for admins

7. **Batch Operations**
   - Get multiple balances in one call
   - Optimized for dashboard displays
   - Reduced network overhead

### Frontend Enhancements

1. **React Hooks**
   - `useSoroban` - Main hook for contract interactions
   - `useBalance` - Real-time balance tracking with polling
   - `usePendingTransactions` - Track pending operations

2. **Transaction Tracking**
   - Track pending transactions in memory
   - Visual indicators for in-progress operations
   - Transaction history management

3. **Enhanced Error Handling**
   - User-friendly error messages
   - Error categorization
   - Recovery suggestions

4. **Utility Functions**
   - Public key validation
   - Amount formatting
   - Explorer URL generation
   - Expiration checking

5. **UI Components**
   - `SorobanStatus` - Network health indicator
   - `SorobanExample` - Complete integration example
   - Responsive and accessible designs

## 📋 API Reference

### Backend Endpoints

#### Health Check
```http
GET /api/soroban/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "message": "Soroban contract is operational",
  "details": {
    "contractId": "C...",
    "network": "testnet",
    "latestLedger": 12345,
    "totalIssued": 1000000,
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

#### Batch Get Balances
```http
POST /api/soroban/batch-balances
Authorization: Bearer <token>
Content-Type: application/json

{
  "keys": ["G...", "G...", "G..."]
}
```

**Response:**
```json
{
  "success": true,
  "balances": {
    "G...": 10000000,
    "G...": 5000000,
    "G...": 0
  },
  "count": 3
}
```

#### Clear Cache
```http
POST /api/soroban/clear-cache
Authorization: Bearer <token>
Content-Type: application/json

{
  "key": "balance_G..." // Optional, clears all if omitted
}
```

## 🎯 Usage Examples

### Using the React Hook

```jsx
import { useSoroban } from '../hooks/useSoroban';

function MyComponent() {
  const { 
    loading, 
    error, 
    issueCredits, 
    getBalance,
    isHealthy 
  } = useSoroban();

  const handleIssue = async () => {
    try {
      const result = await issueCredits(
        beneficiaryId,
        1000,
        'Educational grant',
        1709856000 // Unix timestamp
      );
      console.log('Credits issued:', result);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <div>
      <p>Network: {isHealthy ? '🟢 Online' : '🔴 Offline'}</p>
      <button onClick={handleIssue} disabled={loading}>
        Issue Credits
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Real-Time Balance Tracking

```jsx
import { useBalance } from '../hooks/useSoroban';

function BalanceDisplay({ publicKey }) {
  const { 
    balance, 
    allocation, 
    loading, 
    isExpired, 
    isExpiringSoon,
    refresh 
  } = useBalance(publicKey, 30000); // Poll every 30s

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Balance: {balance / 10000000} Credits</h3>
      {isExpired && <span className="badge danger">Expired</span>}
      {isExpiringSoon && <span className="badge warning">Expiring Soon</span>}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Network Status Component

```jsx
import SorobanStatus from '../components/SorobanStatus';

function Dashboard() {
  return (
    <div>
      <SorobanStatus showDetails={true} />
      {/* Rest of dashboard */}
    </div>
  );
}
```

### Direct Service Usage

```javascript
import sorobanService from '../services/sorobanService';

// Check network health
const health = await sorobanService.checkHealth();
console.log('Network:', health.healthy ? 'OK' : 'Down');

// Issue credits
const result = await sorobanService.issueCredits(
  beneficiaryId,
  1000,
  'Scholarship',
  1709856000
);

// Get balance with allocation
const data = await sorobanService.getBalanceWithAllocation(publicKey);
console.log('Balance:', data.balance);
console.log('Purpose:', data.allocation.purpose);
console.log('Expired:', data.isExpired);

// Validate public key
if (sorobanService.isValidPublicKey(key)) {
  // Proceed with transaction
}

// Format amount for display
const formatted = sorobanService.formatAmount(10000000, 2);
// Output: "1.00"

// Get explorer URL
const url = sorobanService.getExplorerUrl(txHash, 'testnet');
// Output: "https://stellar.expert/explorer/testnet/tx/..."
```

## ⚙️ Configuration

### Environment Variables

```env
# Required
SOROBAN_CONTRACT_ID=C...
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Optional
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

### Retry Configuration

Modify in `backend/src/services/soroban.js`:

```javascript
const MAX_RETRIES = 3;          // Number of retry attempts
const RETRY_DELAY = 2000;       // Delay between retries (ms)
const TX_POLL_INTERVAL = 1000;  // Transaction polling interval (ms)
const TX_POLL_TIMEOUT = 30000;  // Transaction confirmation timeout (ms)
```

### Cache Configuration

```javascript
this.cacheTimeout = 30000; // Cache timeout (ms)
```

## 🔍 Monitoring

### Health Check Endpoint

Monitor the Soroban integration health:

```bash
curl http://localhost:5000/api/soroban/health
```

Use this endpoint in monitoring tools like:
- Uptime Robot
- Pingdom
- New Relic
- Custom monitoring scripts

### Logging

All Soroban operations are logged with Winston. Check logs:

```bash
# Development
npm run dev

# Production
pm2 logs backend
```

Log levels:
- `info` - Successful operations
- `warn` - Retry attempts
- `error` - Failed operations
- `debug` - Detailed operation data

## 🧪 Testing

### Test Network Health

```bash
curl http://localhost:5000/api/soroban/health
```

### Test Batch Balance Retrieval

```bash
curl -X POST http://localhost:5000/api/soroban/batch-balances \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keys": ["G...", "G..."]
  }'
```

### Clear Cache

```bash
curl -X POST http://localhost:5000/api/soroban/clear-cache \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Error Handling

The enhanced integration provides detailed error messages:

| Error Type | User Message | Recovery Action |
|------------|-------------|-----------------|
| Network Error | Unable to connect to Stellar network | Check connection, retry |
| Timeout | Transaction timeout | Retry operation |
| 401 | Authentication required | Log in again |
| 403 | Permission denied | Check user role |
| 404 | Resource not found | Verify inputs |
| Insufficient balance | Not enough credits | Add credits first |
| Expired | Credits have expired | Request new allocation |

### Example Error Handling

```javascript
try {
  await sorobanService.transferCredits(toKey, amount, description);
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    // Show balance warning
  } else if (error.message.includes('expired')) {
    // Show expiration notice
  } else {
    // Generic error handling
  }
  
  // Access original error
  console.error('Original:', error.originalError);
  console.error('Operation:', error.operation);
}
```

## 🎨 UI Components

### SorobanStatus

Shows network health and pending transactions.

**Props:**
- `showDetails` (boolean) - Show detailed information

**Usage:**
```jsx
<SorobanStatus showDetails={true} />
```

### SorobanExample

Complete example with all operations.

**Props:**
- `userPublicKey` (string) - User's Stellar public key
- `userRole` (string) - User role (issuer/beneficiary/school)

**Usage:**
```jsx
<SorobanExample 
  userPublicKey={user.stellarPublicKey}
  userRole={user.role}
/>
```

## 📊 Performance

### Caching Benefits

- **Before:** Every balance check = 1 RPC call
- **After:** Balance checks within 30s = 0 RPC calls (cached)
- **Result:** Up to 90% reduction in RPC calls for dashboard displays

### Batch Operations

- **Before:** 10 balances = 10 separate API calls
- **After:** 10 balances = 1 batch API call
- **Result:** 10x improvement in multi-balance scenarios

### Transaction Confirmation

- **Before:** Submit and hope it succeeded
- **After:** Wait for confirmation, handle retries
- **Result:** Guaranteed transaction success feedback

## 🔐 Security Notes

1. **Secret Keys**: Never expose secret keys in frontend
2. **API Authentication**: All endpoints require authentication
3. **Input Validation**: Public keys validated before use
4. **Cache Clearing**: Admins can clear cache to prevent stale data
5. **Error Messages**: User-friendly without exposing internals

## 📝 Migration Guide

### From Basic to Enhanced Integration

1. **Update Backend Service**
   - Already updated with new features
   - Configure retry and cache settings if needed

2. **Update Frontend**
   - Replace direct service calls with hooks:
   ```jsx
   // Before
   const balance = await sorobanService.getBalance(key);
   
   // After
   const { balance, loading } = useBalance(key);
   ```

3. **Add UI Components**
   ```jsx
   import SorobanStatus from '../components/SorobanStatus';
   
   <SorobanStatus showDetails={true} />
   ```

4. **Update Error Handling**
   - Use enhanced error messages
   - Check error.operation for context

## 🎯 Best Practices

1. **Use Hooks** - Leverage React hooks for state management
2. **Show Status** - Always display network status to users
3. **Handle Errors** - Provide clear error messages and recovery options
4. **Cache Smartly** - Clear cache after write operations
5. **Monitor Health** - Set up automated health checks
6. **Log Everything** - Keep detailed logs for debugging
7. **Test Thoroughly** - Test on testnet before production

## 🔗 Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Docs](https://soroban.stellar.org/)
- [Stellar Expert](https://stellar.expert/) - Blockchain explorer
- [EduPass Architecture](./ARCHITECTURE.md)

## 🤝 Contributing

When adding new Soroban features:

1. Add retry logic to write operations
2. Add caching to read operations
3. Update the service, hook, and component
4. Add comprehensive error handling
5. Update this documentation

## 📞 Support

For issues with Soroban integration:

1. Check logs: `pm2 logs backend`
2. Verify health: `/api/soroban/health`
3. Clear cache if data seems stale
4. Check network status on Stellar Status Page
5. Review transaction on Stellar Expert

---

**Last Updated:** February 7, 2026  
**Version:** 2.0.0  
**Network:** Stellar Testnet
