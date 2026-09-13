import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Lock,
  TrendingUp,
  Coins,
  Gift,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Info,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Card, CardHeader } from '../ui/Card.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { Input } from '../ui/Input.js';
import { Alert } from '../ui/Alert.js';
import { formatMoney } from '../../utils/money.js';
import { WalletBalancesDto, LedgerTransaction } from '../../types/finance.js';
import { UserWithdrawalModal } from './UserWithdrawalModal.js';
import { CryptoDepositModal } from '../crypto/CryptoDepositModal.js';
import { CryptoWithdrawalModal } from '../crypto/CryptoWithdrawalModal.js';

interface WalletResponse {
  wallet: {
    id: number;
    uuid: string;
    currency: string;
    status: string;
    balances: WalletBalancesDto;
  };
  recent_transactions: Array<{
    id: number;
    uuid: string;
    transaction_reference: string;
    transaction_type: string;
    amount: string;
    currency: string;
    status: string;
    description: string;
    created_at: string;
    posted_at: string | null;
  }>;
}

export const UserWalletView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState<WalletResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [cryptoDepositModalOpen, setCryptoDepositModalOpen] = useState(false);
  const [cryptoWithdrawModalOpen, setCryptoWithdrawModalOpen] = useState(false);
  const [lockAction, setLockAction] = useState<'LOCK' | 'UNLOCK'>('LOCK');
  const [lockAmount, setLockAmount] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [lockSubmitting, setLockSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchWallet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || localStorage.getItem('apex_session_token');
      const res = await fetch('/api/v1/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load wallet');
      }
      setWalletData(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleLockUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockAmount || Number(lockAmount) <= 0) return;

    try {
      setLockSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('apex_session_token');
      const endpoint = lockAction === 'LOCK' ? '/api/v1/wallet/lock' : '/api/v1/wallet/unlock';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: lockAmount,
          currency: walletData?.wallet.currency || 'USD',
          reason: lockReason || `User ${lockAction.toLowerCase()} request`,
          idempotency_key: `client_${lockAction.toLowerCase()}_${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to ${lockAction.toLowerCase()} funds`);
      }

      setActionSuccessMessage(data.message || `Funds successfully ${lockAction.toLowerCase()}ed`);
      setLockModalOpen(false);
      setLockAmount('');
      setLockReason('');
      fetchWallet(true);

      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLockSubmitting(false);
    }
  };

  const balances = walletData?.wallet.balances;
  const currency = walletData?.wallet.currency || 'USD';

  // Filtered transactions
  const transactions = (walletData?.recent_transactions || []).filter(tx => {
    if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transaction_reference.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.transaction_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-left" id="user-wallet-container">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Financial Wallet</h2>
            <Badge variant="success" size="sm" className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Double-Entry Verified
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative multi-account balance derived from immutable financial ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchWallet(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            id="wallet-refresh-btn"
          >
            Refresh Balances
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLockAction('LOCK');
              setLockModalOpen(true);
            }}
            id="wallet-lock-btn"
          >
            Lock Funds
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLockAction('UNLOCK');
              setLockModalOpen(true);
            }}
            id="wallet-unlock-btn"
          >
            Unlock Funds
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCryptoDepositModalOpen(true)}
            leftIcon={<Wallet className="w-4 h-4" />}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md shadow-indigo-500/20"
            id="wallet-crypto-deposit-btn"
          >
            Deposit Crypto
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCryptoWithdrawModalOpen(true)}
            leftIcon={<ArrowUpRight className="w-4 h-4" />}
            id="wallet-crypto-withdraw-btn"
          >
            Crypto Payout
          </Button>
        </div>
      </div>

      {actionSuccessMessage && (
        <Alert type="success" title="Transaction Posted">
          {actionSuccessMessage}
        </Alert>
      )}

      {error && (
        <Alert type="error" title="Ledger Operation Failed">
          {error}
        </Alert>
      )}

      {/* Primary Total Balance Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border border-indigo-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-indigo-400" /> Total Net Portfolio Value
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white" id="wallet-total-balance">
              {loading ? '---' : formatMoney(balances?.total || '0.00000000', { currency })}
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-200/80">
              <span>Status: <strong className="text-emerald-400">{walletData?.wallet.status || 'ACTIVE'}</strong></span>
              <span>•</span>
              <span>Primary Currency: <strong>{currency}</strong></span>
              <span>•</span>
              <span>Last Reconciled: <strong>{balances?.last_reconciled_at ? new Date(balances.last_reconciled_at).toLocaleTimeString() : 'Just now'}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 shrink-0">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
              <span className="text-[11px] text-slate-300 block mb-0.5">Available for Use</span>
              <span className="text-lg font-bold font-mono text-emerald-400" id="wallet-available-balance-summary">
                {loading ? '---' : formatMoney(balances?.available || '0.00000000', { currency })}
              </span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
              <span className="text-[11px] text-slate-300 block mb-0.5">Currently Locked</span>
              <span className="text-lg font-bold font-mono text-amber-400" id="wallet-locked-balance-summary">
                {loading ? '---' : formatMoney(balances?.locked || '0.00000000', { currency })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Distinct Sub-Account Balance Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="wallet-balances-grid">
        {/* Available */}
        <Card className="p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between" id="card-balance-available">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Available
              </span>
              <Badge variant="success" size="sm">Liquid</Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono" id="balance-val-available">
              {formatMoney(balances?.available || '0.00000000', { currency })}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 leading-tight">
            Can be withdrawn or used immediately across all platform features.
          </p>
        </Card>

        {/* Locked */}
        <Card className="p-4 border-l-4 border-l-amber-500 flex flex-col justify-between" id="card-balance-locked">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Locked
              </span>
              <Badge variant="warning" size="sm">Escrow</Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono" id="balance-val-locked">
              {formatMoney(balances?.locked || '0.00000000', { currency })}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 leading-tight">
            Committed to pending operations, withdrawal requests, or active game bets.
          </p>
        </Card>

        {/* Investment */}
        <Card className="p-4 border-l-4 border-l-indigo-500 flex flex-col justify-between" id="card-balance-investment">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Investment
              </span>
              <Badge variant="info" size="sm">Active</Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono" id="balance-val-investment">
              {formatMoney(balances?.investment || '0.00000000', { currency })}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 leading-tight">
            Currently allocated to active institutional and multi-asset investment plans.
          </p>
        </Card>

        {/* Staking */}
        <Card className="p-4 border-l-4 border-l-violet-500 flex flex-col justify-between" id="card-balance-staking">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-violet-600" /> Staking
              </span>
              <Badge variant="neutral" size="sm">Yield</Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono" id="balance-val-staking">
              {formatMoney(balances?.staking || '0.00000000', { currency })}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 leading-tight">
            Currently locked in proof-of-stake validator pools earning network rewards.
          </p>
        </Card>

        {/* Bonus */}
        <Card className="p-4 border-l-4 border-l-pink-500 flex flex-col justify-between" id="card-balance-bonus">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-pink-600" /> Bonus
              </span>
              <Badge variant="warning" size="sm">Terms</Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono" id="balance-val-bonus">
              {formatMoney(balances?.bonus || '0.00000000', { currency })}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 leading-tight">
            Promotional incentive funds subject to turnover and wagering milestones.
          </p>
        </Card>
      </div>

      {/* Transactions Journal & Filtering */}
      <Card className="p-5 space-y-4" id="wallet-transactions-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Ledger Transactions</h3>
            <p className="text-xs text-slate-500">Every movement is recorded as an immutable double-entry ledger record</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Types</option>
              <option value="LOCK_FUNDS">Lock Funds</option>
              <option value="UNLOCK_FUNDS">Unlock Funds</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="REVERSAL">Reversal</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSTED">POSTED</option>
              <option value="PENDING">PENDING</option>
              <option value="REVERSED">REVERSED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="p-3">Reference ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Date & Time</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    No financial ledger transactions found for this account.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                      {tx.transaction_reference}
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="p-3 font-sans max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {tx.description}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatMoney(tx.amount, { currency: tx.currency })}
                    </td>
                    <td className="p-3 text-center font-sans">
                      <Badge
                        variant={
                          tx.status === 'POSTED'
                            ? 'success'
                            : tx.status === 'REVERSED'
                            ? 'danger'
                            : tx.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-slate-500 font-sans text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTx(tx)}
                        className="text-xs h-7 px-2"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title="Transaction Details"
          description={`Reference: ${selectedTx.transaction_reference}`}
        >
          <div className="space-y-4 text-xs text-left" id="transaction-detail-modal">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 font-sans">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Type</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedTx.transaction_type}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                <p className="mt-0.5">
                  <Badge variant={selectedTx.status === 'POSTED' ? 'success' : 'warning'} size="sm">
                    {selectedTx.status}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Nominal Amount</span>
                <p className="font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {formatMoney(selectedTx.amount, { currency: selectedTx.currency })}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Effective Fee</span>
                <p className="font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                  $0.00000000 USD
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Created Timestamp</span>
                <p className="font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                  {new Date(selectedTx.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Posted Timestamp</span>
                <p className="font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                  {selectedTx.posted_at ? new Date(selectedTx.posted_at).toLocaleString() : 'Immediate'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Description / Memo</span>
              <p className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200">
                {selectedTx.description}
              </p>
            </div>

            <Alert type="info">
              Protected Financial Ledger: Normal user accounts inspect sanitized transaction summaries. Raw internal debit/credit double-entry books are reserved for regulatory administrators.
            </Alert>

            <Button variant="primary" size="sm" className="w-full" onClick={() => setSelectedTx(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Lock / Unlock Funds Modal */}
      {lockModalOpen && (
        <Modal
          isOpen={lockModalOpen}
          onClose={() => setLockModalOpen(false)}
          title={lockAction === 'LOCK' ? 'Lock Funds into Escrow' : 'Unlock Funds from Escrow'}
          description={
            lockAction === 'LOCK'
              ? 'Transfer funds from Available to Locked balance via double-entry ledger'
              : 'Transfer funds from Locked back to Available balance via double-entry ledger'
          }
        >
          <form onSubmit={handleLockUnlock} className="space-y-4 text-xs text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">
                {lockAction === 'LOCK' ? 'Available Balance:' : 'Locked Balance:'}
              </span>
              <strong className="font-mono text-sm text-slate-900 dark:text-white">
                {lockAction === 'LOCK'
                  ? formatMoney(balances?.available || '0.00000000', { currency })
                  : formatMoney(balances?.locked || '0.00000000', { currency })}
              </strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({currency})
              </label>
              <Input
                type="number"
                step="0.00000001"
                min="0.00000001"
                placeholder="0.00"
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Note
              </label>
              <Input
                placeholder="e.g. Allocation for escrow or trade guarantee"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-1/2"
                onClick={() => setLockModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-1/2"
                isLoading={lockSubmitting}
              >
                Confirm {lockAction === 'LOCK' ? 'Lock' : 'Unlock'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <UserWithdrawalModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onSuccess={() => fetchWallet(true)}
        availableBalance={balances?.available || '0'}
        currency={currency}
      />

      <CryptoDepositModal
        isOpen={cryptoDepositModalOpen}
        onClose={() => setCryptoDepositModalOpen(false)}
        onDepositFinalized={() => fetchWallet(true)}
      />

      <CryptoWithdrawalModal
        isOpen={cryptoWithdrawModalOpen}
        onClose={() => setCryptoWithdrawModalOpen(false)}
        onSuccess={() => fetchWallet(true)}
        availableBalance={balances?.available || '0'}
        currency={currency}
      />
    </div>
  );
};
