import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext.js';

export interface WalletContextType {
  balance: number;
  formattedBalance: string;
  currency: string;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<number>;
  deductBalance: (amount: number) => void;
  addWinBalance: (amount: number) => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(1000.00);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, sessionToken, user } = useAuth();

  const refreshBalance = useCallback(async (): Promise<number> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = sessionToken || localStorage.getItem('token') || localStorage.getItem('apex_token');
      if (!token) {
        setIsLoading(false);
        return balance;
      }

      const res = await fetch('/api/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch wallet ledger: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success && json.data?.wallet?.balances?.available !== undefined) {
        const avail = parseFloat(json.data.wallet.balances.available);
        if (!isNaN(avail)) {
          setBalance(avail);
          if (json.data.wallet.currency) {
            setCurrency(json.data.wallet.currency);
          }
          setIsLoading(false);
          return avail;
        }
      }
      setIsLoading(false);
      return balance;
    } catch (err: any) {
      console.error('[WalletContext] Failed to sync ledger balance:', err);
      setError(err?.message || 'Failed to sync wallet balance from server');
      setIsLoading(false);
      return balance;
    }
  }, [sessionToken, balance]);

  // Sync balance on mount, auth change, or user change
  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance();
    }
  }, [isAuthenticated, sessionToken, user?.id, refreshBalance]);

  // Sync on window focus to ensure fresh ledger state across tabs
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshBalance();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, refreshBalance]);

  const deductBalance = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  }, []);

  const addWinBalance = useCallback((amount: number) => {
    setBalance(prev => prev + amount);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const formattedBalance = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(balance);
  }, [balance, currency]);

  const value = useMemo(() => ({
    balance,
    formattedBalance,
    currency,
    isLoading,
    error,
    refreshBalance,
    deductBalance,
    addWinBalance,
    clearError
  }), [balance, formattedBalance, currency, isLoading, error, refreshBalance, deductBalance, addWinBalance, clearError]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
