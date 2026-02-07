import React, { useState, useEffect } from 'react';
import advancedService from '../services/advancedService';

/**
 * Multi-Signature Transaction Manager
 * Manage signers, thresholds, and approve multi-sig transactions
 */
const MultiSigManager = () => {
  const [activeTab, setActiveTab] = useState('pending'); // pending, signers, create
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [signers, setSigners] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [signerForm, setSignerForm] = useState({
    publicKey: '',
    weight: '1'
  });

  const [thresholdForm, setThresholdForm] = useState({
    low: '1',
    medium: '2',
    high: '3'
  });

  const [txForm, setTxForm] = useState({
    type: 'issue_credits',
    recipientPublicKey: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    // Load current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);

    // Load data based on active tab
    if (activeTab === 'pending') {
      loadPendingTransactions();
    } else if (activeTab === 'signers') {
      loadSigners();
    }
  }, [activeTab]);

  const loadPendingTransactions = async () => {
    try {
      setLoading(true);
      const data = await advancedService.getPendingMultiSigTransactions();
      setPendingTransactions(data.transactions || []);
    } catch (err) {
      setError('Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadSigners = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const data = await advancedService.getSigners(user.stellar_public_key);
      setSigners(data.signers || []);
    } catch (err) {
      setError('Failed to load signers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSigner = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.addSigner(
        signerForm.publicKey,
        parseInt(signerForm.weight)
      );

      setSuccess(`Signer added successfully! TX: ${result.transactionHash.substring(0, 8)}...`);
      setSignerForm({ publicKey: '', weight: '1' });
      loadSigners();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add signer');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSigner = async (publicKey) => {
    if (!confirm(`Remove signer ${publicKey.substring(0, 8)}...?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.removeSigner(publicKey);
      setSuccess(`Signer removed! TX: ${result.transactionHash.substring(0, 8)}...`);
      loadSigners();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove signer');
    } finally {
      setLoading(false);
    }
  };

  const handleSetThresholds = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.setThresholds(
        parseInt(thresholdForm.low),
        parseInt(thresholdForm.medium),
        parseInt(thresholdForm.high)
      );

      setSuccess(`Thresholds updated! TX: ${result.transactionHash.substring(0, 8)}...`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update thresholds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.createMultiSigTransaction(
        txForm.type,
        {
          recipient: txForm.recipientPublicKey,
          amount: parseFloat(txForm.amount)
        },
        txForm.description
      );

      setSuccess(`Multi-sig transaction created! ID: ${result.transactionId}`);
      setTxForm({ type: 'issue_credits', recipientPublicKey: '', amount: '', description: '' });
      setActiveTab('pending');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleSignTransaction = async (transactionId) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.signTransaction(transactionId);
      setSuccess(`Transaction signed! ${result.autoSubmitted ? 'Auto-submitted to network.' : 'Waiting for more signatures.'}`);
      loadPendingTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransaction = async (transactionId) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await advancedService.submitMultiSigTransaction(transactionId);
      setSuccess(`Transaction submitted! TX Hash: ${result.transactionHash.substring(0, 8)}...`);
      loadPendingTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit transaction');
    } finally {
      setLoading(false);
    }
  };

  const hasUserSigned = (transaction) => {
    if (!currentUser?.stellar_public_key) return false;
    return transaction.signatures?.some(
      sig => sig.signer_public_key === currentUser.stellar_public_key
    );
  };

  const meetsThreshold = (transaction) => {
    return advancedService.meetsThreshold(transaction);
  };

  return (
    <div className="multisig-manager">
      <div className="header">
        <h2>🔐 Multi-Signature Management</h2>
        <p className="subtitle">Manage signers and approve high-value transactions</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Transactions
          {pendingTransactions.length > 0 && (
            <span className="badge">{pendingTransactions.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'signers' ? 'active' : ''}`}
          onClick={() => setActiveTab('signers')}
        >
          Manage Signers
        </button>
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Transaction
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
        {/* Pending Transactions Tab */}
        {activeTab === 'pending' && (
          <div className="card">
            <h3>Pending Multi-Sig Transactions</h3>
            <p className="card-description">
              Transactions requiring multiple signatures before execution
            </p>

            {loading ? (
              <div className="loading">Loading transactions...</div>
            ) : pendingTransactions.length === 0 ? (
              <div className="empty-state">
                <p>No pending transactions</p>
              </div>
            ) : (
              <div className="transactions-list">
                {pendingTransactions.map((tx) => (
                  <div key={tx.id} className="transaction-card">
                    <div className="tx-header">
                      <div>
                        <span className="tx-type">{tx.transaction_type}</span>
                        <h4>{tx.description}</h4>
                      </div>
                      <div className="tx-status">
                        {meetsThreshold(tx) ? (
                          <span className="status-ready">✅ Ready</span>
                        ) : (
                          <span className="status-pending">⏳ Pending</span>
                        )}
                      </div>
                    </div>

                    <div className="tx-details">
                      <div className="detail-row">
                        <span className="label">Created:</span>
                        <span>{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Created By:</span>
                        <span>{tx.created_by_name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Signatures:</span>
                        <span>
                          {tx.signature_count || 0} / {advancedService.getRequiredSignatures(tx)}
                        </span>
                      </div>
                      {tx.metadata?.amount && (
                        <div className="detail-row">
                          <span className="label">Amount:</span>
                          <span className="amount">{tx.metadata.amount} EDUPASS</span>
                        </div>
                      )}
                    </div>

                    {tx.signatures && tx.signatures.length > 0 && (
                      <div className="signatures">
                        <p className="signatures-title">Signatures:</p>
                        <div className="signatures-list">
                          {tx.signatures.map((sig) => (
                            <div key={sig.id} className="signature-item">
                              <span className="signature-icon">✍️</span>
                              <span className="signature-name">{sig.signer_name}</span>
                              <span className="signature-time">
                                {new Date(sig.signed_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="tx-actions">
                      {!hasUserSigned(tx) && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleSignTransaction(tx.id)}
                          disabled={loading}
                        >
                          ✍️ Sign Transaction
                        </button>
                      )}
                      {meetsThreshold(tx) && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleSubmitTransaction(tx.id)}
                          disabled={loading}
                        >
                          🚀 Submit to Network
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Signers Tab */}
        {activeTab === 'signers' && (
          <div className="card">
            <h3>Manage Signers</h3>
            <p className="card-description">
              Add or remove authorized signers for multi-signature operations
            </p>

            {/* Add Signer Form */}
            <div className="subsection">
              <h4>Add New Signer</h4>
              <form onSubmit={handleAddSigner} className="inline-form">
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Signer Public Key (G...)"
                    value={signerForm.publicKey}
                    onChange={(e) => setSignerForm({ ...signerForm, publicKey: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <select
                    value={signerForm.weight}
                    onChange={(e) => setSignerForm({ ...signerForm, weight: e.target.value })}
                  >
                    <option value="1">Weight: 1</option>
                    <option value="2">Weight: 2</option>
                    <option value="3">Weight: 3</option>
                    <option value="5">Weight: 5</option>
                    <option value="10">Weight: 10</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Add Signer
                </button>
              </form>
            </div>

            {/* Set Thresholds Form */}
            <div className="subsection">
              <h4>Set Operation Thresholds</h4>
              <form onSubmit={handleSetThresholds} className="inline-form">
                <div className="form-group">
                  <label>Low</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={thresholdForm.low}
                    onChange={(e) => setThresholdForm({ ...thresholdForm, low: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Medium</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={thresholdForm.medium}
                    onChange={(e) => setThresholdForm({ ...thresholdForm, medium: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>High</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={thresholdForm.high}
                    onChange={(e) => setThresholdForm({ ...thresholdForm, high: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Update Thresholds
                </button>
              </form>
              <p className="hint">
                Low: payment ops | Medium: trustline ops | High: account ops
              </p>
            </div>

            {/* Current Signers List */}
            <div className="subsection">
              <h4>Current Signers</h4>
              {loading ? (
                <div className="loading">Loading signers...</div>
              ) : signers.length === 0 ? (
                <p>No additional signers configured</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Public Key</th>
                      <th>Weight</th>
                      <th>Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signers.map((signer) => (
                      <tr key={signer.id}>
                        <td className="mono">{signer.signer_public_key.substring(0, 12)}...</td>
                        <td>{signer.weight}</td>
                        <td>{new Date(signer.added_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleRemoveSigner(signer.signer_public_key)}
                            disabled={loading}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Create Transaction Tab */}
        {activeTab === 'create' && (
          <div className="card">
            <h3>Create Multi-Sig Transaction</h3>
            <p className="card-description">
              Create a transaction that requires multiple approvals
            </p>

            <form onSubmit={handleCreateTransaction}>
              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                  required
                >
                  <option value="issue_credits">Issue Credits</option>
                  <option value="large_transfer">Large Transfer</option>
                  <option value="account_merge">Account Merge</option>
                  <option value="set_options">Set Options</option>
                </select>
              </div>

              <div className="form-group">
                <label>Recipient Public Key</label>
                <input
                  type="text"
                  placeholder="G..."
                  value={txForm.recipientPublicKey}
                  onChange={(e) => setTxForm({ ...txForm, recipientPublicKey: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Brief description of this transaction..."
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : '🔐 Create Multi-Sig Transaction'}
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .multisig-manager {
          max-width: 1200px;
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
          position: relative;
        }

        .tab:hover {
          color: #495057;
        }

        .tab.active {
          color: #0d6efd;
          border-bottom-color: #0d6efd;
        }

        .badge {
          background: #dc3545;
          color: white;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 12px;
          margin-left: 8px;
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

        .subsection {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #dee2e6;
        }

        .subsection:last-child {
          border-bottom: none;
        }

        .subsection h4 {
          margin-bottom: 16px;
          font-size: 16px;
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

        .inline-form {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .inline-form .form-group {
          flex: 1;
          margin-bottom: 0;
        }

        .hint {
          margin-top: 8px;
          font-size: 12px;
          color: #6c757d;
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

        .btn-success {
          background: #198754;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #157347;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
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

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .transaction-card {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
        }

        .tx-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .tx-type {
          display: inline-block;
          padding: 4px 8px;
          background: #e7f3ff;
          color: #0d6efd;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .tx-header h4 {
          margin: 0;
          font-size: 16px;
        }

        .status-ready {
          color: #198754;
          font-weight: 600;
        }

        .status-pending {
          color: #ffc107;
          font-weight: 600;
        }

        .tx-details {
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f8f9fa;
          font-size: 14px;
        }

        .detail-row .label {
          color: #6c757d;
        }

        .amount {
          font-weight: 600;
          color: #0d6efd;
        }

        .signatures {
          margin: 16px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .signatures-title {
          font-size: 12px;
          font-weight: 600;
          color: #6c757d;
          margin-bottom: 8px;
        }

        .signatures-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .signature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .signature-icon {
          font-size: 16px;
        }

        .signature-name {
          font-weight: 600;
        }

        .signature-time {
          color: #6c757d;
          margin-left: auto;
          font-size: 12px;
        }

        .tx-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
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
      `}</style>
    </div>
  );
};

export default MultiSigManager;
