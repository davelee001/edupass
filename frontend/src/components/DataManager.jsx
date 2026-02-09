import { useState, useEffect } from 'react';
import phase3Service from '../services/phase3Service';

const DataManager = () => {
  const [activeTab, setActiveTab] = useState('add'); // add, view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add/Update data
  const [dataForm, setDataForm] = useState({
    key: '',
    value: ''
  });
  const [dataResult, setDataResult] = useState(null);

  // View data
  const [viewPublicKey, setViewPublicKey] = useState('');
  const [accountData, setAccountData] = useState([]);

  const handleManageData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDataResult(null);

    try {
      const result = await phase3Service.manageAccountData(
        dataForm.key,
        dataForm.value || null
      );

      setDataResult(result);
      setDataForm({ key: '', value: '' });
    } catch (err) {
      setError(err.message || 'Failed to manage account data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAccountData([]);

    try {
      const result = await phase3Service.getAccountData(viewPublicKey);
      setAccountData(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async (key) => {
    if (!window.confirm(`Are you sure you want to delete data entry "${key}"?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await phase3Service.manageAccountData(key, null);
      // Refresh the data list
      if (viewPublicKey) {
        const result = await phase3Service.getAccountData(viewPublicKey);
        setAccountData(result.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete data entry');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load user's own data when switching to view tab
  useEffect(() => {
    if (activeTab === 'view' && !viewPublicKey) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.publicKey) {
        setViewPublicKey(currentUser.publicKey);
      }
    }
  }, [activeTab, viewPublicKey]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        On-Chain Data Management
      </h2>

      <p className="text-gray-600 mb-6">
        Store and retrieve metadata directly on the Stellar blockchain (up to 64 bytes per entry).
      </p>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        {['add', 'view'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            {tab === 'add' ? 'Add/Update' : 'View Data'}
          </button>
        ))}
      </div>

      {/* Add/Update Tab */}
      {activeTab === 'add' && (
        <div>
          <form onSubmit={handleManageData} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Key (Name)
              </label>
              <input
                type="text"
                value={dataForm.key}
                onChange={(e) => setDataForm({ ...dataForm, key: e.target.value })}
                placeholder="student_id"
                maxLength={64}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Max 64 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Value (leave empty to delete)
              </label>
              <textarea
                value={dataForm.value}
                onChange={(e) => setDataForm({ ...dataForm, value: e.target.value })}
                placeholder="STU-2024-001"
                maxLength={64}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max 64 bytes. Leave empty to remove this data entry.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : dataForm.value ? 'Add/Update Data' : 'Delete Data'}
            </button>
          </form>

          {dataResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                {dataResult.action === 'added' ? 'Data Added!' : 
                 dataResult.action === 'updated' ? 'Data Updated!' : 'Data Deleted!'}
              </h3>
              <div className="text-sm space-y-1">
                <p><strong>Key:</strong> {dataResult.key}</p>
                {dataResult.value && <p><strong>Value:</strong> {dataResult.value}</p>}
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Transaction:</strong> <code className="bg-white px-2 py-1 rounded">{dataResult.hash}</code>
                </p>
              </div>
            </div>
          )}

          {/* Example use cases */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Common Use Cases</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><strong>student_id:</strong> Student identification number</li>
              <li><strong>institution:</strong> School or university name</li>
              <li><strong>graduation_year:</strong> Expected graduation year</li>
              <li><strong>program:</strong> Degree or program code</li>
              <li><strong>email_hash:</strong> Hashed contact information</li>
            </ul>
          </div>
        </div>
      )}

      {/* View Data Tab */}
      {activeTab === 'view' && (
        <div>
          <form onSubmit={handleViewData} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Public Key
              </label>
              <input
                type="text"
                value={viewPublicKey}
                onChange={(e) => setViewPublicKey(e.target.value)}
                placeholder="GXXXXXXXXXXXXXXXXXXXXX..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Load Account Data'}
            </button>
          </form>

          {accountData.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">
                Account Data Entries ({accountData.length})
              </h3>
              <div className="space-y-2">
                {accountData.map((item, index) => (
                  <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.key}</p>
                        <p className="text-sm text-gray-600 mt-1 break-all">{item.value}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Encoded: <code className="bg-white px-1 rounded">{item.encoded}</code>
                        </p>
                      </div>
                      {viewPublicKey === JSON.parse(localStorage.getItem('user') || '{}').publicKey && (
                        <button
                          onClick={() => handleDeleteData(item.key)}
                          className="ml-4 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {accountData.length === 0 && !loading && viewPublicKey && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                No data entries found for this account.
              </p>
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
        <h3 className="font-semibold text-blue-800 mb-2">About On-Chain Data</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Store metadata directly on the blockchain (permanent and transparent)</li>
          <li>Each entry: key-value pair, max 64 bytes each</li>
          <li>Perfect for student IDs, credentials, institutional info</li>
          <li>Data is publicly readable by anyone</li>
          <li>Small fee to add/update/delete each entry</li>
          <li>Delete by setting value to null/empty</li>
        </ul>
      </div>
    </div>
  );
};

export default DataManager;
