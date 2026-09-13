import React, { useState, useEffect } from 'react';
import {
  Coins,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Sliders,
  ArrowDownLeft,
  ArrowUpRight,
  Save,
  Check,
  Copy,
  Send,
  Wallet,
  FileText
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Alert } from '../ui/Alert.js';
import { Modal } from '../ui/Modal.js';
import { DataTable, Column } from '../ui/DataTable.js';
import { CryptoAssetConfig } from '../../types/crypto.js';
import {
  getBlockchainExplorerTxUrl,
  getBlockchainExplorerAddressUrl,
  getExplorerName,
  formatShortHash
} from '../../utils/blockchainExplorer.js';

interface AdminPaymentOrder {
  id: number;
  internal_payment_id: string;
  provider_payment_id: string;
  user_id: number;
  user_email: string;
  user_name: string;
  pay_currency: string;
  pay_network: string;
  price_amount: string;
  expected_amount: string;
  actually_paid: string;
  payment_address: string;
  status: string;
  tx_hash: string | null;
  ledger_transaction_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPayoutOrder {
  id: number;
  internal_payout_id: string;
  provider_payout_id?: string;
  batch_id?: string;
  user_id: number;
  user_email: string;
  user_name: string;
  currency_code: string;
  network: string;
  destination_address: string;
  extra_id?: string;
  amount: string;
  fee_amount: string;
  net_amount: string;
  status: 'PENDING_APPROVAL' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  rejection_reason?: string;
  tx_hash?: string | null;
  admin_notes?: string | null;
  disbursement_method?: 'AUTOMATED_API' | 'MANUAL';
  ledger_transaction_id: number;
  created_at: string;
  updated_at: string;
}

export const AdminCryptoPaymentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'WITHDRAWALS' | 'CONFIG'>('PAYMENTS');
  const [payments, setPayments] = useState<AdminPaymentOrder[]>([]);
  const [payouts, setPayouts] = useState<AdminPayoutOrder[]>([]);
  const [configs, setConfigs] = useState<CryptoAssetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncingAllLimits, setSyncingAllLimits] = useState(false);
  const [approvingPayoutId, setApprovingPayoutId] = useState<number | null>(null);
  const [rejectingPayoutId, setRejectingPayoutId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [payoutSearchQuery, setPayoutSearchQuery] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingConfigs, setEditingConfigs] = useState<Record<string, { app_min_deposit_usd: string; app_min_withdrawal_usd: string }>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);

  // Manual Payout Fulfillment State
  const [selectedPayoutForManual, setSelectedPayoutForManual] = useState<AdminPayoutOrder | null>(null);
  const [manualTxHash, setManualTxHash] = useState('');
  const [manualAdminNotes, setManualAdminNotes] = useState('');
  const [submittingManualPayout, setSubmittingManualPayout] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2500);
  };

  const handleCompleteManualPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayoutForManual) return;
    if (!manualTxHash.trim()) {
      setError('Please provide a valid blockchain Transaction Hash (TxID / HRX)');
      return;
    }

    try {
      setSubmittingManualPayout(true);
      setError(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch(`/api/crypto/admin/payouts/${selectedPayoutForManual.id}/complete-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tx_hash: manualTxHash.trim(),
          admin_notes: manualAdminNotes.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to complete manual payout');

      setSuccessMsg(`Withdrawal #${selectedPayoutForManual.id} marked as Paid! Tx Hash (${formatShortHash(manualTxHash, 6, 6)}) registered and user ledger settled.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      setSelectedPayoutForManual(null);
      setManualTxHash('');
      setManualAdminNotes('');
      await fetchPayouts(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingManualPayout(false);
    }
  };

  const fetchPayments = async (isSilent = false) => {
    try {
      if (isSilent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch('/api/crypto/admin/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load crypto payments');

      setPayments(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPayouts = async (isSilent = false) => {
    try {
      if (isSilent) setRefreshing(true);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch('/api/crypto/admin/payouts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setPayouts(data.data);
      }
    } catch (err) {
      console.error('Failed to load payouts', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch('/api/crypto/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setConfigs(data.data);
        const map: Record<string, { app_min_deposit_usd: string; app_min_withdrawal_usd: string }> = {};
        data.data.forEach((c: CryptoAssetConfig) => {
          map[c.code] = {
            app_min_deposit_usd: c.app_min_deposit_usd,
            app_min_withdrawal_usd: c.app_min_withdrawal_usd
          };
        });
        setEditingConfigs(map);
      }
    } catch (err) {
      console.error('Failed to load crypto configs:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchConfigs();
    fetchPayouts();
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchPayments(true), fetchConfigs(), fetchPayouts(true)]);
    setRefreshing(false);
  };

  const handleApprovePayout = async (id: number) => {
    try {
      setApprovingPayoutId(id);
      setError(null);
      setSuccessMsg(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch(`/api/crypto/admin/payouts/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve payout');
      setSuccessMsg(`Payout #${id} approved! Auto-disbursement executed via blockchain gateway.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchPayouts(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApprovingPayoutId(null);
    }
  };

  const handleRejectPayout = async (id: number) => {
    const reason = prompt('Please enter rejection reason (locked funds will be refunded to user):', 'Administrative review criteria not met');
    if (reason === null) return;

    try {
      setRejectingPayoutId(id);
      setError(null);
      setSuccessMsg(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch(`/api/crypto/admin/payouts/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject payout');
      setSuccessMsg(`Payout #${id} rejected. Reserved funds refunded to user available balance.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchPayouts(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRejectingPayoutId(null);
    }
  };

  const handleSyncAllLimits = async () => {
    try {
      setSyncingAllLimits(true);
      setError(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch('/api/crypto/admin/sync-limits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to sync limits');
      setSuccessMsg('Live network minimums successfully synchronized with blockchain network');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchConfigs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingAllLimits(false);
    }
  };

  const handleSaveConfig = async (code: string, currentDepositEnabled: boolean, currentWithdrawalEnabled: boolean) => {
    try {
      setSavingCode(code);
      setError(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const vals = editingConfigs[code];

      const res = await fetch(`/api/crypto/admin/settings/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          app_min_deposit_usd: vals?.app_min_deposit_usd,
          app_min_withdrawal_usd: vals?.app_min_withdrawal_usd,
          deposit_enabled: currentDepositEnabled,
          withdrawal_enabled: currentWithdrawalEnabled
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update asset config');
      setSuccessMsg(`Updated configuration for ${code.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchConfigs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingCode(null);
    }
  };

  const handleToggleEnable = async (code: string, field: 'deposit' | 'withdrawal', currentVal: boolean) => {
    try {
      setSavingCode(code);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const payload: Record<string, boolean> = {};
      if (field === 'deposit') payload.deposit_enabled = !currentVal;
      if (field === 'withdrawal') payload.withdrawal_enabled = !currentVal;

      const res = await fetch(`/api/crypto/admin/settings/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle status');
      fetchConfigs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingCode(null);
    }
  };

  const handleResync = async (orderId: number) => {
    try {
      setSyncingId(orderId);
      setError(null);
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch(`/api/crypto/admin/payments/${orderId}/resync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Resync failed');

      setSuccessMsg(`Payment #${orderId} successfully re-synchronized with blockchain network`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchPayments(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingId(null);
    }
  };

  const filtered = payments.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.internal_payment_id.toLowerCase().includes(q) ||
        p.provider_payment_id.toLowerCase().includes(q) ||
        p.user_email.toLowerCase().includes(q) ||
        (p.tx_hash && p.tx_hash.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const payoutFiltered = payouts.filter(p => {
    if (payoutStatusFilter !== 'ALL' && p.status !== payoutStatusFilter) return false;
    if (payoutSearchQuery) {
      const q = payoutSearchQuery.toLowerCase();
      return (
        p.internal_payout_id.toLowerCase().includes(q) ||
        (p.provider_payout_id && p.provider_payout_id.toLowerCase().includes(q)) ||
        p.user_email.toLowerCase().includes(q) ||
        p.destination_address.toLowerCase().includes(q) ||
        p.currency_code.toLowerCase().includes(q) ||
        p.network.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const payoutColumns: Column<AdminPayoutOrder>[] = [
    {
      header: 'Payout ID',
      accessorKey: 'internal_payout_id',
      cell: p => (
        <div className="font-mono text-xs">
          <div className="font-bold text-white">{p.internal_payout_id}</div>
          {p.provider_payout_id && (
            <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={p.provider_payout_id}>
              {p.provider_payout_id.startsWith('MANUAL') ? 'Manual Admin Payout' : `NP: ${p.provider_payout_id}`}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'User',
      accessorKey: 'user_email',
      cell: p => (
        <div className="text-xs">
          <div className="font-semibold text-slate-200">{p.user_name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{p.user_email}</div>
        </div>
      )
    },
    {
      header: 'Asset & Network',
      accessorKey: 'currency_code',
      cell: p => (
        <div className="text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
              {p.currency_code.toUpperCase()}
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold font-mono px-1.5 py-0.5 rounded bg-indigo-950/50 border border-indigo-800/40">
              {p.network}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Amount ($ USD)',
      accessorKey: 'amount',
      cell: p => (
        <div className="text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold">${p.amount}</span>
            <button
              type="button"
              onClick={() => handleCopy(p.net_amount, `amt-${p.id}`)}
              title="Copy Net Amount"
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
            >
              {copiedKey === `amt-${p.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="text-[10px] text-slate-400">
            Fee: ${p.fee_amount} | Net: <span className="text-emerald-400 font-semibold">${p.net_amount}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Destination Wallet Address',
      accessorKey: 'destination_address',
      cell: p => {
        const explorerAddrUrl = getBlockchainExplorerAddressUrl(p.destination_address, p.network, p.currency_code);
        return (
          <div className="text-xs font-mono space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-200 truncate max-w-[140px] font-mono text-[11px]" title={p.destination_address}>
                {p.destination_address}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(p.destination_address, `addr-${p.id}`)}
                title="Copy Destination Wallet Address"
                className={`p-1 rounded flex items-center gap-1 text-[10px] transition-all ${
                  copiedKey === `addr-${p.id}`
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-950/60 text-indigo-300 hover:text-white border border-indigo-800/60 hover:bg-indigo-900/80'
                }`}
                id={`copy-addr-btn-${p.id}`}
              >
                {copiedKey === `addr-${p.id}` ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="font-sans font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="font-sans font-semibold">Copy Address</span>
                  </>
                )}
              </button>
              {explorerAddrUrl && (
                <a
                  href={explorerAddrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Address on Blockchain Explorer"
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {p.extra_id && (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <span className="font-sans">Tag/Memo:</span>
                <span className="font-bold">{p.extra_id}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(p.extra_id!, `tag-${p.id}`)}
                  title="Copy Memo/Tag"
                  className="hover:text-amber-200 p-0.5 rounded hover:bg-slate-800"
                >
                  {copiedKey === `tag-${p.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Tx Hash (HRX)',
      cell: p => {
        if (p.tx_hash) {
          const txUrl = getBlockchainExplorerTxUrl(p.tx_hash, p.network, p.currency_code);
          const explorerName = getExplorerName(p.network, p.currency_code);
          return (
            <div className="text-xs font-mono space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-semibold truncate max-w-[110px]" title={p.tx_hash}>
                  {formatShortHash(p.tx_hash, 6, 5)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(p.tx_hash!, `tx-${p.id}`)}
                  title="Copy Full Transaction Hash"
                  className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
                >
                  {copiedKey === `tx-${p.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                {txUrl && (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Inspect on ${explorerName}`}
                    className="text-indigo-400 hover:text-indigo-300 p-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                {p.disbursement_method === 'MANUAL' ? 'Manual Transfer' : 'Auto Dispatched'}
              </div>
            </div>
          );
        }
        return <span className="text-xs text-slate-500 italic">Not Dispatched</span>;
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: p => {
        switch (p.status) {
          case 'PENDING_APPROVAL':
            return (
              <Badge variant="warning" className="flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse" /> Pending Approval
              </Badge>
            );
          case 'COMPLETED':
            return (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Paid & Completed
              </Badge>
            );
          case 'PROCESSING':
            return (
              <Badge variant="info" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Processing
              </Badge>
            );
          case 'REJECTED':
            return (
              <Badge variant="danger" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Rejected & Refunded
              </Badge>
            );
          default:
            return <Badge variant="neutral">{p.status}</Badge>;
        }
      }
    },
    {
      header: 'Requested',
      accessorKey: 'created_at',
      cell: p => (
        <span className="text-xs text-slate-400">
          {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: p => {
        if (p.status === 'PENDING_APPROVAL') {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Primary Manual Payout Action */}
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setSelectedPayoutForManual(p);
                  setManualTxHash('');
                  setManualAdminNotes('');
                  setError(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 font-semibold flex items-center gap-1 shadow-sm"
                id={`manual-pay-btn-${p.id}`}
                title="Send funds manually from your wallet/exchange and submit the Tx Hash"
              >
                <Send className="w-3.5 h-3.5" /> Mark Paid (Tx Hash)
              </Button>

              {/* Optional Auto Payout Action via Provider */}
              <Button
                size="sm"
                variant="outline"
                isLoading={approvingPayoutId === p.id}
                onClick={() => handleApprovePayout(p.id)}
                className="text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 text-xs px-2 py-1"
                id={`approve-payout-btn-${p.id}`}
                title="Execute automated payment through NOWPayments API"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Auto-API
              </Button>

              {/* Reject Action */}
              <Button
                size="sm"
                variant="outline"
                isLoading={rejectingPayoutId === p.id}
                onClick={() => handleRejectPayout(p.id)}
                className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 text-xs px-2 py-1"
                id={`reject-payout-btn-${p.id}`}
                title="Reject and refund reserved funds to user"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            </div>
          );
        }
        if (p.status === 'REJECTED' && p.rejection_reason) {
          return <span className="text-[10px] text-slate-500 italic truncate max-w-[140px]">{p.rejection_reason}</span>;
        }
        if (p.status === 'COMPLETED' && p.tx_hash) {
          const txUrl = getBlockchainExplorerTxUrl(p.tx_hash, p.network, p.currency_code);
          return (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-[10px]">
                Paid
              </Badge>
              {txUrl && (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        }
        return <span className="text-xs text-slate-500 font-mono">#LTX-{p.ledger_transaction_id}</span>;
      }
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return <Badge variant="success">Finished & Reconciled</Badge>;
      case 'CONFIRMING':
        return <Badge variant="info">Confirming (Mempool)</Badge>;
      case 'WAITING':
        return <Badge variant="warning">Waiting Payment</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">Partially Paid</Badge>;
      case 'EXPIRED':
        return <Badge variant="neutral">Expired</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns: Column<AdminPaymentOrder>[] = [
    {
      header: 'Payment ID',
      accessorKey: 'internal_payment_id',
      cell: p => (
        <div className="font-mono text-xs">
          <div className="font-bold text-white">{p.internal_payment_id}</div>
          <div className="text-[10px] text-slate-500">NP: {p.provider_payment_id}</div>
        </div>
      )
    },
    {
      header: 'User',
      accessorKey: 'user_email',
      cell: p => (
        <div className="text-xs">
          <div className="font-semibold text-slate-200">{p.user_name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{p.user_email}</div>
        </div>
      )
    },
    {
      header: 'Coin / Network',
      accessorKey: 'pay_currency',
      cell: p => (
        <div className="text-xs">
          <span className="font-bold text-white">{p.pay_currency.toUpperCase()}</span>
          <span className="text-[10px] text-indigo-400 ml-1.5 font-semibold">({p.pay_network})</span>
        </div>
      )
    },
    {
      header: 'Expected / Paid',
      accessorKey: 'expected_amount',
      cell: p => (
        <div className="text-xs font-mono">
          <div className="text-white font-semibold">{p.expected_amount} ({p.pay_currency.toUpperCase()})</div>
          <div className="text-[11px] text-emerald-400 font-bold">${p.price_amount} USD</div>
          {parseFloat(p.actually_paid) > 0 && (
            <div className="text-[10px] text-slate-400">Recv: {p.actually_paid}</div>
          )}
        </div>
      )
    },
    {
      header: 'TX Hash',
      accessorKey: 'tx_hash',
      cell: p =>
        p.tx_hash ? (
          <span className="font-mono text-[11px] text-indigo-400 truncate max-w-[120px] block" title={p.tx_hash}>
            {p.tx_hash.slice(0, 8)}...{p.tx_hash.slice(-6)}
          </span>
        ) : (
          <span className="text-xs text-slate-600">Pending</span>
        )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: p => getStatusBadge(p.status)
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: p => (
        <span className="text-xs text-slate-400">
          {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: p => (
        <Button
          size="sm"
          variant="outline"
          isLoading={syncingId === p.id}
          onClick={() => handleResync(p.id)}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${syncingId === p.id ? 'animate-spin' : ''}`} />}
        >
          Re-sync
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left" id="admin-crypto-payments-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-400" />
            Crypto Payments Desk (Blockchain Gateway)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically verified real-crypto deposits, blockchain confirmations, and double-entry ledger audits
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          isLoading={refreshing}
          leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Feed
        </Button>
      </div>

      {successMsg && <Alert type="success" title="Reconciled">{successMsg}</Alert>}
      {error && <Alert type="error" title="Gateway Error">{error}</Alert>}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PAYMENTS'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          Deposit Orders ({payments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WITHDRAWALS')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'WITHDRAWALS'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          Crypto Withdrawals & Approvals ({payouts.length})
          {payouts.filter(p => p.status === 'PENDING_APPROVAL').length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              {payouts.filter(p => p.status === 'PENDING_APPROVAL').length} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONFIG')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'CONFIG'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Network Minimums & Asset Policies ({configs.length})
        </button>
      </div>

      {activeTab === 'PAYMENTS' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Payment ID, Provider ID, User Email, or TX Hash..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'WAITING', 'CONFIRMING', 'FINISHED', 'EXPIRED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            title={`All Crypto Deposit Orders (${filtered.length})`}
            columns={columns}
            data={filtered}
            isLoading={loading}
          />
        </>
      ) : activeTab === 'WITHDRAWALS' ? (
        <>
          {/* Info Banner */}
          <div className="p-4 bg-slate-900 border border-indigo-500/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Crypto Withdrawal Fulfillment Desk (Manual & Automated Gateway)
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-medium">
                Double-Entry Ledger Protected
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When users request a withdrawal, their funds are locked in the double-entry financial ledger.
              You can fulfill payouts in two ways:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-900/40 text-slate-300">
                <div className="font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
                  <Send className="w-3.5 h-3.5" /> 1. Manual Transfer (Recommended)
                </div>
                Copy the user's destination wallet address and net amount, send funds from your exchange or private wallet, then click <strong className="text-white">"Mark Paid (Tx Hash)"</strong> and input the transaction hash (TxID/HRX). The user will immediately see the payment marked as Paid with the Tx Hash.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-indigo-900/40 text-slate-300">
                <div className="font-bold text-indigo-400 flex items-center gap-1 mb-0.5">
                  <RefreshCw className="w-3.5 h-3.5" /> 2. Automated Gateway Payout
                </div>
                If your NOWPayments payout balance has sufficient funds, you can click <strong className="text-white">"Auto-API"</strong> to automatically disburse funds via the provider's payout API.
              </div>
            </div>
          </div>

          {/* Filter and Search Bar for Payouts */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Payout ID, User Email, Coin, Network, or Wallet Address..."
                value={payoutSearchQuery}
                onChange={e => setPayoutSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'PENDING_APPROVAL', 'COMPLETED', 'PROCESSING', 'REJECTED'].map(st => (
                <button
                  key={st}
                  onClick={() => setPayoutStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    payoutStatusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st === 'PENDING_APPROVAL' ? 'Pending Approval' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Payouts Table */}
          <DataTable
            title={`Crypto Withdrawal & Payout Requests (${payoutFiltered.length})`}
            columns={payoutColumns}
            data={payoutFiltered}
            isLoading={loading}
          />
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Dynamic Provider Minimums & Custom App Thresholds
              </h3>
              <p className="text-xs text-slate-400">
                The effective deposit and withdrawal threshold is calculated as{' '}
                <code className="text-indigo-300 font-mono">Max(Provider Network Minimum, App Admin Minimum)</code>.
                Coins and networks supporting low amounts permit user deposits starting from $1.00 USD.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSyncAllLimits}
              isLoading={syncingAllLimits}
              leftIcon={<RefreshCw className={`w-4 h-4 ${syncingAllLimits ? 'animate-spin' : ''}`} />}
            >
              Sync Network Minimums
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Asset & Network</th>
                  <th className="py-3 px-3">Deposit Minimums (USD)</th>
                  <th className="py-3 px-3">Effective Min Deposit</th>
                  <th className="py-3 px-3">Withdrawal Minimums (USD)</th>
                  <th className="py-3 px-3">Effective Min Withdrawal</th>
                  <th className="py-3 px-3">Status Controls</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {configs.map(c => {
                  const edit = editingConfigs[c.code] || {
                    app_min_deposit_usd: c.app_min_deposit_usd,
                    app_min_withdrawal_usd: c.app_min_withdrawal_usd
                  };
                  const isSaving = savingCode === c.code;

                  return (
                    <tr key={c.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-sans">{c.symbol}</div>
                        <div className="text-[11px] text-indigo-400 font-sans">{c.network_display || c.network}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.code}</div>
                      </td>

                      <td className="py-3 px-3 space-y-1">
                        <div className="text-slate-400 text-[11px]">
                          Provider: <span className="text-white">${c.provider_min_deposit_usd}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[10px]">App Min: $</span>
                          <input
                            type="number"
                            step="0.10"
                            min="0.01"
                            value={edit.app_min_deposit_usd}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingConfigs(prev => ({
                                ...prev,
                                [c.code]: { ...prev[c.code], app_min_deposit_usd: val }
                              }));
                            }}
                            className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">
                          ${c.effective_min_deposit_usd} USD
                        </span>
                      </td>

                      <td className="py-3 px-3 space-y-1">
                        <div className="text-slate-400 text-[11px]">
                          Provider: <span className="text-white">${c.provider_min_withdrawal_usd}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[10px]">App Min: $</span>
                          <input
                            type="number"
                            step="0.10"
                            min="0.01"
                            value={edit.app_min_withdrawal_usd}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingConfigs(prev => ({
                                ...prev,
                                [c.code]: { ...prev[c.code], app_min_withdrawal_usd: val }
                              }));
                            }}
                            className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                          ${c.effective_min_withdrawal_usd} USD
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => handleToggleEnable(c.code, 'deposit', c.deposit_enabled)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold text-left transition-colors ${
                              c.deposit_enabled
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            Deposit: {c.deposit_enabled ? 'Enabled' : 'Disabled'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEnable(c.code, 'withdrawal', c.withdrawal_enabled)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold text-left transition-colors ${
                              c.withdrawal_enabled
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            Payout: {c.withdrawal_enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={isSaving}
                          onClick={() => handleSaveConfig(c.code, c.deposit_enabled, c.withdrawal_enabled)}
                          leftIcon={<Save className="w-3.5 h-3.5" />}
                        >
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Manual Crypto Payout Fulfillment Modal */}
      {selectedPayoutForManual && (
        <Modal
          isOpen={Boolean(selectedPayoutForManual)}
          onClose={() => {
            if (!submittingManualPayout) {
              setSelectedPayoutForManual(null);
            }
          }}
          title="Manual Crypto Withdrawal Fulfillment"
          description={`Process and record manual payout for order ${selectedPayoutForManual.internal_payout_id}`}
          maxWidth="lg"
        >
          <form onSubmit={handleCompleteManualPayout} className="space-y-4">
            {/* Step 1: User & Wallet Information */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-400">Recipient Account</span>
                <span className="text-xs font-bold text-white">
                  {selectedPayoutForManual.user_name} ({selectedPayoutForManual.user_email})
                </span>
              </div>

              {/* Asset & Network */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Selected Coin & Network:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs">
                    {selectedPayoutForManual.currency_code.toUpperCase()}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold font-mono px-2.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60">
                    {selectedPayoutForManual.network}
                  </span>
                </div>
              </div>

              {/* Net Amount to Transfer */}
              <div className="flex items-center justify-between p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg">
                <div>
                  <div className="text-[11px] text-emerald-400 font-medium">Net Amount to Send to User:</div>
                  <div className="text-xl font-extrabold text-white font-mono">
                    ${selectedPayoutForManual.net_amount}{' '}
                    <span className="text-xs text-emerald-300 font-normal">
                      ({selectedPayoutForManual.currency_code.toUpperCase()})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Gross requested: ${selectedPayoutForManual.amount} | Platform fee retained: ${selectedPayoutForManual.fee_amount}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(selectedPayoutForManual.net_amount, 'modal-net-amt')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {copiedKey === 'modal-net-amt' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Amount!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Amount</span>
                    </>
                  )}
                </button>
              </div>

              {/* Destination Address with Copy Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-indigo-400" /> User's Destination Wallet Address:
                  </label>
                  {getBlockchainExplorerAddressUrl(
                    selectedPayoutForManual.destination_address,
                    selectedPayoutForManual.network,
                    selectedPayoutForManual.currency_code
                  ) && (
                    <a
                      href={getBlockchainExplorerAddressUrl(
                        selectedPayoutForManual.destination_address,
                        selectedPayoutForManual.network,
                        selectedPayoutForManual.currency_code
                      )!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Verify on Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedPayoutForManual.destination_address}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 select-all cursor-text focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedPayoutForManual.destination_address, 'modal-dest-addr')}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                    id="modal-copy-address-btn"
                  >
                    {copiedKey === 'modal-dest-addr' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied Address!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Optional Memo / Tag */}
              {selectedPayoutForManual.extra_id && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-amber-400">Destination Memo / Tag (Required for transfer):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedPayoutForManual.extra_id}
                      className="flex-1 bg-slate-950 border border-amber-500/30 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedPayoutForManual.extra_id!, 'modal-memo-tag')}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                    >
                      {copiedKey === 'modal-memo-tag' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Tag!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Tag</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Enter Transaction Hash (TxID / HRX) */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <FileText className="w-4 h-4 text-indigo-400" /> Step 2: Enter Blockchain Transaction Hash (TxID / HRX)
              </div>
              <p className="text-[11px] text-slate-400">
                After you manually transfer the funds from your exchange (Binance, OKX, Bybit) or wallet (TronLink, Phantom, MetaMask, Ledger), copy the transaction hash (TxID / HRX) and paste it below. The user will immediately see the payment marked as <strong className="text-emerald-400">Paid</strong> with a direct link to inspect the hash on the blockchain explorer.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Transaction Hash / TxID / HRX <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0x8b394f... or 5f93c... or Solana signature"
                  value={manualTxHash}
                  onChange={e => setManualTxHash(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  id="modal-tx-hash-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Internal Admin Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via Binance custody account #2, batch #8821"
                  value={manualAdminNotes}
                  onChange={e => setManualAdminNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedPayoutForManual(null)}
                disabled={submittingManualPayout}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={submittingManualPayout}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 flex items-center gap-1.5"
                id="modal-confirm-manual-payout-btn"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Payment Sent & Mark Paid
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
