# QR Code Integration Guide

EduPass now supports QR codes for seamless blockchain transactions! This feature makes it easy for students to receive credits and schools to generate payment requests.

## 🎯 Features

### For Students (Beneficiaries)
- **📥 Receive QR Code** - Display your public key as a scannable QR code
- **📷 Scan Payment Requests** - Scan school-generated payment requests and auto-fill payment forms
- **💾 Download QR** - Save your receive QR as an image
- **📋 Copy Data** - One-click copy of Stellar payment URI

### For Schools
- **💰 Payment Request QR** - Generate QR codes with amount and purpose
- **🏫 School Account QR** - Share your school's public key
- **📷 Scan Student QR** - Scan student public keys for manual transfers
- **📄 Transaction Receipts** - QR codes linking to Stellar explorer

## 📱 Use Cases

### 1. Student Receives Credits

**Scenario**: A student needs to receive education credits from an issuer or donor.

**Steps**:
1. Student logs into EduPass dashboard
2. Clicks "Show My QR Code" button
3. QR code displays with their Stellar public key
4. Issuer scans the QR and sends credits
5. Student receives credits instantly

**Technical Details**:
- Uses Stellar SEP-0007 URI scheme
- Format: `web+stellar:pay?destination=GXXX...&asset_code=EDUPASS&asset_issuer=GXXX...`
- Compatible with Stellar wallets

### 2. School Generates Payment Request

**Scenario**: A school wants a student to pay specific fees.

**Steps**:
1. School logs into dashboard
2. Clicks "Create Payment Request"
3. Enters amount (e.g., 500 EDUPASS) and purpose (e.g., "Semester Tuition")
4. QR code generates with payment details
5. Student scans QR with their mobile device
6. Payment form auto-fills with scanned data
7. Student reviews and confirms payment

**Benefits**:
- Eliminates manual data entry
- Reduces payment errors
- Faster checkout process

### 3. Transaction Verification

**Scenario**: Verify a completed transaction on the blockchain.

**Steps**:
1. After successful payment, generate transaction receipt QR
2. QR links to Stellar Explorer
3. Anyone can scan to view transaction details on-chain
4. Provides proof of payment

## 🔧 Implementation

### QR Code Components

#### ReceiveQRCode
Display a QR code for receiving credits:

```jsx
import { ReceiveQRCode } from '../components/QRCode';

<ReceiveQRCode
  publicKey="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  assetCode="EDUPASS"
  assetIssuer="GISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  studentName="Alice Johnson"
/>
```

#### PaymentRequestQRCode
Generate a payment request QR:

```jsx
import { PaymentRequestQRCode } from '../components/QRCode';

<PaymentRequestQRCode
  destination="GSCHOOLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  amount="500"
  memo="Semester 1 Tuition"
  assetCode="EDUPASS"
  assetIssuer="GISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  schoolName="Springfield University"
/>
```

#### TransactionQRCode
Show transaction receipt QR:

```jsx
import { TransactionQRCode } from '../components/QRCode';

<TransactionQRCode
  transactionHash="abc123..."
  network="testnet"
  amount="500 EDUPASS"
  purpose="Tuition Payment"
/>
```

#### AccountQRCode
Share account with metadata:

```jsx
import { AccountQRCode } from '../components/QRCode';

<AccountQRCode
  publicKey="GXXXXXXXXXXXXX..."
  name="Alice Johnson"
  role="Student"
  email="alice@university.edu"
/>
```

### QR Scanner

#### QuickScanButton
One-click scanner button:

```jsx
import { QuickScanButton } from '../components/QRScanner';

<QuickScanButton
  onScan={(parsed, raw) => {
    console.log('Scanned:', parsed);
    // Auto-fill form with parsed data
  }}
  onError={(err) => console.error('Scan error:', err)}
  buttonText="📷 Scan QR"
  className="btn-secondary"
/>
```

#### QRScannerModal
Full-screen scanner modal:

