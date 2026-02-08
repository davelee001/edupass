import { useState, useEffect } from 'react';
import { UserPlus, History, Info, Trash2, AlertTriangle, DollarSign, TrendingDown } from 'lucide-react';
import sponsorshipService from '../services/sponsorshipService';

function SponsorshipManager() {
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'history', 'info'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState([]);
  const [sponsorshipInfo, setSponsorshipInfo] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [loadingBudget, setLoadingBudget] = useState(false);

  // Form state for creating sponsored account
  const [accountForm, setAccountForm] = useState({
    newAccountPublicKey: '',
    startingBalance: '0'
  });

  // Form state for sponsored trustline
  const [trustlineForm, setTrustlineForm] = useState({
    accountSecretKey: '',
    assetCode: '',
    assetIssuer: '',
    limit: ''
  });

  // Form state for getting sponsorship info
  const [infoForm, setInfoForm] = useState({
    accountId: ''
  });

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
    loadBudgetStatus();
  }, [activeTab]);

  // Refresh budget every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadBudgetStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBudgetStatus = async () => {
    setLoadingBudget(true);
    try {
      const data = await sponsorshipService.getSponsorBalance();
      setBudgetStatus(data);
    } catch (err) {
      console.error('Failed to load budget status:', err);
    } finally {
      setLoadingBudget(false);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sponsorshipService.getSponsorshipHistory();
      setHistory(data.sponsorships || []);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await sponsorshipService.createSponsoredAccount(
        accountForm.newAccountPublicKey,
        accountForm.startingBalance
      );
      setSuccess(`Account created successfully! Transaction: ${result.transactionId}`);
      setAccountForm({ newAccountPublicKey: '', startingBalance: '0' });
    } catch (err) {
      setError(err.message || 'Failed to create sponsored account');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrustline = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await sponsorshipService.establishSponsoredTrustline(
        trustlineForm.accountSecretKey,
        trustlineForm.assetCode,
        trustlineForm.assetIssuer,
        trustlineForm.limit || null
      );
      setSuccess(`Trustline created successfully! Transaction: ${result.transactionId}`);
      setTrustlineForm({ accountSecretKey: '', assetCode: '', assetIssuer: '', limit: '' });
    } catch (err) {
      setError(err.message || 'Failed to create sponsored trustline');
    } finally {
      setLoading(false);
    }
  };

  const handleGetInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSponsorshipInfo(null);

    try {
      const info = await sponsorshipService.getSponsorshipInfo(infoForm.accountId);
      setSponsorshipInfo(info);
    } catch (err) {
      setError(err.message || 'Failed to get sponsorship info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Budget Monitor */}
      {budgetStatus && (
        <div className={`rounded-lg shadow-sm p-6 ${
          budgetStatus.budget.status === 'critical' ? 'bg-red-50 border-2 border-red-500' :
          budgetStatus.budget.status === 'low' ? 'bg-yellow-50 border-2 border-yellow-500' :
          'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {budgetStatus.budget.status === 'critical' && (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                {budgetStatus.budget.status === 'low' && (
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                )}
                {budgetStatus.budget.status === 'healthy' && (
                  <DollarSign className="h-5 w-5 text-green-600" />
                )}
                <h3 className={`text-lg font-bold ${
                  budgetStatus.budget.status === 'critical' ? 'text-red-900' :
                  budgetStatus.budget.status === 'low' ? 'text-yellow-900' :
                  'text-green-900'
                }`}>
                  Sponsorship Budget: {budgetStatus.budget.status.toUpperCase()}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-600">XLM Balance</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {budgetStatus.balance.xlmBalance.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Available: {budgetStatus.balance.availableBalance.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Sponsored</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {budgetStatus.stats.totalSponsored}
                  </div>
                  <div className="text-xs text-gray-500">
                    Fees: {budgetStatus.stats.totalFeesPaid.toFixed(5)} XLM
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Operations Left</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ~{budgetStatus.budget.operationsRemaining}
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg: {budgetStatus.stats.avgFeePerOperation.toFixed(6)} XLM
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Est. Days Left</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {budgetStatus.budget.daysRemaining}
                  </div>
                  <div className="text-xs text-gray-500">
                    At current rate
                  </div>
                </div>
              </div>

              {budgetStatus.budget.status === 'critical' && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-900">
                  <strong>⚠️ Critical:</strong> Balance below {budgetStatus.budget.criticalBalanceThreshold} XLM. 
                  Please fund your sponsor account immediately to continue operations.
                </div>
              )}
              {budgetStatus.budget.status === 'low' && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-900">
                  <strong>⚠️ Low Balance:</strong> Balance below {budgetStatus.budget.lowBalanceThreshold} XLM. 
                  Consider adding more XLM to your sponsor account soon.
                </div>
              )}
            </div>
            
            <button
              onClick={loadBudgetStatus}
              disabled={loadingBudget}
              className="ml-4 btn-secondary text-sm"
            >
              {loadingBudget ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sponsored Reserves</h2>
        <p className="text-gray-600 mb-6">
          Sponsor account creation and trustlines for users, covering their reserve requirements
        </p>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2 px-4 font-medium ${
              activeTab === 'create'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="inline h-4 w-4 mr-2" />
            Create Sponsorship
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-4 font-medium ${
              activeTab === 'history'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="inline h-4 w-4 mr-2" />
            History
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2 px-4 font-medium ${
              activeTab === 'info'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Info className="inline h-4 w-4 mr-2" />
            Check Info
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Create Sponsored Account */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Sponsor New Account</h3>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="label">New Account Public Key</label>
                  <input
                    type="text"
                    required
                    className="input font-mono text-sm"
                    placeholder="G..."
                    value={accountForm.newAccountPublicKey}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, newAccountPublicKey: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Starting Balance (XLM)</label>
                  <input
                    type="number"
                    step="0.0000001"
                    min="0"
                    className="input"
                    placeholder="0"
                    value={accountForm.startingBalance}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, startingBalance: e.target.value })
                    }
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating...' : 'Create Sponsored Account'}
                </button>
              </form>
            </div>

            {/* Create Sponsored Trustline */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Sponsor Trustline</h3>
              <form onSubmit={handleCreateTrustline} className="space-y-4">
                <div>
                  <label className="label">Account Secret Key</label>
                  <input
                    type="password"
                    required
                    className="input font-mono text-sm"
                    placeholder="S..."
                    value={trustlineForm.accountSecretKey}
                    onChange={(e) =>
                      setTrustlineForm({ ...trustlineForm, accountSecretKey: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Asset Code</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="EDUPASS"
                    value={trustlineForm.assetCode}
                    onChange={(e) =>
                      setTrustlineForm({ ...trustlineForm, assetCode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Asset Issuer</label>
                  <input
                    type="text"
                    required
                    className="input font-mono text-sm"
                    placeholder="G..."
                    value={trustlineForm.assetIssuer}
                    onChange={(e) =>
                      setTrustlineForm({ ...trustlineForm, assetIssuer: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Limit (Optional)</label>
                  <input
                    type="number"
                    step="0.0000001"
                    className="input"
                    placeholder="Maximum limit"
                    value={trustlineForm.limit}
                    onChange={(e) =>
                      setTrustlineForm({ ...trustlineForm, limit: e.target.value })
                    }
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating...' : 'Create Sponsored Trustline'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {loading ? (
              <div className="text-center py-8">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No sponsorship history</div>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.sponsorship_type.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Sponsor: {item.sponsor_email}
                        </div>
                        <div className="text-sm text-gray-600">
                          Sponsored: {item.sponsored_email || item.sponsored_user_id}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                        {item.details && (
                          <div className="text-xs text-gray-500 mt-1">
                            {JSON.stringify(item.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div>
            <form onSubmit={handleGetInfo} className="space-y-4 mb-6">
              <div>
                <label className="label">Account Public Key</label>
                <input
                  type="text"
                  required
                  className="input font-mono text-sm"
                  placeholder="G..."
                  value={infoForm.accountId}
                  onChange={(e) => setInfoForm({ accountId: e.target.value })}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Loading...' : 'Get Sponsorship Info'}
              </button>
            </form>

            {sponsorshipInfo && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-3">Sponsorship Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Account:</span>{' '}
                    <span className="font-mono text-xs">{sponsorshipInfo.account}</span>
                  </div>
                  <div>
                    <span className="font-medium">Number Sponsoring:</span>{' '}
                    {sponsorshipInfo.numSponsoring}
                  </div>
                  <div>
                    <span className="font-medium">Number Sponsored:</span>{' '}
                    {sponsorshipInfo.numSponsored}
                  </div>
                  
                  {sponsorshipInfo.sponsors && sponsorshipInfo.sponsors.length > 0 && (
                    <div className="mt-4">
                      <div className="font-medium mb-2">Sponsors:</div>
                      {sponsorshipInfo.sponsors.map((sponsor, index) => (
                        <div key={index} className="pl-4 py-1 text-xs">
                          <div className="font-medium">{sponsor.type}</div>
                          <div className="font-mono">{sponsor.sponsor}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SponsorshipManager;
