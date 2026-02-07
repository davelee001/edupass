import React, { useState, useEffect } from 'react';
import { useBalance, useSoroban } from '../hooks/useSoroban';
import SorobanStatus from '../components/SorobanStatus';

/**
 * Example component demonstrating Soroban integration
 * Shows balance display, credit operations, and transaction tracking
 */
const SorobanExample = ({ userPublicKey, userRole }) => {
  const {
    loading,
    error,
    issueCredits,
    transferCredits,
    burnCredits,
    clearError,
    formatAmount,
    isValidPublicKey,
    getExplorerUrl,
  } = useSoroban();

  const {
    balance,
    allocation,
    loading: balanceLoading,
    refresh: refreshBalance,
    isExpired,
    isExpiringSoon,
  } = useBalance(userPublicKey);

  const [formData, setFormData] = useState({
    beneficiaryId: '',
    recipientKey: '',
    schoolId: '',
    amount: '',
    description: '',
    expiresAt: '',
  });

  const [lastTransaction, setLastTransaction] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleIssueCredits = async (e) => {
    e.preventDefault();
    clearError();

    try {
      const expiresAt = formData.expiresAt
        ? Math.floor(new Date(formData.expiresAt).getTime() / 1000)
        : null;

      const result = await issueCredits(
        formData.beneficiaryId,
        parseFloat(formData.amount),
        formData.description,
        expiresAt
      );

      setLastTransaction(result.transaction);
      refreshBalance();
      
      // Reset form
      setFormData({ ...formData, amount: '', description: '' });
    } catch (err) {
      console.error('Issue credits failed:', err);
    }
  };

  const handleTransferCredits = async (e) => {
    e.preventDefault();
    clearError();

    if (!isValidPublicKey(formData.recipientKey)) {
      alert('Invalid recipient public key');
      return;
    }

    try {
      const result = await transferCredits(
        formData.recipientKey,
        parseFloat(formData.amount),
        formData.description
      );

      setLastTransaction(result);
      refreshBalance();
      
      // Reset form
      setFormData({ ...formData, recipientKey: '', amount: '', description: '' });
    } catch (err) {
      console.error('Transfer failed:', err);
    }
  };

  const handleBurnCredits = async (e) => {
    e.preventDefault();
    clearError();

    try {
      const result = await burnCredits(
        parseFloat(formData.amount),
        formData.schoolId,
        formData.description
      );

      setLastTransaction(result);
      refreshBalance();
      
      // Reset form
      setFormData({ ...formData, amount: '', description: '' });
    } catch (err) {
      console.error('Burn failed:', err);
    }
  };

  return (
    <div className="soroban-example">
      <h2>Soroban Smart Contract Integration</h2>

      {/* Network Status */}
      <SorobanStatus showDetails={true} />

      {/* Balance Display */}
      <div className="balance-card">
        <h3>Your Balance</h3>
        {balanceLoading ? (
          <div className="loading">Loading balance...</div>
        ) : (
          <>
            <div className="balance-amount">
              {balance !== null ? formatAmount(balance, 2) : '0.00'} Credits
            </div>
            
            {allocation && (
              <div className="allocation-info">
                {allocation.purpose && (
                  <div className="info-item">
                    <span className="label">Purpose:</span>
                    <span>{allocation.purpose}</span>
                  </div>
                )}
                
                {allocation.expiration && (
                  <div className={`info-item ${isExpired ? 'expired' : isExpiringSoon ? 'expiring-soon' : ''}`}>
                    <span className="label">Expires:</span>
                    <span>{new Date(allocation.expiration).toLocaleDateString()}</span>
                    {isExpired && <span className="badge expired">Expired</span>}
                    {isExpiringSoon && !isExpired && <span className="badge warning">Expiring Soon</span>}
                  </div>
                )}
              </div>
            )}
            
            <button onClick={refreshBalance} className="refresh-btn-small">
              Refresh Balance
            </button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error.message}
          <button onClick={clearError} className="close-btn">×</button>
        </div>
      )}

      {/* Last Transaction */}
      {lastTransaction && (
        <div className="success-message">
          <strong>Transaction Successful!</strong>
          <div className="tx-hash">
            Hash: {lastTransaction.transactionHash || lastTransaction.hash}
          </div>
          <a
            href={getExplorerUrl(lastTransaction.transactionHash || lastTransaction.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
          >
            View on Stellar Explorer →
          </a>
        </div>
      )}

      {/* Issuer Actions */}
      {userRole === 'issuer' && (
        <div className="action-card">
          <h3>Issue Credits</h3>
          <form onSubmit={handleIssueCredits}>
            <input
              type="number"
              name="beneficiaryId"
              placeholder="Beneficiary ID"
              value={formData.beneficiaryId}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              step="0.01"
              name="amount"
              placeholder="Amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <input
              type="date"
              name="expiresAt"
              value={formData.expiresAt}
              onChange={handleInputChange}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Issue Credits'}
            </button>
          </form>
        </div>
      )}

      {/* Beneficiary Actions */}
      {userRole === 'beneficiary' && (
        <div className="action-card">
          <h3>Transfer Credits</h3>
          <form onSubmit={handleTransferCredits}>
            <input
              type="text"
              name="recipientKey"
              placeholder="Recipient Public Key (G...)"
              value={formData.recipientKey}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              step="0.01"
              name="amount"
              placeholder="Amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <button type="submit" disabled={loading || balance <= 0}>
              {loading ? 'Processing...' : 'Transfer Credits'}
            </button>
          </form>
        </div>
      )}

      {/* School Actions */}
      {userRole === 'school' && (
        <div className="action-card">
          <h3>Redeem Credits</h3>
          <form onSubmit={handleBurnCredits}>
            <input
              type="number"
              step="0.01"
              name="amount"
              placeholder="Amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="description"
              placeholder="Service description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Redeem Credits'}
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .soroban-example {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        h2 {
          color: #1a1a1a;
          margin-bottom: 20px;
        }

        h3 {
          color: #333;
          margin-bottom: 16px;
          font-size: 18px;
        }

        .balance-card,
        .action-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .balance-amount {
          font-size: 36px;
          font-weight: 700;
          color: #0d6efd;
          margin-bottom: 16px;
        }

        .allocation-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          font-size: 14px;
        }

        .info-item.expired {
          color: #dc3545;
        }

        .info-item.expiring-soon {
          color: #fd7e14;
        }

        .label {
          font-weight: 600;
          color: #6c757d;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-left: auto;
        }

        .badge.expired {
          background: #dc3545;
          color: white;
        }

        .badge.warning {
          background: #ffc107;
          color: #000;
        }

        .loading {
          color: #6c757d;
          font-style: italic;
        }

        .error-message {
          background: #f8d7da;
          border: 1px solid #f5c2c7;
          color: #842029;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .success-message {
          background: #d1e7dd;
          border: 1px solid #badbcc;
          color: #0f5132;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .tx-hash {
          font-family: monospace;
          font-size: 12px;
          margin: 8px 0;
        }

        .explorer-link {
          color: #0d6efd;
          text-decoration: none;
          font-weight: 500;
        }

        .explorer-link:hover {
          text-decoration: underline;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        input {
          padding: 12px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 14px;
        }

        input:focus {
          outline: none;
          border-color: #0d6efd;
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
        }

        button[type="submit"] {
          background: #0d6efd;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        button[type="submit"]:hover:not(:disabled) {
          background: #0b5ed7;
        }

        button[type="submit"]:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .refresh-btn-small {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn-small:hover {
          background: #e9ecef;
        }
      `}</style>
    </div>
  );
};

export default SorobanExample;
