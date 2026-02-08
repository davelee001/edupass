import { useState, useEffect } from 'react';
import { Search, User, Edit2, Check } from 'lucide-react';
import federationService from '../services/federationService';

function FederationManager() {
  const [myFederation, setMyFederation] = useState(null);
  const [customName, setCustomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [resolveAddress, setResolveAddress] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadMyFederation();
  }, []);

  const loadMyFederation = async () => {
    try {
      const data = await federationService.getMyFederationName();
      setMyFederation(data);
    } catch (err) {
      console.error('Failed to load federation name:', err);
    }
  };

  const handleSetCustomName = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await federationService.setCustomFederationName(customName);
      setSuccess(`Federation name set: ${result.stellar_address}`);
      setMyFederation({ stellar_address: result.stellar_address });
      setEditMode(false);
      setCustomName('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to set custom name');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const results = await federationService.searchFederationNames(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResolvedAccount(null);

    try {
      const result = await federationService.parseAddress(resolveAddress);
      setResolvedAccount(result);
    } catch (err) {
      setError(err.message || 'Failed to resolve address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* My Federation Address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Federation Address</h2>
        
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

        {myFederation && !editMode && (
          <div className="mb-4">
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary-600" />
                <div>
                  <div className="text-sm text-gray-600">Your federation address:</div>
                  <div className="text-lg font-mono font-semibold text-primary-900">
                    {myFederation.stellar_address}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Customize
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Share this address instead of your public key for easier payments
            </p>
          </div>
        )}

        {editMode && (
          <form onSubmit={handleSetCustomName} className="space-y-4 mb-4">
            <div>
              <label className="label">Custom Federation Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  className="input flex-1"
                  placeholder="myname"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <span className="flex items-center text-gray-600 font-mono">
                  *{myFederation?.home_domain || 'edupass.local'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Use only letters, numbers, hyphens, and underscores
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Custom Name'}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">What is Federation?</h3>
          <p className="text-sm text-blue-800">
            Federation allows you to use a human-readable address like <strong>yourname*edupass.com</strong>{' '}
            instead of a long cryptographic public key. This makes it easier for people to send you payments!
          </p>
        </div>
      </div>

      {/* Resolve Address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Resolve Address</h2>
        <p className="text-gray-600 mb-4">
          Convert a federation address to a Stellar account or verify a public key
        </p>

        <form onSubmit={handleResolveAddress} className="space-y-4">
          <div>
            <label className="label">Federation Address or Public Key</label>
            <input
              type="text"
              required
              className="input font-mono text-sm"
              placeholder="name*edupass.local or G..."
              value={resolveAddress}
              onChange={(e) => setResolveAddress(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Resolving...' : 'Resolve'}
          </button>
        </form>

        {resolvedAccount && (
          <div className="mt-4 border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Resolved Account:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Account ID:</span>
                <div className="font-mono text-xs break-all">{resolvedAccount.accountId}</div>
              </div>
              {resolvedAccount.federationAddress && (
                <div>
                  <span className="font-medium">Federation:</span>{' '}
                  <span className="font-mono">{resolvedAccount.federationAddress}</span>
                </div>
              )}
              {resolvedAccount.memo && (
                <div>
                  <span className="font-medium">Memo ({resolvedAccount.memoType}):</span>{' '}
                  {resolvedAccount.memo}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search Users */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Search Users</h2>
        <p className="text-gray-600 mb-4">
          Find other users by their federation name or email
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="label">Search Query</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                className="input flex-1"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Results:</h3>
            {searchResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-primary-600">
                      {result.stellar_address}
                    </div>
                    <div className="text-sm text-gray-600">
                      {result.name} ({result.role})
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setResolveAddress(result.stellar_address);
                      setResolvedAccount({
                        accountId: result.account_id,
                        federationAddress: result.stellar_address
                      });
                    }}
                    className="btn-secondary text-xs"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !loading && (
          <div className="mt-4 text-center text-gray-500 py-4">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}

export default FederationManager;
