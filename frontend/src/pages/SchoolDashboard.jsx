import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { getSchoolBalance, getPendingTransactions, redeemCredits, getSchoolStats } from '../services/api';

function SchoolDashboard({ user }) {
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [redeemData, setRedeemData] = useState({
    serviceType: '',
    invoiceNumber: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceData, pendingData, statsData] = await Promise.all([
        getSchoolBalance(),
        getPendingTransactions(),
        getSchoolStats()
      ]);
      setBalance(balanceData.balance);
      setPending(pendingData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (transaction) => {
    setMessage({ type: '', text: '' });

    if (!redeemData.serviceType) {
      setMessage({ type: 'error', text: 'Please specify service type' });
      return;
    }

    try {
      await redeemCredits({
        transactionId: transaction.id,
        serviceType: redeemData.serviceType,
        invoiceNumber: redeemData.invoiceNumber || undefined
      });

      setMessage({ type: 'success', text: 'Credits redeemed and burned successfully!' });
      setRedeeming(null);
      setRedeemData({ serviceType: '', invoiceNumber: '' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Redemption failed' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">School Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage education credit redemptions</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-primary-600">
                {balance.toFixed(2)} EDUPASS
              </p>
            </div>
            <Wallet className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Redeemed</p>
              <p className="text-2xl font-bold text-gray-900">
                {parseFloat(stats?.statistics?.total_amount_redeemed || 0).toFixed(2)} EDUPASS
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Students Served</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.statistics?.unique_students || 0}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Pending Transactions */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Pending Redemptions ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No pending transactions</p>
        ) : (
          <div className="space-y-4">
            {pending.map((tx) => (
              <div key={tx.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-medium text-lg">{tx.beneficiary_name}</p>
                    <p className="text-sm text-gray-600">{tx.beneficiary_email}</p>
                    <p className="text-sm text-gray-600 mt-1">{tx.purpose}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">{tx.amount} EDUPASS</p>
                    <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {redeeming === tx.id ? (
                  <div className="bg-gray-50 p-4 rounded space-y-3">
                    <div>
                      <label className="label">Service Type</label>
                      <select
                        className="input"
                        value={redeemData.serviceType}
                        onChange={(e) => setRedeemData({ ...redeemData, serviceType: e.target.value })}
                      >
                        <option value="">Select service type</option>
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
                        value={redeemData.invoiceNumber}
                        onChange={(e) => setRedeemData({ ...redeemData, invoiceNumber: e.target.value })}
                        placeholder="INV-2024-001"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleRedeem(tx)}
                        className="btn-primary"
                      >
                        Redeem & Burn
                      </button>
                      <button
                        onClick={() => {
                          setRedeeming(null);
                          setRedeemData({ serviceType: '', invoiceNumber: '' });
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setRedeeming(tx.id)}
                    className="btn-primary w-full"
                  >
                    Process Redemption
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redemption Stats by Service Type */}
      {stats?.byServiceType && stats.byServiceType.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Redemptions by Service Type</h2>
          <div className="space-y-3">
            {stats.byServiceType.map((service, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{service.service_type}</p>
                  <p className="text-sm text-gray-600">{service.count} redemptions</p>
                </div>
                <p className="font-semibold text-primary-600">
                  {parseFloat(service.total_amount).toFixed(2)} EDUPASS
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolDashboard;
