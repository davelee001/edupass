import React from 'react';
import { useSoroban, usePendingTransactions } from '../hooks/useSoroban';

/**
 * Component to display Soroban network health status
 */
const SorobanStatus = ({ showDetails = false }) => {
  const { health, isHealthy, checkHealth } = useSoroban();
  const { transactions, count } = usePendingTransactions();

  if (!health) {
    return null;
  }

  return (
    <div className="soroban-status">
      {/* Health Indicator */}
      <div className={`health-indicator ${isHealthy ? 'healthy' : 'unhealthy'}`}>
        <div className="status-dot" />
        <span className="status-text">
          {isHealthy ? 'Network Connected' : 'Network Issue'}
        </span>
        <button
          onClick={checkHealth}
          className="refresh-btn"
          title="Refresh status"
        >
          ↻
        </button>
      </div>

      {/* Pending Transactions */}
      {count > 0 && (
        <div className="pending-transactions">
          <span className="pending-count">{count}</span>
          <span className="pending-text">
            {count === 1 ? 'transaction pending' : 'transactions pending'}
          </span>
        </div>
      )}

      {/* Detailed View */}
      {showDetails && health.details && (
        <div className="health-details">
          <div className="detail-item">
            <span className="detail-label">Network:</span>
            <span className="detail-value">{health.details.network}</span>
          </div>
          {health.details.latestLedger && (
            <div className="detail-item">
              <span className="detail-label">Latest Ledger:</span>
              <span className="detail-value">{health.details.latestLedger}</span>
            </div>
          )}
          {health.details.totalIssued !== undefined && (
            <div className="detail-item">
              <span className="detail-label">Total Issued:</span>
              <span className="detail-value">
                {(health.details.totalIssued / 10000000).toFixed(2)} Credits
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pending Transaction List */}
      {showDetails && transactions.length > 0 && (
        <div className="transaction-list">
          <h4>Pending Transactions</h4>
          {transactions.map((tx) => (
            <div key={tx.hash} className="transaction-item">
              <span className="tx-type">{tx.type}</span>
              <span className="tx-hash" title={tx.hash}>
                {tx.hash.substring(0, 8)}...
              </span>
              <span className="tx-time">
                {Math.floor((Date.now() - tx.timestamp) / 1000)}s ago
              </span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .soroban-status {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 8px 0;
        }

        .health-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .healthy .status-dot {
          background: #10b981;
        }

        .unhealthy .status-dot {
          background: #ef4444;
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
        }

        .refresh-btn {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.2s;
        }

        .refresh-btn:hover {
          transform: rotate(180deg);
        }

        .pending-transactions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 8px;
          background: #fff3cd;
          border-radius: 4px;
        }

        .pending-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          background: #ffc107;
          color: #000;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          padding: 0 8px;
        }

        .pending-text {
          font-size: 13px;
          color: #856404;
        }

        .health-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #dee2e6;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
        }

        .detail-label {
          color: #6c757d;
        }

        .detail-value {
          font-weight: 500;
        }

        .transaction-list {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #dee2e6;
        }

        .transaction-list h4 {
          font-size: 14px;
          margin: 0 0 8px 0;
          color: #495057;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: white;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .tx-type {
          font-weight: 600;
          text-transform: capitalize;
          color: #0d6efd;
        }

        .tx-hash {
          font-family: monospace;
          color: #6c757d;
        }

        .tx-time {
          margin-left: auto;
          color: #6c757d;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default SorobanStatus;
