# EduPass API Reference

## Base URL
```
http://localhost:3000/api
```

All endpoints require authentication (except `/auth/register` and `/auth/login`) via Bearer token in the Authorization header.

## Authentication

### Register
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "beneficiary",  // "issuer", "beneficiary", or "school"
  "organization": "Optional Organization Name"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "beneficiary",
    "stellarPublicKey": "GXXXXXX...",
    "organization": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Get Profile
```http
GET /auth/profile
Authorization: Bearer {token}
```

## Issuer Endpoints

### Issue Credits
```http
POST /issuer/issue
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "beneficiaryId": 2,
  "amount": 1000.00,
  "purpose": "School Fees",
  "academicYear": "2024",
  "expiresAt": "2025-12-31T00:00:00Z"  // optional
}
```

### Get Beneficiaries
```http
GET /issuer/beneficiaries
Authorization: Bearer {token}
```

### Get Statistics
```http
GET /issuer/stats
Authorization: Bearer {token}
```

## Beneficiary Endpoints

### Get Balance
```http
GET /beneficiary/balance
Authorization: Bearer {token}
```

### Transfer to School
```http
POST /beneficiary/transfer
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "schoolId": 3,
  "amount": 500.00,
  "purpose": "School Fees",
  "invoiceNumber": "INV-2024-001"  // optional
}
```

### Get Schools List
```http
GET /beneficiary/schools
Authorization: Bearer {token}
```

### Get Transactions
```http
GET /beneficiary/transactions?limit=50
Authorization: Bearer {token}
```

## School Endpoints

### Get Balance
```http
GET /school/balance
Authorization: Bearer {token}
```

### Redeem Credits
```http
POST /school/redeem
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "transactionId": 5,
  "serviceType": "School Fees",
  "invoiceNumber": "INV-2024-001"  // optional
}
```

### Get Pending Transactions
```http
GET /school/pending
Authorization: Bearer {token}
```

### Get Redemption History
```http
GET /school/redemptions?limit=50
Authorization: Bearer {token}
```

### Get Statistics
```http
GET /school/stats
Authorization: Bearer {token}
```

## Transaction Endpoints

### Get All Transactions
```http
GET /transactions?limit=50&type=issue
Authorization: Bearer {token}
```

Query parameters:
- `limit`: Number of transactions (default: 50)
- `type`: Filter by type (`issue`, `transfer`, `redeem`, `burn`)

### Get Transaction Details
```http
GET /transactions/:id
Authorization: Bearer {token}
```

### Get Stellar Blockchain History
```http
GET /transactions/stellar/history?limit=10
Authorization: Bearer {token}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**
```json
{
  "error": "Validation failed",
  "errors": [...]
}
```

**401 Unauthorized**
```json
{
  "error": "Access token required"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "This endpoint requires issuer role"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```
