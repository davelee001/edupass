import { useState } from 'react';
import phase3Service from '../services/phase3Service';

const AccountMergeManager = () => {
  const [activeTab, setActiveTab] = useState('check'); // check, merge
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check eligibility
  const [checkPublicKey, setCheckPublicKey] = useState('');
  const [eligibility, setEligibility] = useState(null);

  // Merge account
  const [mergeForm, setMergeForm] = useState({
    destinationPublicKey: ''
  });
  const [mergeResult, setMergeResult] = useState(null);

  const handleCheckEligibility = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEligibility(null);

    try {
      const result = await phase3Service.canMergeAccount(checkPublicKey);
      setEligibility(result);
    } catch (err) {
      setError(err.message || 'Failed to check merge eligibility');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeAccount = async (e) => {
    e.preventDefault();
    
    const confirmMessage = 
      '⚠️ WARNING: Account merge is IRREVERSIBLE!\n\n' +
      'This will:\n' +
      '- Transfer ALL XLM balance to the destination account\n' +
      '- Permanently delete the source account\n' +
      '- Remove all trustlines and data entries\n' +
      '- This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to proceed?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError('');
    setMergeResult(null);

    try {
      const result = await phase3Service.mergeAccount(mergeForm.destinationPublicKey);
      setMergeResult(result);
      setMergeForm({ destinationPublicKey: '' });
    } catch (err) {
      setError(err.message || 'Failed to merge account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        Account Merge - Consolidation
      </h2>

      <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <p className="text-sm text-yellow-800 font-medium">
          ⚠️ <strong>WARNING:</strong> Account merging is permanent and irreversible. 
          All funds will be transferred and the source account will be deleted.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        {['check', 'merge'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            {tab === 'check' ? 'Check Eligibility' : 'Merge Account'}
          </button>
        ))}
      </div>

      {/* Check Eligibility Tab */}
      {activeTab === 'check' && (
        <div>
          <form onSubmit={handleCheckEligibility} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account to Check
              </label>
              <input
                type="text"
                value={checkPublicKey}
                onChange={(e) => setCheckPublicKey(e.target.value)}
                placeholder="GXXXXXXXXXXXXXXXXXXXXX..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the public key of the account you want to check
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Checking...' : 'Check Eligibility'}
            </button>
          </form>

          {eligibility && (
            <div className={`mt-4 p-4 border rounded-lg ${
              eligibility.canMerge ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-3 ${
                eligibility.canMerge ? 'text-green-800' : 'text-red-800'
              }`}>
                {eligibility.canMerge ? '✓ Account Can Be Merged' : '✗ Account Cannot Be Merged'}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-600">XLM Balance:</p>
                    <p className="font-medium">{eligibility.balance} XLM</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Min Balance Required:</p>
                    <p className="font-medium">{eligibility.minBalance} XLM</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-600">Subentries:</p>
                    <p className="font-medium">{eligibility.subentries}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Signers:</p>
                    <p className="font-medium">{eligibility.signers}</p>
                  </div>
                </div>

                {eligibility.hasOffers !== undefined && (
                  <div>
                    <p className="text-gray-600">Open Offers:</p>
                    <p className="font-medium">{eligibility.hasOffers ? 'Yes' : 'No'}</p>
                  </div>
                )}

                {!eligibility.canMerge && eligibility.reason && (
                  <div className="mt-3 p-3 bg-white border border-red-200 rounded">
                    <p className="text-red-700">
                      <strong>Reason:</strong> {eligibility.reason}
                    </p>
                  </div>
                )}

                {eligibility.canMerge && (
                  <div className="mt-3 p-3 bg-white border border-green-200 rounded">
                    <p className="text-green-700">
                      <strong>Ready to merge:</strong> This account meets all requirements.
                      Switch to the "Merge Account" tab to proceed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Merge Account Tab */}
      {activeTab === 'merge' && (
        <div>
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ Critical Warning</h3>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>This action is <strong>PERMANENT and IRREVERSIBLE</strong></li>
              <li>Your current account will be <strong>DELETED</strong></li>
              <li>All XLM balance will be transferred to the destination</li>
              <li>All trustlines, data entries, and offers will be removed</li>
              <li>You will lose access to this account forever</li>
            </ul>
          </div>

          <form onSubmit={handleMergeAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Account (will receive all funds)
              </label>
              <input
                type="text"
                value={mergeForm.destinationPublicKey}
                onChange={(e) => setMergeForm({ ...mergeForm, destinationPublicKey: e.target.value })}
                placeholder="GXXXXXXXXXXXXXXXXXXXXX..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the public key of the account that will receive all assets
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Before merging, ensure:</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>You have removed all trustlines</li>
                <li>You have cancelled all open offers</li>
                <li>The destination account exists and is active</li>
                <li>You have backed up any important data</li>
                <li>You understand this action cannot be reversed</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Merging Account...' : '🔥 MERGE ACCOUNT (IRREVERSIBLE)'}
            </button>
          </form>

          {mergeResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Account Successfully Merged</h3>
              <div className="text-sm space-y-1">
                <p><strong>Transaction Hash:</strong></p>
                <code className="text-xs bg-white px-2 py-1 rounded block break-all">
                  {mergeResult.hash}
                </code>
                <p className="mt-2"><strong>Transferred:</strong> {mergeResult.amount} XLM</p>
                <p><strong>To Account:</strong></p>
                <code className="text-xs bg-white px-2 py-1 rounded block break-all">
                  {mergeResult.destination}
                </code>
                <p className="mt-3 text-green-700 font-medium">
                  Your account has been permanently closed. Please log in with the destination account.
                </p>
              </div>
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
        <h3 className="font-semibold text-blue-800 mb-2">About Account Merging</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>Purpose:</strong> Consolidate multiple accounts into one</li>
          <li><strong>Requirements:</strong> No trustlines, no offers, sufficient XLM balance</li>
          <li><strong>Process:</strong> All XLM transferred, source account deleted</li>
          <li><strong>Common use:</strong> Cleanup test accounts, merge old accounts</li>
          <li><strong>Fee returned:</strong> Base reserve returned to destination</li>
          <li><strong>Irreversible:</strong> Cannot undo after execution</li>
        </ul>
      </div>
    </div>
  );
};

export default AccountMergeManager;
