# EduPass Architecture

## System Overview

EduPass is a blockchain-based education credits system built on the Stellar network. The system enables:
- **Issuers** (NGOs, institutions) to issue education credits
- **Beneficiaries** (students) to receive and transfer credits
- **Schools** to receive, redeem, and burn credits after service delivery

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Blockchain**: Stellar Network (Testnet/Public)
- **Authentication**: JWT (JSON Web Tokens)
- **Logging**: Winston
- **Security**: Helmet, bcryptjs, rate limiting

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Blockchain
- **Network**: Stellar
- **SDK**: stellar-sdk v11.3.0
- **Asset**: Custom asset (EDUPASS)
- **Operations**: Payment, Change Trust, Account Creation

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (React App)   │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│   Backend API   │
│   (Express.js)  │
└────┬───────┬────┘
     │       │
     │       └──────────┐
     │                  │
┌────▼────────┐   ┌────▼──────────┐
│  PostgreSQL │   │ Stellar Network│
│  Database   │   │  (Blockchain)  │
└─────────────┘   └────────────────┘
```

## Data Flow

### 1. Credit Issuance
```
Issuer → Backend API → Stellar Network → Beneficiary Account
                    ↓
              Database Record
```

### 2. Credit Transfer
```
Beneficiary → Backend API → Stellar Network → School Account
                         ↓
                   Database Record
```

### 3. Credit Redemption & Burn
```
School → Backend API → Stellar Network (Burn) → Issuer Account
                    ↓
              Database Record
```

## Database Schema

### Users Table
```sql
- id (PK)
- email (unique)
- password_hash
- role (issuer/beneficiary/school)
- stellar_public_key (unique)
- stellar_secret_key_encrypted
- name
- organization
- verified
- created_at
- updated_at
```

### Transactions Table
```sql
- id (PK)
- transaction_hash (unique)
- from_user_id (FK)
- to_user_id (FK)
- amount
- transaction_type (issue/transfer/redeem/burn)
- purpose
- memo
- status
- stellar_ledger
- created_at
```

### Credit Allocations Table
```sql
- id (PK)
- beneficiary_id (FK)
- issuer_id (FK)
- amount
- purpose
- academic_year
- expires_at
- status
- created_at
```

### Redemptions Table
```sql
- id (PK)
- school_id (FK)
- beneficiary_id (FK)
- transaction_id (FK)
- amount
- service_type
- invoice_number
- redeemed_at
- burned
- burned_at
```

## Stellar Integration

### Asset Configuration
- **Asset Code**: EDUPASS
- **Issuer Account**: Configured in environment variables
- **Asset Type**: Custom Stellar asset

### Key Operations

#### 1. Account Creation
- Generate Stellar keypair for new users
- Fund account (testnet only via Friendbot)
- Store encrypted secret key

#### 2. Trustline Establishment
- Beneficiaries and schools establish trustline to EDUPASS asset
- Required before receiving credits

#### 3. Credit Issuance
- Issuer sends EDUPASS tokens to beneficiary
- Recorded on Stellar blockchain
- Tracked in local database

#### 4. Credit Transfer
- Beneficiary sends EDUPASS to school
- Stellar payment operation
- Database transaction record

#### 5. Credit Burning
- School returns EDUPASS to issuer
- Removes from circulation
- Marks as burned in database

## Security Considerations

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Token expiration and refresh

### Data Protection
- Password hashing with bcryptjs
- Encrypted storage of Stellar secret keys
- HTTPS in production (recommended)

### Rate Limiting
- API rate limiting to prevent abuse
- Configurable limits per endpoint

### Input Validation
- express-validator for request validation
- Sanitization of user inputs
- SQL injection prevention via parameterized queries

## Scalability

### Horizontal Scaling
- Stateless API design enables multiple instances
- Load balancer distribution
- Session-less authentication (JWT)

### Database Optimization
- Indexed columns for fast queries
- Connection pooling
- Query optimization

### Caching Strategy (Future)
- Redis for session management
- Cache frequently accessed data
- Stellar account balance caching

## Monitoring & Logging

### Application Logs
- Winston logger with multiple transports
- Log levels: error, warn, info, debug
- Separate error logs

### Transaction Monitoring
- All blockchain transactions logged
- Database audit trail
- Failed transaction tracking

## Deployment Architecture

### Development
- Local PostgreSQL
- Stellar testnet
- Local frontend (Vite dev server)
- Local backend (nodemon)

### Production (Recommended)
- Managed PostgreSQL (AWS RDS, DigitalOcean)
- Stellar public network
- Frontend: Static hosting (Vercel, Netlify)
- Backend: Container deployment (Docker, Kubernetes)
- Reverse proxy (Nginx)
- SSL/TLS certificates

## Future Enhancements

1. **Multi-signature Support**: Require multiple approvals for large issuances
2. **Compliance Features**: KYC/AML integration
3. **Reporting Dashboard**: Advanced analytics and charts
4. **Mobile App**: Native iOS/Android applications
5. **Batch Operations**: Issue credits to multiple beneficiaries
6. **Notification System**: Email/SMS notifications for transactions
7. **Audit Logs**: Comprehensive audit trail
8. **API Rate Limiting by Role**: Different limits for different user types
