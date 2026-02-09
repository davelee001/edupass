import { useState, useEffect } from 'react';
import phase3Service from '../services/phase3Service';

const SEP24Manager = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, withdrawal, history

  // Deposit form
  const [depositForm, setDepositForm] = useState({
    assetCode: 'EDUPASS',
    amount: '',
    anchorDomain: 'testanchor.stellar.org'
  });
  const [depositResult, setDepositResult] = useState(null);

  // Withdrawal form
  const [withdrawalForm, setWithdrawalForm] = useState({
    assetCode: 'EDUPASS',
    amount: '',
    anchorDomain: 'testanchor.stellar.org'
  });
  const [withdrawalResult, setWithdrawalResult] = useState(null);

  useEffect(() => {
    if (activeTab === 'history') {
      loadTransactions();
    }
  }, [activeTab]);

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await phase3Service.getSEP24Transactions();
      setTransactions(response.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDepositResult(null);

    try {
      const response = await phase3Service.initiateSEP24Deposit(
        depositForm.assetCode,
        parseFloat(depositForm.amount),
        depositForm.anchorDomain
      );

      setDepositResult(response);
      setDepositForm({ ...depositForm, amount: '' });
    } catch (err) {
      setError(err.message || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWithdrawalResult(null);

    try {
      const response = await phase3Service.initiateSEP24Withdrawal(
        withdrawalForm.assetCode,
        parseFloat(withdrawalForm.amount),
        withdrawalForm.anchorDomain
      );

      setWithdrawalResult(response);
      setWithdrawalForm({ ...withdrawalForm, amount: '' });
    } catch (err) {
      setError(err.message || 'Failed to initiate withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (transactionId) => {
    try {
      const response = await phase3Service.getSEP24TransactionStatus(transactionId);
      alert(`Status: ${response.status}\n${response.message || ''}`);
      loadTransactions(); // Refresh list
    } catch (err) {
      alert('Failed to check status: ' + (err.message || 'Unknown error'));
    }
  };

  const openInteractiveUrl = (url) => {
    window.open(url, '_blank', 'width=800,height=600');
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'pending_user_transfer_start': 'bg-yellow-100 text-yellow-800',
      'pending_anchor': 'bg-blue-100 text-blue-800',
      'pending_stellar': 'bg-purple-100 text-purple-800',
      'error': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-green-700">
        💱 SEP-24 Anchor Integration (Fiat Gateway)
      </h2>

      <p className="text-gray-600 mb-6">
        Convert between fiat currency and EDUPASS credits using anchor services.
      </p>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        {['deposit', 'withdrawal', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Deposit Tab */}
      {activeTab === 'deposit' && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>💰 Deposit (Fiat → Crypto)</strong><br />
              Convert your fiat currency (USD, EUR, etc.) into EDUPASS credits.
            </p>
          </div>

          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Code
                </label>
                <input
                  type="text"
                  value={depositForm.assetCode}
                  onChange={(e) => setDepositForm({ ...depositForm, assetCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  step="0.01"
                  min="0.01"
                  placeholder="100.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anchor Domain
              </label>
              <input
                type="text"
                value={depositForm.anchorDomain}
                onChange={(e) => setDepositForm({ ...depositForm, anchorDomain: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                The anchor service that will process your deposit
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Initiating...' : 'Initiate Deposit'}
            </button>
          </form>

          {depositResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">✅ Deposit Initiated</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Transaction ID:</strong> {depositResult.id}</p>
                <p><strong>Status:</strong> {depositResult.status}</p>
                <p><strong>Amount:</strong> {depositResult.amount} {depositResult.assetCode}</p>
                <p className="text-blue-700">{depositResult.message}</p>
                
                <button
                  onClick={() => openInteractiveUrl(depositResult.interactiveUrl)}
                  className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Complete Deposit →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Tab */}
      {activeTab === 'withdrawal' && (
        <div>
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700">
              <strong>💸 Withdrawal (Crypto → Fiat)</strong><br />
              Convert your EDUPASS credits back into fiat currency.
            </p>
          </div>

          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Code
                </label>
                <input
                  type="text"
                  value={withdrawalForm.assetCode}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, assetCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  step="0.01"
                  min="0.01"
                  placeholder="100.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anchor Domain
              </label>
              <input
                type="text"
                value={withdrawalForm.anchorDomain}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, anchorDomain: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Initiating...' : 'Initiate Withdrawal'}
            </button>
          </form>

          {withdrawalResult && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">✅ Withdrawal Initiated</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Transaction ID:</strong> {withdrawalResult.id}</p>
                <p><strong>Status:</strong> {withdrawalResult.status}</p>
                <p><strong>Amount:</strong> {withdrawalResult.amount} {withdrawalResult.assetCode}</p>
                <p className="text-blue-700">{withdrawalResult.message}</p>
                
                <button
                  onClick={() => openInteractiveUrl(withdrawalResult.interactiveUrl)}
                  className="mt-2 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Complete Withdrawal →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          <button
            onClick={loadTransactions}
            className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Refresh History
          </button>

          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-600">No transactions yet. Start a deposit or withdrawal!</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {tx.type === 'deposit' ? '💰 Deposit' : '💸 Withdrawal'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {tx.amount} {tx.asset_code}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(tx.status)}`}>
                        {tx.status}
                      </span>
                      <button
                        onClick={() => checkStatus(tx.transaction_id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                      >
                        Check Status
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Transaction ID: {tx.transaction_id}
                  </p>
                  <p className="text-xs text-gray-400">
                    Anchor: {tx.anchor_domain}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                  
                  {tx.interactive_url && (
                    <button
                      onClick={() => openInteractiveUrl(tx.interactive_url)}
                      className="mt-2 text-xs text-green-600 hover:underline"
                    >
                      Open Interactive Flow →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ About SEP-24 Anchors</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>SEP-24 enables seamless fiat ↔ crypto conversion</li>
          <li>Anchors are regulated entities that hold fiat reserves</li>
          <li>Interactive flow allows KYC/AML compliance</li>
          <li>Deposits convert fiat into EDUPASS credits</li>
          <li>Withdrawals convert EDUPASS back to fiat</li>
          <li>Track all transactions in the History tab</li>
        </ul>
      </div>
    </div>
  );
};

export default SEP24Manager;
