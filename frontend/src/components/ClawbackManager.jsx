import React, { useState, useEffect } from 'react';
import advancedService from '../services/advancedService';

/**
 * Clawback Management Component
 * Allows issuers to manage account authorizations and clawback credits
 */
const ClawbackManager = () => {
  const [activeTab, setActiveTab] = useState('clawback'); // clawback, authorize, history
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [clawbackHistory, setClawbackHistory] = useState([]);

  // Form states
  const [clawbackForm, setClawbackForm] = useState({
    accountPublicKey: '',
    amount: '',
    reason: ''
  });

  const [authorizeForm, setAuthorizeForm] = useState({
    accountPublicKey: '',
    reason: ''
  });

  // Load clawback history on mount
  useEffect(() => {
    if (activeTab === 'history') {
      loadClawbackHistory();
    }
  }, [activeTab]);

  const loadClawbackHistory = async () => {
    try {
      setLoading(true);
      const data = await advancedService.getClawbackHistory();
      setClawbackHistory(data.clawbacks || []);
    } catch (err) {
      setError('Failed to load clawback history');
    } finally {
      setLoading(false);
    }
  };

  const handleClawback = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.clawbackCredits(
        clawbackForm.accountPublicKey,
        parseFloat(clawbackForm.amount),
        clawbackForm.reason
      );

      setSuccess(`Successfully clawed back ${clawbackForm.amount} credits. TX: ${result.transactionHash.substring(0, 8)}...`);
      setClawbackForm({ accountPublicKey: '', amount: '', reason: '' });
      
      // Refresh history
      loadClawbackHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Clawback failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.authorizeAccount(
        authorizeForm.accountPublicKey,
        authorizeForm.reason
      );

      setSuccess(`Account authorized successfully. TX: ${result.transactionHash.substring(0, 8)}...`);
      setAuthorizeForm({ accountPublicKey: '', reason: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (publicKey) => {
    const reason = prompt('Enter reason for revoking authorization:');
    if (!reason) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.revokeAuthorization(publicKey, reason);
      setSuccess(`Authorization revoked. TX: ${result.transactionHash.substring(0, 8)}...`);
    } catch (err) {
      setError(err.response?.data?.message || 'Revocation failed');
    } finally {
      setLoading(false);
    }
  };

  const enableControls = async () => {
    if (!confirm('Enable asset controls? This will set AUTH_REQUIRED, AUTH_REVOCABLE, and CLAWBACK_ENABLED flags.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.enableAssetControls();
      setSuccess('Asset controls enabled successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable controls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clawback-manager">
      <div className="header">
        <h2>🛡️ Advanced Asset Management</h2>
        <p className="subtitle">Manage account authorizations and clawback operations</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'clawback' ? 'active' : ''}`}
          onClick={() => setActiveTab('clawback')}
        >
          Clawback Credits
        </button>
        <button
          className={`tab ${activeTab === 'authorize' ? 'active' : ''}`}
          onClick={() => setActiveTab('authorize')}
        >
          Authorize Accounts
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className="tab tab-action"
          onClick={enableControls}
          disabled={loading}
        >
          ⚙️ Enable Controls
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⛔</span>
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">
        {/* Clawback Tab */}
        {activeTab === 'clawback' && (
          <div className="card">
            <h3>Clawback Credits</h3>
            <p className="card-description">
              Remove credits from an account (fraud prevention, expired credits, etc.)
            </p>

            <form onSubmit={handleClawback}>
              <div className="form-group">
                <label>Account Public Key</label>
                <input
                  type="text"
                  placeholder="G..."
                  value={clawbackForm.accountPublicKey}
                  onChange={(e) => setClawbackForm({ ...clawbackForm, accountPublicKey: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={clawbackForm.amount}
                  onChange={(e) => setClawbackForm({ ...clawbackForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason</label>
                <select
                  value={clawbackForm.reason}
                  onChange={(e) => setClawbackForm({ ...clawbackForm, reason: e.target.value })}
                  required
                >
                  <option value="">Select reason...</option>
                  <option value="fraud">Fraudulent Activity</option>
                  <option value="expired">Credits Expired</option>
                  <option value="violation">Terms Violation</option>
                  <option value="error">Administrative Error</option>
                  <option value="refund">Refund</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {clawbackForm.reason === 'other' && (
                <div className="form-group">
                  <label>Custom Reason</label>
                  <textarea
                    placeholder="Explain the reason for clawback..."
                    onChange={(e) => setClawbackForm({ ...clawbackForm, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-danger" disabled={loading}>
                {loading ? 'Processing...' : '🚨 Clawback Credits'}
              </button>
            </form>
          </div>
        )}

        {/* Authorize Tab */}
        {activeTab === 'authorize' && (
          <div className="card">
            <h3>Authorize Account</h3>
            <p className="card-description">
              Grant permission for an account to receive EDUPASS credits
            </p>

            <form onSubmit={handleAuthorize}>
              <div className="form-group">
                <label>Account Public Key</label>
                <input
                  type="text"
                  placeholder="G..."
                  value={authorizeForm.accountPublicKey}
                  onChange={(e) => setAuthorizeForm({ ...authorizeForm, accountPublicKey: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Verified student account"
                  value={authorizeForm.reason}
                  onChange={(e) => setAuthorizeForm({ ...authorizeForm, reason: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Processing...' : '✅ Authorize Account'}
              </button>
            </form>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card">
            <h3>Clawback History</h3>
            <p className="card-description">
              View all clawback operations
            </p>

            {loading ? (
              <div className="loading">Loading history...</div>
            ) : clawbackHistory.length === 0 ? (
              <div className="empty-state">
                <p>No clawback operations yet</p>
              </div>
            ) : (
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>From Account</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>By</th>
                      <th>TX Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clawbackHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                        <td className="mono">{item.stellar_public_key?.substring(0, 8)}...</td>
                        <td className="amount">{item.amount}</td>
                        <td>
                          <span className="reason-badge">
                            {advancedService.formatClawbackReason(item.reason)}
                          </span>
                        </td>
                        <td>{item.issuer_name}</td>
                        <td>
                          <a
                            href={advancedService.getClawbackExplorerUrl(item.transaction_hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            {item.transaction_hash.substring(0, 8)}...
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .clawback-manager {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          margin-bottom: 30px;
        }

        .header h2 {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .subtitle {
          color: #6c757d;
          font-size: 14px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 0;
        }

        .tab {
          padding: 12px 20px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6c757d;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #495057;
        }

        .tab.active {
          color: #0d6efd;
          border-bottom-color: #0d6efd;
        }

        .tab-action {
          margin-left: auto;
          color: #0d6efd;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-error {
          background: #f8d7da;
          color: #842029;
          border: 1px solid #f5c2c7;
        }

        .alert-success {
          background: #d1e7dd;
          color: #0f5132;
          border: 1px solid #badbcc;
        }

        .alert-icon {
          font-size: 20px;
        }

        .alert-close {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .card h3 {
          margin-bottom: 8px;
        }

        .card-description {
          color: #6c757d;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #0d6efd;
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #0d6efd;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0b5ed7;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #bb2d3b;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }

        .history-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 12px;
          background: #f8f9fa;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 2px solid #dee2e6;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
          font-size: 14px;
        }

        .mono {
          font-family: monospace;
        }

        .amount {
          font-weight: 600;
        }

        .reason-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          background: #f8f9fa;
          font-size: 12px;
        }

        .tx-link {
          color: #0d6efd;
          text-decoration: none;
        }

        .tx-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default ClawbackManager;