```jsx
import { QRScannerModal } from '../components/QRScanner';

const [showScanner, setShowScanner] = useState(false);

<QRScannerModal
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={(parsed, raw) => {
    // Handle scanned data
  }}
  onError={(err) => console.error(err)}
/>
```

### Utility Functions

```javascript
import {
  generateReceiveQRData,
  generatePaymentQRData,
  generateTransactionQRData,
  generateAccountQRData,
  parseQRData,
  isValidPublicKey,
  formatQRAmount,
  generateQRFilename
} from '../utils/qrCodeUtils';

// Generate receive QR data
const receiveData = generateReceiveQRData(
  'GXXX...',
  'EDUPASS',
  'GISSUER...'
);

// Generate payment request
const paymentData = generatePaymentQRData({
  destination: 'GXXX...',
  amount: '500',
  memo: 'Tuition fees',
  assetCode: 'EDUPASS',
  assetIssuer: 'GISSUER...'
});

// Parse scanned QR
const parsed = parseQRData(scannedText);
console.log(parsed.type); // 'stellar-uri', 'public-key', 'json', etc.
```

## 📊 QR Data Formats

### 1. Stellar URI (SEP-0007)
```
web+stellar:pay?destination=GXXX...&amount=500&memo=Tuition
```

### 2. Plain Public Key
```
GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. JSON with Metadata
```json
{
  "publicKey": "GXXX...",
  "name": "Alice Johnson",
  "role": "Student",
  "email": "alice@university.edu",
  "type": "edupass-account"
}
```

### 4. Transaction URL
```
https://stellar.expert/explorer/testnet/tx/abc123...
```

## 🎨 UI Integration

### Student Dashboard

```jsx
import { ReceiveQRCode, QRCodeModal } from '../components/QRCode';
import { QuickScanButton } from '../components/QRScanner';

const [showQR, setShowQR] = useState(false);

// Show Receive QR button
<button onClick={() => setShowQR(true)}>
  📱 Show My QR Code
</button>

// Scan Payment Request button
<QuickScanButton
  onScan={(parsed) => {
    // Auto-fill payment form
    if (parsed.type === 'stellar-uri') {
      setPaymentForm({
        destination: parsed.destination,
        amount: parsed.amount,
        memo: parsed.memo
      });
    }
  }}
  buttonText="📷 Scan Payment Request"
/>

// QR Modal
<QRCodeModal isOpen={showQR} onClose={() => setShowQR(false)}>
  <ReceiveQRCode
    publicKey={user.stellarPublicKey}
    assetCode="EDUPASS"
    studentName={user.name}
  />
</QRCodeModal>
```

### School Dashboard

```jsx
import { PaymentRequestQRCode, QRCodeModal } from '../components/QRCode';

const [showPaymentQR, setShowPaymentQR] = useState(false);
const [paymentData, setPaymentData] = useState({
  amount: '',
  memo: ''
});

// Create Payment Request button
<button onClick={() => setShowPaymentQR(true)}>
  💰 Create Payment QR
</button>

// Payment QR Modal
<QRCodeModal isOpen={showPaymentQR} onClose={() => setShowPaymentQR(false)}>
  <div>
    <h3>Payment Request</h3>
    <input
      type="number"
      placeholder="Amount"
      value={paymentData.amount}
      onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
    />
    <input
      type="text"
      placeholder="Purpose"
      value={paymentData.memo}
      onChange={(e) => setPaymentData({...paymentData, memo: e.target.value})}
    />
    {paymentData.amount && (
      <PaymentRequestQRCode
        destination={school.publicKey}
        amount={paymentData.amount}
        memo={paymentData.memo}
        schoolName={school.name}
      />
    )}
  </div>
