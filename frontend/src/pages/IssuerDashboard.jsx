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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Issuer Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage education credit issuance</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Issued</p>
              <p className="text-2xl font-bold text-gray-900">
                {parseFloat(stats?.statistics?.total_amount_issued || 0).toFixed(2)} EDUPASS
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Beneficiaries</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.statistics?.unique_beneficiaries || 0}
              </p>
            </div>
            <Users className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Issuances</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.statistics?.total_issuances || 0}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Issue Credits Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowIssueForm(!showIssueForm)}
          className="btn-primary"
        >
          <Send className="h-4 w-4 inline mr-2" />
          Issue Credits
        </button>
      </div>

      {/* Issue Form */}
      {showIssueForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Issue Education Credits</h2>
          
          {message.text && (
            <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
