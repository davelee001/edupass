import { useState, useEffect } from 'react';
import { Wallet, Send, History, School as SchoolIcon, QrCode } from 'lucide-react';
import { getBalance, getSchools, transferToSchool, getBeneficiaryTransactions } from '../services/api';
import { ReceiveQRCode, QRCodeModal } from '../components/QRCode';
import { QuickScanButton } from '../components/QRScanner';

function BeneficiaryDashboard({ user }) {
  const [balance, setBalance] = useState(0);
  const [schools, setSchools] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [formData, setFormData] = useState({
    schoolId: '',
    amount: '',
    purpose: 'School Fees',
    invoiceNumber: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceData, schoolsData, transactionsData] = await Promise.all([
        getBalance(),
        getSchools(),
        getBeneficiaryTransactions()
      ]);
      setBalance(balanceData.balance);
      setSchools(schoolsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await transferToSchool({
        schoolId: parseInt(formData.schoolId),
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        invoiceNumber: formData.invoiceNumber || undefined
      });

      setMessage({ type: 'success', text: 'Payment sent successfully!' });
      setFormData({ schoolId: '', amount: '', purpose: 'School Fees', invoiceNumber: '' });
      setShowTransferForm(false);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Transfer failed' });
    }
  };

  const handleQRScan = (parsed, raw) => {
    console.log('Scanned QR:', parsed);
    
    if (parsed.type === 'stellar-uri' && parsed.action === 'pay') {
      // Auto-fill form with scanned payment request
      const school = schools.find(s => s.stellar_public_key === parsed.destination);
      if (school) {
        setFormData({
          schoolId: school.id.toString(),
          amount: parsed.amount || '',
          purpose: parsed.memo || 'School Fees',
          invoiceNumber: ''
        });
        setShowTransferForm(true);
        setMessage({ type: 'success', text: 'Payment request scanned! Review and confirm.' });
      } else {
        setMessage({ type: 'error', text: 'School not found in your network.' });
      }
    } else {
      setMessage({ type: 'error', text: 'Invalid payment QR code format.' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your education credits</p>
      </div>

      {/* Balance Card */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Available Balance</p>
            <p className="text-4xl font-bold text-primary-600 mt-2">
              {balance.toFixed(2)} EDUPASS
            </p>
            <p className="text-xs text-gray-500 mt-2">Stellar Public Key: {user.stellarPublicKey?.substring(0, 20)}...</p>
          </div>
          <Wallet className="h-16 w-16 text-primary-600" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowTransferForm(!showTransferForm)}
          className="btn-primary"
          disabled={balance === 0}
        >
          <Send className="h-4 w-4 inline mr-2" />
          Pay School
        </button>
        
        <button
          onClick={() => setShowQRModal(true)}
          className="btn-secondary"
        >
          <QrCode className="h-4 w-4 inline mr-2" />
          Show My QR Code
        </button>

        <QuickScanButton
          onScan={handleQRScan}
          onError={(err) => console.error('Scan error:', err)}
          buttonText="📷 Scan Payment Request"
          className="btn-secondary"
        />
      </div>

      {/* QR Code Modal */}
      <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)}>
        <ReceiveQRCode
          publicKey={user.stellarPublicKey}
          assetCode="EDUPASS"
          assetIssuer={process.env.REACT_APP_ISSUER_PUBLIC_KEY}
          studentName={user.fullName || user.email}
        />
      </QRCodeModal>

      {/* Transfer Form */}
      {showTransferForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Pay Education Institution</h2>
          
          {message.text && (
            <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="label">School / Institution</label>
              <select
                className="input"
                required
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} {school.organization && `(${school.organization})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Amount (EDUPASS)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                className="input"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Available: {balance} EDUPASS</p>
            </div>

            <div>
              <label className="label">Purpose</label>
              <select
                className="input"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              >
                <option>School Fees</option>
                <option>Tuition Support</option>
                <option>Training Program</option>
                <option>Exam Fees</option>
                <option>Books & Materials</option>
              </select>
            </div>

            <div>
              <label className="label">Invoice Number (optional)</label>
              <input
                type="text"
                className="input"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="INV-2024-001"
              />
            </div>

            <div className="flex space-x-4">
              <button type="submit" className="btn-primary">Send Payment</button>
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <History className="h-5 w-5 mr-2" />
          Transaction History
        </h2>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {tx.transaction_type === 'issue' && '📥 Received from '}
                    {tx.transaction_type === 'transfer' && '📤 Sent to '}
                    {tx.transaction_type === 'issue' ? tx.issuer_name : tx.school_name}
                  </p>
                  <p className="text-sm text-gray-600">{tx.purpose}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.transaction_type === 'issue' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.transaction_type === 'issue' ? '+' : '-'}{tx.amount} EDUPASS
                  </p>
                  <p className="text-xs text-gray-500">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BeneficiaryDashboard;
