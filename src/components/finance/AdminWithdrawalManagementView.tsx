import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { Input } from '../ui/Input.js';
import { Alert } from '../ui/Alert.js';
import { formatMoney } from '../../utils/money.js';
import { WithdrawalRequest } from '../../types/finance.js';

export const AdminWithdrawalManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detail Modal
  const [selectedWd, setSelectedWd] = useState<WithdrawalRequest | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState('');

  const fetchWithdrawals = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (riskFilter) params.append('risk_level', riskFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/v1/admin/withdrawals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch withdrawals');
      setWithdrawals(data.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, riskFilter, searchQuery]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const openDetail = async (wd: WithdrawalRequest) => {
    setSelectedWd(wd);
    setActionNote('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/admin/withdrawals/${wd.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDetailData(data.data);
      }
    } catch (err) {
      console.error('Failed to load withdrawal detail', err);
    }
  };

  const handleAction = async (actionEndpoint: string, body: Record<string, unknown> = {}) => {
    if (!selectedWd) return;
    try {
      setActionLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/admin/withdrawals/${selectedWd.id}/${actionEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to perform action: ${actionEndpoint}`);

      setSuccessMsg(data.message || 'Action executed successfully');
      setSelectedWd(null);
      fetchWithdrawals(true);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'APPROVED':
        return <Badge variant="info" size="sm">Approved</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="warning" size="sm">Pending Review</Badge>;
      case 'PROCESSING':
        return <Badge variant="info" size="sm">Processing</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      case 'FAILED':
        return <Badge variant="danger" size="sm">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" size="sm">Cancelled</Badge>;
      case 'REVERSED':
        return <Badge variant="neutral" size="sm">Reversed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'BLOCKED':
        return <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">BLOCKED</span>;
      case 'HIGH':
        return <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-xs font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 px-2 py-0.5 rounded">MEDIUM</span>;
      default:
        return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">LOW</span>;
    }
  };

  return (
    <div className="space-y-6 text-left" id="admin-withdrawal-management">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Withdrawal Management & Governance
          </h2>
          <p className="text-xs text-slate-500">
            Review, approve, process, and reconcile secure user withdrawals backed by double-entry ledger
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchWithdrawals(true)}
          isLoading={refreshing}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh List
        </Button>
      </div>

      {error && <Alert type="error" title="Error">{error}</Alert>}
      {successMsg && <Alert type="success" title="Success">{successMsg}</Alert>}

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, user ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
            <option value="REVERSED">Reversed</option>
          </select>

          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            <option value="">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Reference</th>
                <th className="p-3">User ID</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Fee / Net</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Risk Level</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">Loading withdrawals...</td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">No withdrawal requests found.</td>
                </tr>
              ) : (
                withdrawals.map(wd => (
                  <tr key={wd.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{wd.public_reference}</td>
                    <td className="p-3 font-medium">#{wd.user_id}</td>
                    <td className="p-3 font-bold font-mono">{formatMoney(wd.requested_amount, { currency: wd.currency })}</td>
                    <td className="p-3 font-mono text-slate-500">
                      <div>Net: {formatMoney(wd.net_amount, { currency: wd.currency })}</div>
                      <div className="text-[10px]">Fee: {formatMoney(wd.fee_amount, { currency: wd.currency })}</div>
                    </td>
                    <td className="p-3 max-w-[200px] truncate">{wd.destination_summary || `Destination #${wd.destination_id}`}</td>
                    <td className="p-3">{getRiskBadge(wd.risk_level)}</td>
                    <td className="p-3">{getStatusBadge(wd.status)}</td>
                    <td className="p-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => openDetail(wd)} leftIcon={<Eye className="w-3.5 h-3.5" />}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail & Action Modal */}
      {selectedWd && (
        <Modal isOpen={!!selectedWd} onClose={() => setSelectedWd(null)} title={`Withdrawal Governance: ${selectedWd.public_reference}`}>
          <div className="space-y-4 text-left max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">User ID</span>
                <span className="font-bold">#{selectedWd.user_id} ({detailData?.user?.name || 'User'})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className="font-bold">{selectedWd.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Gross Amount</span>
                <span className="font-mono font-bold">{formatMoney(selectedWd.requested_amount, { currency: selectedWd.currency })}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net Recipient Payout</span>
                <span className="font-mono font-bold text-emerald-600">{formatMoney(selectedWd.net_amount, { currency: selectedWd.currency })}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Risk Score</span>
                <span className="font-bold">{selectedWd.risk_score} / 100 ({selectedWd.risk_level})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Provider Ref</span>
                <span className="font-mono">{selectedWd.provider_reference || 'None assigned'}</span>
              </div>
            </div>

            {selectedWd.risk_reasons && selectedWd.risk_reasons.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Risk Signals Detected
                </span>
                <ul className="list-disc list-inside text-amber-700 dark:text-amber-300">
                  {selectedWd.risk_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Governance Notes / Rejection Reason</label>
              <Input
                placeholder="Enter notes or reason for approval/rejection..."
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              {(selectedWd.status === 'REQUESTED' || selectedWd.status === 'PENDING_REVIEW') && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAction('approve')}
                    isLoading={actionLoading}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Approve Withdrawal
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAction('reject', { reason: actionNote || 'Rejected by finance admin' })}
                    isLoading={actionLoading}
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Reject & Unlock
                  </Button>
                </>
              )}

              {selectedWd.status === 'APPROVED' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAction('process')}
                  isLoading={actionLoading}
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  Submit to Payout Gateway
                </Button>
              )}

              {selectedWd.status === 'PROCESSING' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAction('complete', { provider_reference: selectedWd.provider_reference || 'MANUAL_REF' })}
                  isLoading={actionLoading}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Mark Completed & Settle Ledger
                </Button>
              )}

              {selectedWd.status === 'COMPLETED' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAction('reverse', { reason: actionNote || 'Administrative reversal' })}
                  isLoading={actionLoading}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Reverse Transaction (Immutable Ledger)
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
