import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Receipt,
  Scale,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Play,
  ArrowRight,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { Input } from '../ui/Input.js';
import { Alert } from '../ui/Alert.js';
import { formatMoney } from '../../utils/money.js';
import { ReconciliationReport, ManualAdjustmentRequest } from '../../types/finance.js';

// ============================================================================
// 1. ADMIN FINANCIAL OVERVIEW VIEW
// ============================================================================
export const AdminFinancialOverviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/financial/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch financial overview');
      setData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="space-y-6 text-left" id="admin-financial-overview">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Institutional Financial Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time aggregate platform balance sheets and double-entry ledger metrics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverview}
          isLoading={loading}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh Overview
        </Button>
      </div>

      {error && <Alert type="error" title="Data Sync Error">{error}</Alert>}

      {/* Aggregate Volume & Platform Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-indigo-600">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Total Platform Liabilities</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatMoney(data?.total_user_balances || '0')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total client deposits owed</span>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Total Ledger Volume</span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {formatMoney(data?.total_ledger_volume || '0')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Cumulative transactions posted</span>
        </Card>

        <Card className="p-5 border-l-4 border-l-sky-600">
          <span className="text-xs font-semibold text-slate-500 uppercase block">System Cash Assets</span>
          <div className="text-2xl font-black font-mono text-sky-600 mt-1">
            {formatMoney(data?.system_cash_balance || '0')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Vault & reserve accounts</span>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-600">
          <span className="text-xs font-semibold text-slate-500 uppercase block">System Clearing Account</span>
          <div className="text-2xl font-black font-mono text-amber-600 mt-1">
            {formatMoney(data?.system_clearing_balance || '0')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Transit and adjustment balance</span>
        </Card>
      </div>

      {/* User Balance Breakdown By Account Type */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Sub-Account Segregation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <Card className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 font-medium block">Total Available</span>
            <span className="text-lg font-bold font-mono text-emerald-600">
              {formatMoney(data?.available_balances || '0')}
            </span>
          </Card>

          <Card className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 font-medium block">Total Locked</span>
            <span className="text-lg font-bold font-mono text-amber-600">
              {formatMoney(data?.locked_balances || '0')}
            </span>
          </Card>

          <Card className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 font-medium block">Total In Investment</span>
            <span className="text-lg font-bold font-mono text-indigo-600">
              {formatMoney(data?.investment_balances || '0')}
            </span>
          </Card>

          <Card className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 font-medium block">Total In Staking</span>
            <span className="text-lg font-bold font-mono text-violet-600">
              {formatMoney(data?.staking_balances || '0')}
            </span>
          </Card>

          <Card className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 font-medium block">Total In Bonus</span>
            <span className="text-lg font-bold font-mono text-pink-600">
              {formatMoney(data?.bonus_balances || '0')}
            </span>
          </Card>
        </div>
      </div>

      {/* Transaction & Integrity Statistics */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Ledger Record Integrity Counters</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-xs text-slate-500 block">Total Ledger Txns</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {data?.total_transactions_count || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-xs text-slate-500 block">Posted Txns</span>
            <span className="text-xl font-bold font-mono text-emerald-600">
              {data?.posted_transactions_count || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-xs text-slate-500 block">Reversed Txns</span>
            <span className="text-xl font-bold font-mono text-amber-600">
              {data?.reversed_transactions_count || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-xs text-slate-500 block">Failed Txns</span>
            <span className="text-xl font-bold font-mono text-rose-600">
              {data?.failed_transactions_count || 0}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// 2. ADMIN TRANSACTION EXPLORER VIEW (Full Double-Entry Journal Viewer)
// ============================================================================
export const AdminTransactionExplorerView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Transaction Detail Modal
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (search) params.append('search', search);
      if (type !== 'ALL') params.append('type', type);
      if (status !== 'ALL') params.append('status', status);

      const res = await fetch(`/api/v1/admin/transactions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setTransactions(json.data.data || []);
        setTotal(json.data.pagination.total || 0);
      }
    } catch (err: unknown) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, type, status]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const viewTransactionDetails = async (txId: number) => {
    try {
      setModalLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/transactions/${txId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setSelectedTx(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left" id="admin-transaction-explorer">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Financial Transaction Explorer
          </h2>
          <p className="text-xs text-slate-500">
            Administrative double-entry ledger books and full transaction journals
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTransactions}
          isLoading={loading}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh List
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Search Reference / Memo</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="TXN-2026..., idempotency key..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Transaction Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Types</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="LOCK_FUNDS">LOCK_FUNDS</option>
              <option value="UNLOCK_FUNDS">UNLOCK_FUNDS</option>
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="REVERSAL">REVERSAL</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Posting Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSTED">POSTED</option>
              <option value="REVERSED">REVERSED</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Nominal Amount</th>
                <th className="p-3 text-center">Entries</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Created</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    No transactions match current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {tx.transaction_reference}
                    </td>
                    <td className="p-3 font-sans">
                      <Badge variant="neutral" size="sm">{tx.transaction_type}</Badge>
                    </td>
                    <td className="p-3 font-sans max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {tx.description}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatMoney(tx.amount, { currency: tx.currency })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {tx.entries_count || 2} entries
                      </span>
                    </td>
                    <td className="p-3 text-center font-sans">
                      <Badge
                        variant={tx.status === 'POSTED' ? 'success' : tx.status === 'REVERSED' ? 'danger' : 'warning'}
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
                        onClick={() => viewTransactionDetails(tx.id)}
                        className="text-xs h-7 px-2"
                      >
                        Inspect Journal
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Double-Entry Journal Detail Modal */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title={`Double-Entry Journal: ${selectedTx.transaction_reference}`}
          description={`Txn ID #${selectedTx.id} • Posted ${selectedTx.posted_at ? new Date(selectedTx.posted_at).toLocaleString() : ''}`}
        >
          <div className="space-y-4 text-xs text-left" id="modal-journal-details">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Type</span>
                <strong className="text-slate-900 dark:text-white">{selectedTx.transaction_type}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                <Badge variant={selectedTx.status === 'POSTED' ? 'success' : 'danger'} size="sm">
                  {selectedTx.status}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Idempotency Key</span>
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate block">
                  {selectedTx.idempotency_key || 'None'}
                </span>
              </div>
            </div>

            {/* Complete Balanced Double-Entry Journal Table */}
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2">
                Double-Entry Ledger Book Entries (Debits = Credits)
              </h4>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2.5">Account Code</th>
                      <th className="p-2.5">Account Type</th>
                      <th className="p-2.5">Side</th>
                      <th className="p-2.5 text-right">Debit</th>
                      <th className="p-2.5 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono">
                    {selectedTx.entries?.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                          {e.account_code || `Account #${e.ledger_account_id}`}
                        </td>
                        <td className="p-2.5 font-sans text-slate-500 text-[11px]">
                          {e.account_type || '--'}
                        </td>
                        <td className="p-2.5 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            e.entry_type === 'DEBIT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {e.entry_type}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {e.entry_type === 'DEBIT' ? formatMoney(e.amount, { currency: e.currency }) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {e.entry_type === 'CREDIT' ? formatMoney(e.amount, { currency: e.currency }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Button variant="primary" size="sm" className="w-full" onClick={() => setSelectedTx(null)}>
              Close Explorer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================================
// 3. ADMIN RECONCILIATION & TEST SUITE PANEL
// ============================================================================
export const AdminReconciliationView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [testSuiteReport, setTestSuiteReport] = useState<any | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'RECON' | 'TESTS'>('RECON');

  const runReconciliation = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/reconciliation/run', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setReport(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runAutomatedTests = async () => {
    try {
      setTestRunning(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/financial/run-tests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setTestSuiteReport(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTestRunning(false);
    }
  };

  useEffect(() => {
    runReconciliation();
  }, []);

  return (
    <div className="space-y-6 text-left" id="admin-reconciliation-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Financial Reconciliation & Invariant Engine
          </h2>
          <p className="text-xs text-slate-500">
            9-Point continuous double-entry ledger balance auditor and automated verification suite
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runAutomatedTests}
            isLoading={testRunning}
            leftIcon={<Play className="w-4 h-4" />}
            id="btn-run-tests"
          >
            Run Invariant Test Suite
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={runReconciliation}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            id="btn-run-reconciliation"
          >
            Run Full Reconciliation
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-4">
        <button
          onClick={() => setActiveTab('RECON')}
          className={`pb-2 text-xs font-bold transition-colors ${
            activeTab === 'RECON'
              ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Reconciliation Audit (9 Invariants)
        </button>
        <button
          onClick={() => setActiveTab('TESTS')}
          className={`pb-2 text-xs font-bold transition-colors ${
            activeTab === 'TESTS'
              ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Automated Invariant Test Results ({testSuiteReport ? `${testSuiteReport.passed}/${testSuiteReport.total} Passed` : 'Click Run'})
        </button>
      </div>

      {activeTab === 'RECON' && report && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div className={`p-6 rounded-2xl border ${
            report.status === 'RECONCILIATION PASSED'
              ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/50 text-rose-300'
          } flex flex-col md:flex-row md:items-center justify-between gap-4`} id="reconciliation-status-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {report.status === 'RECONCILIATION PASSED' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-500" />
                )}
                <h3 className="text-xl font-black tracking-tight" id="reconciliation-status-text">
                  {report.status}
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Audited {report.total_transactions_checked} transactions, {report.total_entries_checked} entries, across {report.total_accounts_checked} ledger accounts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Invariants Verified</span>
                <span className="text-2xl font-black font-mono">
                  {report.invariants_passed} / {report.invariants_checked}
                </span>
              </div>
            </div>
          </div>

          {/* 9 Invariant Health Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 1, name: 'Every transaction balanced', passed: report.summary.unbalanced_transactions_count === 0 },
              { id: 2, name: 'Total Debits = Total Credits', passed: report.summary.total_debits === report.summary.total_credits },
              { id: 3, name: 'Valid accounts referenced', passed: !report.discrepancies.some(d => d.code === 'INV_3_INVALID_ACCOUNT') },
              { id: 4, name: 'Currencies strictly match', passed: !report.discrepancies.some(d => d.code === 'INV_4_CURRENCY_MISMATCH') },
              { id: 5, name: 'Wallet balances match ledger', passed: report.summary.mismatched_wallet_cache_count === 0 },
              { id: 6, name: 'No orphaned ledger entries', passed: !report.discrepancies.some(d => d.code === 'INV_6_ORPHANED_ENTRY') },
              { id: 7, name: 'Unique idempotency keys', passed: !report.discrepancies.some(d => d.code === 'INV_7_DUPLICATE_IDEMPOTENCY') },
              { id: 8, name: 'Zero/Negative amount rejection', passed: !report.discrepancies.some(d => d.code === 'INV_8_INVALID_AMOUNT') },
              { id: 9, name: 'Valid transaction references', passed: !report.discrepancies.some(d => d.code === 'INV_9_MISSING_TX_REF') }
            ].map(inv => (
              <div
                key={inv.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {inv.id}. {inv.name}
                </span>
                {inv.passed ? (
                  <Badge variant="success" size="sm">PASSED</Badge>
                ) : (
                  <Badge variant="danger" size="sm">FAILED</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Summary Figures */}
          <Card className="p-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">Reconciliation Ledger Proof</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-sans">Total Ledger Debits</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(report.summary.total_debits)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-sans">Total Ledger Credits</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(report.summary.total_credits)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-sans">User Liabilities</span>
                <span className="font-bold text-indigo-500">{formatMoney(report.summary.total_user_liabilities)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-sans">System Assets</span>
                <span className="font-bold text-emerald-500">{formatMoney(report.summary.total_system_assets)}</span>
              </div>
            </div>
          </Card>

          {/* Discrepancies (if any) */}
          {report.discrepancies.length > 0 && (
            <Card className="p-4 border-rose-500/40">
              <h4 className="text-xs font-bold text-rose-500 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Detected Discrepancies ({report.discrepancies.length})
              </h4>
              <div className="space-y-2">
                {report.discrepancies.map((d, i) => (
                  <div key={i} className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded text-xs text-rose-700 dark:text-rose-300 font-mono">
                    [{d.severity}] {d.code}: {d.description}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Automated Invariant Test Results */}
      {activeTab === 'TESTS' && (
        <div className="space-y-4">
          {!testSuiteReport ? (
            <Card className="p-8 text-center space-y-3">
              <Scale className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto" />
              <h4 className="font-bold text-slate-900 dark:text-white">Section 28 & 29 Invariant Test Suite</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Executes the generic ledger lifecycle (Clearing -&gt; Available -&gt; Lock -&gt; Unlock -&gt; Reversal) and negative assertion tests (negative amounts, zero amounts, unbalanced transactions, overdrafts, idempotency).
              </p>
              <Button variant="primary" size="sm" onClick={runAutomatedTests} isLoading={testRunning}>
                Run Invariant Test Suite
              </Button>
            </Card>
          ) : (
            <div className="space-y-4" id="test-suite-results">
              <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">Automated Test Execution Summary</h4>
                  <span className="text-xs text-slate-400">Executed at {new Date(testSuiteReport.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={testSuiteReport.allPassed ? 'success' : 'danger'} size="md">
                    {testSuiteReport.passed} / {testSuiteReport.total} Tests Passed
                  </Badge>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3">Test Case</th>
                      <th className="p-3">Suite</th>
                      <th className="p-3">Expected</th>
                      <th className="p-3">Actual Result</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {testSuiteReport.results.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                          {r.testName}
                        </td>
                        <td className="p-3 font-sans text-slate-500 text-[11px]">
                          {r.suite === 'SECTION_28_GENERIC_LIFECYCLE' ? 'Section 28 Lifecycle' : 'Section 29 Negative Test'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {r.expected}
                        </td>
                        <td className="p-3 text-slate-900 dark:text-white">
                          {r.actual}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <Badge variant={r.passed ? 'success' : 'danger'} size="sm">
                            {r.passed ? 'PASSED' : 'FAILED'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. ADMIN MANUAL ADJUSTMENT CONSOLE
// ============================================================================
export const AdminManualAdjustmentView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<ManualAdjustmentRequest[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // New Request Form State
  const [targetUserId, setTargetUserId] = useState('4');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [targetAccountType, setTargetAccountType] = useState<'USER_AVAILABLE' | 'USER_LOCKED' | 'USER_BONUS'>('USER_AVAILABLE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/adjustments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setAdjustments(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/adjustments/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: Number(targetUserId),
          amount,
          direction,
          target_account_type: targetAccountType,
          reason,
          currency: 'USD'
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Adjustment submission failed');

      setFeedback({ type: 'success', message: 'Adjustment request queued for review' });
      setRequestModalOpen(false);
      setAmount('');
      setReason('');
      fetchAdjustments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/admin/adjustments/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision_notes: 'Approved via Admin Governance Console' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Approval failed');

      setFeedback({ type: 'success', message: `Adjustment #${id} approved and posted to double-entry ledger!` });
      fetchAdjustments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleReject = async (id: number) => {
    const reasonPrompt = prompt('Enter rejection reason:');
    if (!reasonPrompt) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/admin/adjustments/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reasonPrompt })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Rejection failed');

      setFeedback({ type: 'success', message: `Adjustment #${id} rejected.` });
      fetchAdjustments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: msg });
    }
  };

  return (
    <div className="space-y-6 text-left" id="admin-manual-adjustments">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Manual Financial Adjustment Governance
          </h2>
          <p className="text-xs text-slate-500">
            Strict Request &rarr; Review &rarr; Approve &rarr; Post double-entry workflow. Direct balance editing is forbidden.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRequestModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            id="btn-request-adjustment"
          >
            Request Adjustment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdjustments}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert type={feedback.type} title={feedback.type === 'success' ? 'Action Completed' : 'Operation Failed'}>
          {feedback.message}
        </Alert>
      )}

      {/* Adjustments Queue Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Req ID</th>
                <th className="p-3">User Target</th>
                <th className="p-3">Target Sub-Account</th>
                <th className="p-3">Direction</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Reason / Justification</th>
                <th className="p-3">Requested By</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                    No manual adjustments have been requested yet.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-indigo-600">
                      #{adj.id}
                    </td>
                    <td className="p-3 font-sans">
                      <strong className="text-slate-900 dark:text-white">{adj.user_name}</strong>
                      <span className="block text-[11px] text-slate-400 font-mono">ID: {adj.user_id}</span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {adj.target_account_type}
                      </span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        adj.direction === 'CREDIT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {adj.direction}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatMoney(adj.amount, { currency: adj.currency })}
                    </td>
                    <td className="p-3 font-sans max-w-xs text-slate-600 dark:text-slate-300 truncate">
                      {adj.reason}
                    </td>
                    <td className="p-3 font-sans text-slate-500 text-[11px]">
                      {adj.requested_by_name}
                    </td>
                    <td className="p-3 text-center font-sans">
                      <Badge
                        variant={
                          adj.status === 'POSTED'
                            ? 'success'
                            : adj.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {adj.status}
                      </Badge>
                      {adj.ledger_transaction_id && (
                        <span className="block text-[10px] font-mono text-indigo-500 mt-0.5">
                          Txn #{adj.ledger_transaction_id}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-sans">
                      {adj.status === 'REQUESTED' ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(adj.id)}
                            className="text-xs h-7 px-2"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(adj.id)}
                            className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {adj.reviewed_by_name ? `By ${adj.reviewed_by_name}` : 'Settled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Request Adjustment Modal */}
      {requestModalOpen && (
        <Modal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          title="Request Manual Financial Adjustment"
          description="Submits an audited adjustment request. Requires authorized review before ledger posting."
        >
          <form onSubmit={handleCreateRequest} className="space-y-4 text-xs text-left" id="form-request-adjustment">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target User Account
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="4">User #4 - Sarah Jenkins (sarah.jenkins@example.com)</option>
                <option value="5">User #5 - Marcus Vance (marcus.vance@example.com)</option>
                <option value="1">User #1 - Alexander Wright (superadmin)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Direction
                </label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="CREDIT">CREDIT (Add funds to user)</option>
                  <option value="DEBIT">DEBIT (Deduct funds from user)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Sub-Account
                </label>
                <select
                  value={targetAccountType}
                  onChange={(e) => setTargetAccountType(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="USER_AVAILABLE">Available Balance</option>
                  <option value="USER_LOCKED">Locked Balance</option>
                  <option value="USER_BONUS">Bonus Balance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (USD)
              </label>
              <Input
                type="number"
                step="0.00000001"
                min="0.00000001"
                placeholder="100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Audit Reason / Justification
              </label>
              <Input
                placeholder="e.g. Approved compensation for gateway transit latency ticket #842"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <Alert type="info">
              Double-Entry Offset: If approved, this adjustment will be posted as a balanced double-entry transaction against SYSTEM_CLEARING.
            </Alert>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-1/2"
                onClick={() => setRequestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-1/2"
                isLoading={submitting}
              >
                Submit for Approval
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
