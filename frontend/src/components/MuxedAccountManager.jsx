import { useState, useEffect } from 'react';
import phase3Service from '../services/phase3Service';

const MuxedAccountManager = () => {
  const [muxedAccounts, setMuxedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // create, list, send, parse

  // Create muxed account
  const [createForm, setCreateForm] = useState({
    id: '',
    label: ''
  });
  const [createResult, setCreateResult] = useState(null);

  // Send to muxed account
  const [sendForm, setSendForm] = useState({
    muxedDestination: '',
    amount: ''
  });
  const [sendResult, setSendResult] = useState(null);

  // Parse muxed account
  const [parseForm, setParseForm] = useState({
    muxedAddress: ''
  });
  const [parseResult, setParseResult] = useState(null);

  useEffect(() => {
    if (activeTab === 'list') {
      loadMuxedAccounts();
    }
  }, [activeTab]);

  const loadMuxedAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await phase3Service.getMuxedAccounts();
      setMuxedAccounts(response.muxedAccounts || []);
    } catch (err) {
      setError(err.message || 'Failed to load muxed accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMuxedAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCreateResult(null);

    try {
      const response = await phase3Service.createMuxedAccount(
        createForm.id,
        createForm.label
      );

      setCreateResult(response.muxedAccount);
      setCreateForm({ id: '', label: '' });
      
      // Reload list if on that tab
      if (activeTab === 'list') {
        loadMuxedAccounts();
      }
    } catch (err) {
      setError(err.message || 'Failed to create muxed account');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToMuxed = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSendResult(null);

    try {
      const response = await phase3Service.sendToMuxedAccount(
        sendForm.muxedDestination,
        parseFloat(sendForm.amount)
      );

      setSendResult(response);
      setSendForm({ muxedDestination: '', amount: '' });
    } catch (err) {
      setError(err.message || 'Failed to send to muxed account');
    } finally {
      setLoading(false);
    }
  };

  const handleParseMuxed = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setParseResult(null);

    try {
      const response = await phase3Service.parseMuxedAccount(parseForm.muxedAddress);
      setParseResult(response);
    } catch (err) {
      setError(err.message || 'Failed to parse muxed account');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-indigo-700">
        🔢 Muxed Accounts Manager
      </h2>

      <p className="text-gray-600 mb-6">
        Create and manage muxed accounts (M addresses) for better organization of payments.
      </p>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        {['create', 'list', 'send', 'parse'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div>
          <form onSubmit={handleCreateMuxedAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Muxed Account ID (numeric)
              </label>
              <input
                type="text"
                value={createForm.id}
                onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                placeholder="1234567890"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Unique numeric identifier for this muxed account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (optional)
              </label>
              <input
                type="text"
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                placeholder="Tuition payments, Cafeteria, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Muxed Account'}
            </button>
          </form>

          {createResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">✅ Muxed Account Created</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Muxed Address:</strong>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-white px-2 py-1 rounded flex-1 break-all">
                      {createResult.muxedAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createResult.muxedAddress)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <p><strong>Base Address:</strong> {createResult.baseAddress?.substring(0, 20)}...</p>
                <p><strong>ID:</strong> {createResult.id}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <div>
          <button
            onClick={loadMuxedAccounts}
            className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Refresh List
          </button>

          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : muxedAccounts.length === 0 ? (
            <p className="text-gray-600">No muxed accounts yet. Create one in the Create tab!</p>
          ) : (
            <div className="space-y-3">
              {muxedAccounts.map((account, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-indigo-700">
                        {account.label || `Muxed Account ${account.muxed_id}`}
                      </p>
                      <p className="text-sm text-gray-600">ID: {account.muxed_id}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(account.muxed_address)}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm"
                    >
                      Copy Address
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 break-all">
                    {account.muxed_address}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Created: {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send Tab */}
      {activeTab === 'send' && (
        <div>
          <form onSubmit={handleSendToMuxed} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Muxed Destination (M address)
              </label>
              <input
                type="text"
                value={sendForm.muxedDestination}
                onChange={(e) => setSendForm({ ...sendForm, muxedDestination: e.target.value })}
                placeholder="MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (EDUPASS)
              </label>
              <input
                type="number"
                value={sendForm.amount}
                onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                step="0.01"
                min="0.01"
                placeholder="100.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send to Muxed Account'}
            </button>
          </form>

          {sendResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">✅ Payment Sent</h3>
              <p className="text-sm">
                <strong>Transaction Hash:</strong>{' '}
                <code className="text-xs bg-white px-2 py-1 rounded break-all">
                  {sendResult.transactionHash}
                </code>
              </p>
              <p className="text-sm mt-2">
                <strong>Base Address:</strong> {sendResult.baseAddress}
              </p>
              <p className="text-sm">
                <strong>Muxed ID:</strong> {sendResult.muxedId}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Parse Tab */}
      {activeTab === 'parse' && (
        <div>
          <form onSubmit={handleParseMuxed} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Muxed Address to Parse
              </label>
              <input
                type="text"
                value={parseForm.muxedAddress}
                onChange={(e) => setParseForm({ muxedAddress: e.target.value })}
                placeholder="MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Parsing...' : 'Parse Muxed Address'}
            </button>
          </form>

          {parseResult && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Parsed Information</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Muxed Address:</strong>
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded break-all">
                    {parseResult.muxedAddress}
                  </code>
                </p>
                <p>
                  <strong>Base Address (G):</strong>
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded break-all">
                    {parseResult.baseAddress}
                  </code>
                </p>
                <p>
                  <strong>Muxed ID:</strong> {parseResult.id}
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
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ About Muxed Accounts</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Muxed accounts start with 'M' instead of 'G'</li>
          <li>Multiple muxed accounts can share the same base account</li>
          <li>Perfect for organizing different payment streams</li>
          <li>Example: Separate addresses for tuition, cafeteria, supplies</li>
          <li>All payments still go to the same underlying Stellar account</li>
        </ul>
      </div>
    </div>
  );
};

export default MuxedAccountManager;
