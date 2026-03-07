import { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Send } from 'lucide-react';
import { getBeneficiaries, issueCredits, getIssuerStats } from '../services/api';

function IssuerDashboard({ user }) {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    beneficiaryId: '',
    amount: '',
    purpose: 'School Fees',
    academicYear: new Date().getFullYear().toString()
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [beneficiariesData, statsData] = await Promise.all([
        getBeneficiaries(),
        getIssuerStats()
      ]);
      setBeneficiaries(beneficiariesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await issueCredits({
        beneficiaryId: parseInt(formData.beneficiaryId),
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        academicYear: formData.academicYear
      });

      setMessage({ type: 'success', text: 'Credits issued successfully!' });
      setFormData({ beneficiaryId: '', amount: '', purpose: 'School Fees', academicYear: new Date().getFullYear().toString() });
      setShowIssueForm(false);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to issue credits' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">Issuer Dashboard</h1>
        <p className="text-gray-600 mt-3 text-lg">Manage education credit issuance and distribution</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="stat-card group hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Total Issued</p>
              <p className="text-3xl font-bold text-gray-900">
                {parseFloat(stats?.statistics?.total_amount_issued || 0).toFixed(2)}
              </p>
              <p className="text-sm text-primary-600 font-semibold mt-1">EDUPASS</p>
            </div>
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-4 rounded-2xl shadow-medium">
              <DollarSign className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card group hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Beneficiaries</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.statistics?.unique_beneficiaries || 0}
              </p>
              <p className="text-sm text-success-600 font-semibold mt-1">Active Users</p>
            </div>
            <div className="bg-gradient-to-br from-success-500 to-success-600 p-4 rounded-2xl shadow-medium">
              <Users className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card group hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Issuances</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.statistics?.total_issuances || 0}
              </p>
              <p className="text-sm text-secondary-600 font-semibold mt-1">Transactions</p>
            </div>
            <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 p-4 rounded-2xl shadow-medium">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Issue Credits Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowIssueForm(!showIssueForm)}
          className="btn-primary"
        >
          <Send className="h-5 w-5 inline mr-2" />
          Issue Credits
        </button>
      </div>

      {/* Issue Form */}
      {showIssueForm && (
        <div className="card-gradient mb-8 animate-scale-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Issue Education Credits</h2>
          
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl border-2 font-medium ${message.type === 'success' ? 'bg-success-50 border-success-200 text-success-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleIssue} className="space-y-4">
            <div>
              <label className="label">Beneficiary</label>
              <select
                className="input"
                required
                value={formData.beneficiaryId}
                onChange={(e) => setFormData({ ...formData, beneficiaryId: e.target.value })}
              >
                <option value="">Select beneficiary</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.email}) - Balance: {b.balance} EDUPASS
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
                className="input"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
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
              <label className="label">Academic Year</label>
              <input
                type="text"
                className="input"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </div>

            <div className="flex space-x-4">
              <button type="submit" className="btn-primary">Issue Credits</button>
              <button
                type="button"
                onClick={() => setShowIssueForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Beneficiaries List */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Beneficiaries</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {beneficiary.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {beneficiary.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {beneficiary.balance} EDUPASS
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(beneficiary.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Issuances */}
      {stats?.recentIssuances && stats.recentIssuances.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Recent Issuances</h2>
          <div className="space-y-3">
            {stats.recentIssuances.map((issuance) => (
              <div key={issuance.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{issuance.beneficiary_name}</p>
                  <p className="text-sm text-gray-600">{issuance.purpose}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">{issuance.amount} EDUPASS</p>
                  <p className="text-xs text-gray-500">{new Date(issuance.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default IssuerDashboard;
