import { useState } from 'react';
import phase3Service from '../services/phase3Service';

const PathPaymentManager = () => {
  const [activeTab, setActiveTab] = useState('send'); // send, find
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Send path payment
  const [sendForm, setSendForm] = useState({
    destinationPublicKey: '',
    destAmount: '',
    sendMax: '',
    destAssetCode: 'EDUPASS',
    sendAssetCode: ''
  });
  const [sendResult, setSendResult] = useState(null);

  // Find paths
  const [findForm, setFindForm] = useState({
    destinationPublicKey: '',
    destAssetCode: 'EDUPASS',
    destAmount: ''
  });
  const [paths, setPaths] = useState([]);

  const handleSendPathPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSendResult(null);

    try {
      const result = await phase3Service.sendPathPayment(
        sendForm.destinationPublicKey,
        parseFloat(sendForm.destAmount),
        parseFloat(sendForm.sendMax),
        sendForm.destAssetCode,
        sendForm.sendAssetCode || null
      );

      setSendResult(result);
      setSendForm({ ...sendForm, destinationPublicKey: '', destAmount: '', sendMax: '' });
    } catch (err) {
      setError(err.message || 'Failed to send path payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFindPaths = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPaths([]);

    try {
      const result = await phase3Service.findPaymentPaths(
        findForm.destinationPublicKey,
        findForm.destAssetCode,
        parseFloat(findForm.destAmount)
      );

      setPaths(result.paths || []);
    } catch (err) {
      setError(err.message || 'Failed to find payment paths');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        Path Payments - Automatic Conversion
      </h2>

      <p className="text-gray-600 mb-6">
        Send payments with automatic asset conversion through the Stellar network.
      </p>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        {['send', 'find'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            {tab === 'send' ? 'Send Payment' : 'Find Paths'}
          </button>
        ))}
      </div>

      {/* Send Tab */}
      {activeTab === 'send' && (
        <div>
          <form onSubmit={handleSendPathPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Account
              </label>
              <input
                type="text"
                value={sendForm.destinationPublicKey}
                onChange={(e) => setSendForm({ ...sendForm, destinationPublicKey: e.target.value })}
                placeholder="GXXXXXXXXXXXXXXXXXXXXX..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Receive
                </label>
                <input
                  type="number"
                  value={sendForm.destAmount}
                  onChange={(e) => setSendForm({ ...sendForm, destAmount: e.target.value })}
                  step="0.01"
                  min="0.01"
                  placeholder="100.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum to Send
                </label>
                <input
                  type="number"
                  value={sendForm.sendMax}
                  onChange={(e) => setSendForm({ ...sendForm, sendMax: e.target.value })}
                  step="0.01"
                  min="0.01"
                  placeholder="110.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receive Asset
                </label>
                <input
                  type="text"
                  value={sendForm.destAssetCode}
                  onChange={(e) => setSendForm({ ...sendForm, destAssetCode: e.target.value })}
                  placeholder="EDUPASS"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Asset (blank = XLM)
                </label>
                <input
                  type="text"
                  value={sendForm.sendAssetCode}
                  onChange={(e) => setSendForm({ ...sendForm, sendAssetCode: e.target.value })}
                  placeholder="XLM (native)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send Path Payment'}
            </button>
          </form>

          {sendResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Payment Sent!</h3>
              <div className="text-sm space-y-1">
                <p><strong>Transaction Hash:</strong> <code className="text-xs bg-white px-2 py-1 rounded">{sendResult.hash}</code></p>
                <p><strong>Source Asset:</strong> {sendResult.sourceAsset}</p>
                <p><strong>Destination Asset:</strong> {sendResult.destAsset}</p>
                <p><strong>Amount Received:</strong> {sendResult.destAmount}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Find Paths Tab */}
      {activeTab === 'find' && (
        <div>
          <form onSubmit={handleFindPaths} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Account
              </label>
              <input
                type="text"
                value={findForm.destinationPublicKey}
                onChange={(e) => setFindForm({ ...findForm, destinationPublicKey: e.target.value })}
                placeholder="GXXXXXXXXXXXXXXXXXXXXX..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Code
                </label>
                <input
                  type="text"
                  value={findForm.destAssetCode}
                  onChange={(e) => setFindForm({ ...findForm, destAssetCode: e.target.value })}
                  placeholder="EDUPASS"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={findForm.destAmount}
                  onChange={(e) => setFindForm({ ...findForm, destAmount: e.target.value })}
                  step="0.01"
                  min="0.01"
                  placeholder="100.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Find Payment Paths'}
            </button>
          </form>

          {paths.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Found {paths.length} Payment Path{paths.length !== 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {paths.map((path, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm">
                      <p><strong>Path {index + 1}:</strong></p>
                      <p>Send: {path.sourceAmount} {path.sourceAsset}</p>
                      <p>Receive: {path.destinationAmount}</p>
                      {path.path && path.path.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Via: {path.path.map(p => p.asset_code || 'XLM').join(' → ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paths.length === 0 && !loading && findForm.destinationPublicKey && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">No payment paths found. Try a different amount or asset.</p>
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
        <h3 className="font-semibold text-blue-800 mb-2">About Path Payments</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Automatically convert between assets during payment</li>
          <li>Network finds the best conversion path</li>
          <li>Set maximum amount you're willing to send</li>
          <li>Recipient gets exact amount in their preferred asset</li>
          <li>Perfect for cross-currency payments</li>
        </ul>
      </div>
    </div>
  );
};

export default PathPaymentManager;
