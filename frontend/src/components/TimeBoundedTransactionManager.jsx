import { useState } from 'react';
import phase3Service from '../services/phase3Service';

const TimeBoundedTransactionManager = () => {
  const [formData, setFormData] = useState({
    destinationPublicKey: '',
    amount: '',
    expiresInMinutes: 60,
    validAfterMinutes: 0,
    memo: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await phase3Service.createTimeBoundedTransaction(
        formData.destinationPublicKey,
        parseFloat(formData.amount),
        parseInt(formData.expiresInMinutes),
        parseInt(formData.validAfterMinutes),
        formData.memo
      );

      setResult(response);
      
      // Reset form
      setFormData({
        destinationPublicKey: '',
        amount: '',
        expiresInMinutes: 60,
        validAfterMinutes: 0,
        memo: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to create time-bounded transaction');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'No expiration';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">
        ⏰ Time-Bounded Transactions
      </h2>
      
      <p className="text-gray-600 mb-6">
        Create transactions that automatically expire after a set time. Perfect for time-sensitive payments.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destination Public Key
          </label>
          <input
            type="text"
            name="destinationPublicKey"
            value={formData.destinationPublicKey}
            onChange={handleChange}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (EDUPASS)
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              placeholder="100.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires In (minutes, 0 = no expiration)
            </label>
            <input
              type="number"
              name="expiresInMinutes"
              value={formData.expiresInMinutes}
              onChange={handleChange}
              min="0"
              placeholder="60"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valid After (minutes, 0 = immediately)
          </label>
          <input
            type="number"
            name="validAfterMinutes"
            value={formData.validAfterMinutes}
            onChange={handleChange}
            min="0"
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Transaction will not be valid until this time has passed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Memo (optional)
          </label>
          <input
            type="text"
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            placeholder="Time-sensitive payment"
            maxLength="28"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Transaction...' : 'Create Time-Bounded Transaction'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">✅ Transaction Created</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Transaction Hash:</strong>{' '}
              <code className="text-xs bg-white px-2 py-1 rounded">
                {result.transactionHash}
              </code>
            </p>
            
            {result.validAfter && (
              <p>
                <strong>Valid After:</strong> {formatTime(result.validAfter)}
              </p>
            )}
            
            {result.expiresAt && (
              <p>
                <strong>Expires At:</strong> {formatTime(result.expiresAt)}
              </p>
            )}
            
            {!result.expiresAt && (
              <p className="text-gray-600">
                <strong>Note:</strong> This transaction has no expiration
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ About Time-Bounded Transactions</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Transactions automatically expire after the set time</li>
          <li>Useful for time-sensitive payments and offers</li>
          <li>Can set both minimum and maximum validity times</li>
          <li>Expired transactions cannot be submitted to the network</li>
        </ul>
      </div>
    </div>
  );
};

export default TimeBoundedTransactionManager;
