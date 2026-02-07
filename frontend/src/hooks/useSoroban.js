import { useState, useEffect, useCallback } from 'react';
import sorobanService from '../services/sorobanService';

/**
 * Custom React hook for Soroban smart contract interactions
 * Provides loading states, error handling, and automatic retries
 */
export const useSoroban = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  /**
   * Check network health on mount
   */
  useEffect(() => {
    checkHealth();
  }, []);

  /**
   * Check Soroban network health
   */
  const checkHealth = useCallback(async () => {
    try {
      const status = await sorobanService.checkHealth();
      setHealth(status);
      return status;
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth({ healthy: false, error: err.message });
      return null;
    }
  }, []);

  /**
   * Execute a Soroban operation with loading state
   */
  const execute = useCallback(async (operation, ...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation(...args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Issue credits with automatic state management
   */
  const issueCredits = useCallback(async (beneficiaryId, amount, description, expiresAt) => {
    return execute(
      sorobanService.issueCredits.bind(sorobanService),
      beneficiaryId,
      amount,
      description,
      expiresAt
    );
  }, [execute]);

  /**
   * Transfer credits with automatic state management
   */
  const transferCredits = useCallback(async (toKey, amount, description) => {
    return execute(
      sorobanService.transferCredits.bind(sorobanService),
      toKey,
      amount,
      description
    );
  }, [execute]);

  /**
   * Burn credits with automatic state management
   */
  const burnCredits = useCallback(async (amount, schoolId, description) => {
    return execute(
      sorobanService.burnCredits.bind(sorobanService),
      amount,
      schoolId,
      description
    );
  }, [execute]);

  /**
   * Get balance with automatic state management
   */
  const getBalance = useCallback(async (publicKey) => {
    return execute(sorobanService.getBalance.bind(sorobanService), publicKey);
  }, [execute]);

  /**
   * Get allocation with automatic state management
   */
  const getAllocation = useCallback(async (publicKey) => {
    return execute(sorobanService.getAllocation.bind(sorobanService), publicKey);
  }, [execute]);

  /**
   * Get balance with allocation data
   */
  const getBalanceWithAllocation = useCallback(async (publicKey) => {
    return execute(
      sorobanService.getBalanceWithAllocation.bind(sorobanService),
      publicKey
    );
  }, [execute]);

  /**
   * Get total issued credits
   */
  const getTotalIssued = useCallback(async () => {
    return execute(sorobanService.getTotalIssued.bind(sorobanService));
  }, [execute]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    health,
    isHealthy: health?.healthy || false,

    // Operations
    issueCredits,
    transferCredits,
    burnCredits,
    getBalance,
    getAllocation,
    getBalanceWithAllocation,
    getTotalIssued,

    // Utilities
    checkHealth,
    clearError,
    getPendingTransactions: sorobanService.getAllPendingTransactions.bind(sorobanService),
    formatAmount: sorobanService.formatAmount.bind(sorobanService),
    isValidPublicKey: sorobanService.isValidPublicKey.bind(sorobanService),
    getExplorerUrl: sorobanService.getExplorerUrl.bind(sorobanService),
    isExpiringSoon: sorobanService.isExpiringSoon.bind(sorobanService),
  };
};

/**
 * Hook for tracking specific balance in real-time
 * Polls balance at specified interval
 */
export const useBalance = (publicKey, pollInterval = 30000) => {
  const [balance, setBalance] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;

    try {
      const data = await sorobanService.getBalanceWithAllocation(publicKey);
      setBalance(data.balance);
      setAllocation(data.allocation);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalance();

    if (pollInterval > 0) {
      const interval = setInterval(fetchBalance, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBalance, pollInterval]);

  return {
    balance,
    allocation,
    loading,
    error,
    refresh: fetchBalance,
    isExpired: allocation?.expiration ? new Date(allocation.expiration) < new Date() : false,
    isExpiringSoon: allocation?.expiration
      ? sorobanService.isExpiringSoon(allocation.expiration)
      : false,
  };
};

/**
 * Hook for monitoring pending transactions
 */
export const usePendingTransactions = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const updateTransactions = () => {
      setTransactions(sorobanService.getAllPendingTransactions());
    };

    // Update immediately
    updateTransactions();

    // Poll for updates
    const interval = setInterval(updateTransactions, 2000);
    return () => clearInterval(interval);
  }, []);

  return {
    transactions,
    count: transactions.length,
    hasPending: transactions.length > 0,
  };
};

export default useSoroban;