</QRCodeModal>
```

## 📦 Dependencies

```json
{
  "dependencies": {
    "qrcode.react": "^3.1.0",
    "html5-qrcode": "^2.3.8"
  }
}
```

## 🔒 Security Considerations

### QR Code Generation
- ✅ **Validate Input**: Always validate amounts and public keys before generating QR
- ✅ **Use HTTPS**: Ensure QR generation happens over secure connection
- ✅ **Metadata Privacy**: Only include necessary information in QR codes
- ❌ **No Secrets**: Never include private keys or sensitive data in QR codes

### QR Code Scanning
- ✅ **Parse Validation**: Always validate scanned data before using
- ✅ **User Confirmation**: Show parsed data to user before executing transactions
- ✅ **Amount Limits**: Implement maximum transaction amounts
- ✅ **Network Check**: Verify network (testnet vs public) matches expectations

### Best Practices
```javascript
// ✅ Good: Validate before use
const parsed = parseQRData(scannedText);
if (parsed.type === 'stellar-uri' && isValidPublicKey(parsed.destination)) {
  // Show confirmation dialog
  if (confirm(`Send ${parsed.amount} to ${parsed.destination.substring(0, 12)}...?`)) {
    executePayment(parsed);
  }
}

// ❌ Bad: Execute without validation
const parsed = parseQRData(scannedText);
executePayment(parsed); // Dangerous!
```

## 🧪 Testing

### Test QR Generation
```javascript
// Generate test QR
const testQR = generateReceiveQRData(
  'GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
  'EDUPASS',
  'GISSUER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'
);
console.log(testQR);
// Output: web+stellar:pay?destination=GTEST...&asset_code=EDUPASS&asset_issuer=GISSUER...
```

### Test QR Parsing
```javascript
// Test parsing different formats
const uri = 'web+stellar:pay?destination=GXXX...&amount=100';
const key = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const json = '{"publicKey":"GXXX...","name":"Alice","type":"edupass-account"}';

console.log(parseQRData(uri));  // { type: 'stellar-uri', ... }
console.log(parseQRData(key));  // { type: 'public-key', ... }
console.log(parseQRData(json)); // { type: 'edupass-account', ... }
```

## 📱 Mobile Optimization

### Camera Permissions
- QR scanner requests camera access on first use
- Graceful fallback if permission denied
- Works on iOS Safari, Android Chrome, and desktop cameras

### Responsive Design
- QR codes scale based on screen size
- Touch-friendly buttons for mobile
- Modal overlays work on all screen sizes

### Performance
- QR generation is instant (client-side)
- Scanner runs at 10 FPS for battery efficiency
- Automatic cleanup when component unmounts

## 🔗 Related Documentation

- [Stellar SEP-0007](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md) - Payment URI specification
- [Stellar Explorer](https://stellar.expert) - View transactions on-chain
- [QRCode.react](https://github.com/zpao/qrcode.react) - QR generation library
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) - QR scanning library

## 💡 Tips & Tricks

### 1. Print QR Codes for Events
Generate receive QR codes and print them for donation events:
```javascript
// Generate, download, and print
<button onClick={() => {
  const filename = generateQRFilename('receive', student.publicKey);
  // Download triggered automatically
}}>
  📥 Download for Printing
</button>
```

### 2. Bulk Payment Requests
Generate multiple payment QR codes for different fee types:
```javascript
const feeTypes = [
  { amount: 500, memo: 'Tuition - Semester 1' },
  { amount: 50, memo: 'Lab Fees' },
  { amount: 100, memo: 'Books & Materials' }
];

feeTypes.map(fee => (
  <PaymentRequestQRCode key={fee.memo} {...fee} destination={school.key} />
));
```

### 3. Transaction Receipts
Generate QR receipt after successful payment:
```javascript
// After payment success
const receipt = (
  <TransactionQRCode
    transactionHash={result.transactionHash}
    amount={amount + ' EDUPASS'}
    purpose={purpose}
  />
);
// Email to student or display on screen
```

---

**Version**: 1.0.0  
**Last Updated**: 2024-02-07  
**Status**: ✅ Production Ready
