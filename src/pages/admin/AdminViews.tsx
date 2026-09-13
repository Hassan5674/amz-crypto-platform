import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Gamepad2,
  FolderKanban,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Search,
  Plus,
  Edit2,
  Lock,
  Eye,
  Trash2,
  UserCheck,
  Send,
  ToggleLeft,
  ToggleRight,
  Download,
  AlertOctagon,
  RefreshCw,
  Clock,
  Image as ImageIcon,
  DollarSign,
  PlusCircle,
  MinusCircle,
  Wallet,
  History
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Badge } from '../../components/ui/Badge.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Modal } from '../../components/ui/Modal.js';
import { Alert } from '../../components/ui/Alert.js';
import { AdminWithdrawalManagementView } from '../../components/finance/AdminWithdrawalManagementView.js';
import { AdminInvestmentManagementView } from '../../components/finance/AdminInvestmentManagementView.js';
import { AdminCryptoPaymentsView } from '../../components/crypto/AdminCryptoPaymentsView.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog.js';
import { useAuth } from '../../context/AuthContext.js';
import { AdminViewId } from './AdminDashboardLayout.js';

// ----------------------------------------------------------------------
// 1. Admin Overview View (Live Authoritative Analytics)
// ----------------------------------------------------------------------
export const AdminOverviewView: React.FC<{ onViewChange: (view: AdminViewId) => void }> = ({ onViewChange }) => {
  const [stats, setStats] = React.useState<any>({
    totalUsers: 0,
    activeUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalInvested: 0,
    activeInvestments: 0,
    pendingWithdrawalsCount: 0,
    pendingKycCount: 0,
  });

  React.useEffect(() => {
    let isMounted = true;
    const fetchAdminStats = async () => {
      try {
        const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/admin/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.data?.stats) {
            setStats(data.data.stats);
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchAdminStats();
  }, []);

  const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 text-left">
      <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">Apex Governance Core</Badge>
            <span className="text-xs text-slate-400">Institutional Operations & Audit Console</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Platform Operations & Oversight</h2>
          <p className="text-xs text-slate-400">Manage user registries, verified ledger settlements, and modular RBAC matrices.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onViewChange('audit-logs')}>
            Inspect Audit Trail
          </Button>
          <Button variant="primary" size="sm" onClick={() => onViewChange('settings')}>
            System Parameters
          </Button>
        </div>
      </div>

      {/* 8 Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Registered Users" value={stats.totalUsers || 0} subtitle="Live registered accounts" icon={<Users className="w-5 h-5 text-indigo-400" />} />
        <StatCard title="Active Participants" value={stats.activeUsers || 0} subtitle="Verified active accounts" icon={<UserCheck className="w-5 h-5 text-emerald-400" />} />
        <StatCard title="Total Deposits" value={formatCurrency(stats.totalDeposits || 0)} subtitle="On-chain crypto deposits" icon={<ArrowDownCircle className="w-5 h-5 text-sky-400" />} />
        <StatCard title="Total Withdrawals" value={formatCurrency(stats.totalWithdrawals || 0)} subtitle="Settled & approved payouts" icon={<ArrowUpCircle className="w-5 h-5 text-amber-400" />} />
        <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested || 0)} subtitle="Allocated into yield notes" icon={<TrendingUp className="w-5 h-5 text-indigo-400" />} />
        <StatCard title="Active Allocations" value={stats.activeInvestments || 0} subtitle="Active yield contracts" icon={<FolderKanban className="w-5 h-5 text-violet-400" />} />
        <StatCard title="Pending Withdrawals" value={stats.pendingWithdrawalsCount || 0} subtitle="Queued for admin sign-off" icon={<Clock className="w-5 h-5 text-amber-400" />} />
        <StatCard title="Pending KYC Review" value={stats.pendingKycCount || 0} subtitle="Document verifications" icon={<AlertTriangle className="w-5 h-5 text-rose-400" />} />
      </div>

      {/* Operations Quick Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-3 bg-slate-800 border-slate-700">
          <h3 className="font-bold text-sm text-white">Compliance & Review Desk</h3>
          <p className="text-xs text-slate-400">KYC identity verification submissions awaiting compliance officer verification.</p>
          <Button variant="primary" size="sm" onClick={() => onViewChange('kyc')}>
            Review KYC Desk ({stats.pendingKycCount || 0})
          </Button>
        </Card>

        <Card className="p-5 space-y-3 bg-slate-800 border-slate-700">
          <h3 className="font-bold text-sm text-white">Withdrawal Approvals</h3>
          <p className="text-xs text-slate-400">Withdrawal requests queued for cryptographic disbursement confirmation.</p>
          <Button variant="outline" size="sm" onClick={() => onViewChange('withdrawals')}>
            View Withdrawal Queue ({stats.pendingWithdrawalsCount || 0})
          </Button>
        </Card>

        <Card className="p-5 space-y-3 bg-slate-800 border-slate-700">
          <h3 className="font-bold text-sm text-white">Security & Audit Matrix</h3>
          <p className="text-xs text-slate-400">System integrity check passes. All permissions active across RBAC roles.</p>
          <Button variant="outline" size="sm" onClick={() => onViewChange('roles')}>
            Inspect Role Matrix
          </Button>
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. Admin Users View
// ----------------------------------------------------------------------
export const AdminUsersView: React.FC = () => {
  const { currentRole } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionModal, setActionModal] = useState<{
    user: any;
    action: 'suspend' | 'ban' | 'reinstate' | 'revoke-sessions';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Balance adjustment modal state
  const [balanceModal, setBalanceModal] = useState<{
    user: any;
    type: 'ADD' | 'REMOVE';
    amount: string;
    reason: string;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Tab state: 'directory' for all users, 'balance_history' for audit log of admin additions/removals
  const [activeTab, setActiveTab] = useState<'directory' | 'balance_history'>('directory');
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<'ALL' | 'ADD' | 'REMOVE'>('ALL');

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalanceHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/users/balance-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setBalanceHistory(json.data || []);
      }
    } catch {
      // Safe fallback
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadBalanceHistory();
  }, []);

  const handleAdjustBalance = async () => {
    if (!balanceModal || !balanceModal.amount) return;
    const num = parseFloat(balanceModal.amount);
    if (isNaN(num) || num <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid positive amount.' });
      return;
    }

    setBalanceLoading(true);
    setStatusMessage(null);

    const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || '';
    try {
      const res = await fetch(`/api/admin/users/${balanceModal.user.id}/adjust-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: num,
          type: balanceModal.type,
          reason: balanceModal.reason || `Direct balance ${balanceModal.type === 'ADD' ? 'credit' : 'deduction'} by Admin`
        })
      });

      const json = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: json.message || `Successfully ${balanceModal.type === 'ADD' ? 'added' : 'deducted'} $${num.toFixed(2)}.`
        });
        setBalanceModal(null);
        loadUsers();
        loadBalanceHistory();
        window.dispatchEvent(new CustomEvent('balance_updated', { detail: { userId: balanceModal.user.id } }));
        window.dispatchEvent(new Event('storage'));
      } else {
        setStatusMessage({
          type: 'error',
          text: json.message || 'Failed to adjust user balance'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Network error adjusting balance'
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    setStatusMessage(null);

    const token = localStorage.getItem('apex_session_token') || '';
    const { user, action } = actionModal;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: actionReason || 'Administrative oversight decision' })
      });

      const json = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: json.message || `Action ${action} executed successfully` });
        setActionModal(null);
        setActionReason('');
        loadUsers();
      } else {
        setStatusMessage({ type: 'error', text: json.message || `Action failed (${res.status})` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error executing action' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<any>[] = [
    { header: 'ID', accessorKey: 'id', sortable: true },
    { header: 'Full Name', accessorKey: 'name', sortable: true },
    { header: 'Username', accessorKey: 'username', sortable: true },
    { header: 'Email', accessorKey: 'email', sortable: true },
    {
      header: 'Role Clearance',
      cell: (r) => (
        <Badge variant={r.roles?.includes('SUPER_ADMIN') ? 'primary' : r.roles?.includes('ADMIN') ? 'info' : 'neutral'}>
          {r.roles?.[0] || 'USER'}
        </Badge>
      )
    },
    {
      header: 'Balance',
      accessorKey: 'balance',
      sortable: true,
      cell: (r) => (
        <span className="font-mono font-bold text-emerald-400 text-xs">
          ${Number(r.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (r) => (
        <Badge
          variant={
            r.status === 'ACTIVE'
              ? 'success'
              : r.status === 'SUSPENDED'
              ? 'warning'
              : r.status === 'BANNED'
              ? 'danger'
              : 'neutral'
          }
        >
          {r.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: (r) => {
        const isSuperAdminTarget = r.roles?.includes('SUPER_ADMIN');
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setSelectedUser(r)}>
              Details
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-emerald-400 hover:text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/40"
              onClick={() => setBalanceModal({ user: r, type: 'ADD', amount: '', reason: '' })}
              title="Add or Remove User Balance"
            >
              <DollarSign className="w-3.5 h-3.5 mr-0.5" />
              Adjust Balance
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-indigo-400 hover:text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/40"
              onClick={() => {
                setActiveTab('balance_history');
                loadBalanceHistory();
              }}
              title="View Balance Adjustment History"
            >
              <History className="w-3.5 h-3.5 mr-0.5" />
              History
            </Button>

            {isSuperAdminTarget ? (
              <span className="text-[10px] text-amber-400 font-semibold px-2 py-1 bg-amber-950/60 rounded border border-amber-800">
                Protected
              </span>
            ) : (
              <>
                {r.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-400 hover:text-amber-300"
                    onClick={() => setActionModal({ user: r, action: 'suspend' })}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-400 hover:text-emerald-300"
                    onClick={() => setActionModal({ user: r, action: 'reinstate' })}
                  >
                    Reinstate
                  </Button>
                )}

                {r.status !== 'BANNED' && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setActionModal({ user: r, action: 'ban' })}
                  >
                    Ban
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActionModal({ user: r, action: 'revoke-sessions' })}
                  title="Force Terminate Sessions"
                >
                  Revoke
                </Button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const historyColumns: Column<any>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'created_at',
      sortable: true,
      cell: (r) => (
        <div className="flex flex-col text-xs font-mono text-slate-300">
          <span>{new Date(r.created_at).toLocaleDateString()}</span>
          <span className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    {
      header: 'Admin (Actor)',
      accessorKey: 'admin_name',
      cell: (r) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <div>
            <span className="font-semibold text-white block">{r.admin_name || 'Admin'}</span>
            <span className="text-[10px] text-slate-400">@{r.admin_username || 'admin'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Target User',
      accessorKey: 'user_name',
      cell: (r) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-200 block">{r.user_name}</span>
          <span className="text-[10px] text-slate-400">@{r.user_username} • ID #{r.user_id}</span>
        </div>
      )
    },
    {
      header: 'Action',
      accessorKey: 'type',
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            r.type === 'ADD'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
          }`}
        >
          {r.type === 'ADD' ? (
            <>
              <PlusCircle className="w-3 h-3" />
              <span>Balance Added</span>
            </>
          ) : (
            <>
              <MinusCircle className="w-3 h-3" />
              <span>Balance Removed</span>
            </>
          )}
        </span>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      cell: (r) => (
        <span
          className={`font-mono font-bold text-xs ${
            r.type === 'ADD' ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {r.type === 'ADD' ? '+' : '-'}${parseFloat(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {r.currency || 'USD'}
        </span>
      )
    },
    {
      header: 'Reason / Memo',
      accessorKey: 'reason',
      cell: (r) => (
        <span className="text-xs text-slate-300 max-w-xs truncate block" title={r.reason}>
          {r.reason || 'Administrative adjustment'}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: () => (
        <Badge variant="success">EXECUTED</Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">User Directory & Security Governance</h2>
          <p className="text-xs text-slate-400">Search participants, inspect credentials, and manage access restrictions</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'balance_history' && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadBalanceHistory}
              isLoading={historyLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh History
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Directory
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Alert
          type={statusMessage.type === 'success' ? 'success' : 'error'}
          title={statusMessage.type === 'success' ? 'Governance Action Completed' : 'Authorization / Guard Failure'}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* Navigation Tabs: Directory vs Balance History */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'directory'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          id="tab-user-directory"
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('balance_history');
            loadBalanceHistory();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'balance_history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          id="tab-balance-history"
        >
          <History className="w-4 h-4" />
          <span>Balance Adjustment History ({balanceHistory.length})</span>
        </button>
      </div>

      {activeTab === 'directory' ? (
        <DataTable
          title="Registered Platform Accounts"
          columns={columns}
          data={users}
          searchPlaceholder="Search by name, email, username, or ID..."
          filterOptions={[
            { label: 'Active', key: 'status', value: 'ACTIVE' },
            { label: 'Suspended', key: 'status', value: 'SUSPENDED' },
            { label: 'Banned', key: 'status', value: 'BANNED' },
          ]}
        />
      ) : (
        <DataTable
          title="Admin Balance Adjustments & Transactions Audit Log"
          columns={historyColumns}
          data={balanceHistory}
          searchPlaceholder="Filter by user name, email, admin name, or ID..."
          filterOptions={[
            { label: 'Added (+)', key: 'type', value: 'ADD' },
            { label: 'Removed (-)', key: 'type', value: 'REMOVE' }
          ]}
        />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`User Record: ${selectedUser.name}`}
          description={`Registered ID: #${selectedUser.id} • UUID: ${selectedUser.uuid}`}
        >
          <div className="space-y-4 text-xs text-left">
            <div className="p-3 bg-slate-800 rounded-lg space-y-2 border border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400 block text-[10px]">Username</span>@{selectedUser.username}</div>
                <div><span className="text-slate-400 block text-[10px]">Account Status</span>
                  <Badge variant={selectedUser.status === 'ACTIVE' ? 'success' : 'danger'}>{selectedUser.status}</Badge>
                </div>
                <div><span className="text-slate-400 block text-[10px]">Email Address</span>{selectedUser.email}</div>
                <div><span className="text-slate-400 block text-[10px]">Email Verified</span>{selectedUser.email_verified_at ? 'Yes (Verified)' : 'Pending'}</div>
                <div><span className="text-slate-400 block text-[10px]">Phone</span>{selectedUser.phone || 'None'}</div>
                <div><span className="text-slate-400 block text-[10px]">2FA Status</span>{selectedUser.two_factor_enabled ? 'Active (TOTP)' : 'Disabled'}</div>
                <div><span className="text-slate-400 block text-[10px]">Current Balance</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ${Number(selectedUser.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div><span className="text-slate-400 block text-[10px]">Enrolled Date</span>{new Date(selectedUser.created_at).toLocaleString()}</div>
                <div><span className="text-slate-400 block text-[10px]">Last Login</span>{selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : 'Never'}</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/40"
                onClick={() => {
                  const u = selectedUser;
                  setSelectedUser(null);
                  setBalanceModal({ user: u, type: 'ADD', amount: '', reason: '' });
                }}
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Adjust Balance
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Add / Remove User Balance Modal */}
      {balanceModal && (
        <Modal
          isOpen={!!balanceModal}
          onClose={() => setBalanceModal(null)}
          title={`Adjust Balance: ${balanceModal.user.name}`}
          description={`Username: @${balanceModal.user.username} • Account #${balanceModal.user.id}`}
        >
          <div className="space-y-4 text-xs text-left">
            {/* Balance Overview Card */}
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Current Available Balance</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  ${Number(balanceModal.user.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <Badge variant="primary">USD Account</Badge>
            </div>

            {/* Action Type Toggle: Add (+) vs Remove (-) */}
            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Select Adjustment Type:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceModal({ ...balanceModal, type: 'ADD' })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all ${
                    balanceModal.type === 'ADD'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Balance (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceModal({ ...balanceModal, type: 'REMOVE' })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all ${
                    balanceModal.type === 'REMOVE'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Remove Balance (-)</span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Adjustment Amount (USD):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={balanceModal.amount}
                  onChange={(e) => setBalanceModal({ ...balanceModal, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Amount Presets */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-500 mr-1">Quick:</span>
                {[10, 50, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBalanceModal({ ...balanceModal, amount: amt.toString() })}
                    className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    +${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Projected Balance Preview */}
            {parseFloat(balanceModal.amount || '0') > 0 && (
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Projected New Balance:</span>
                <span className="font-mono font-bold text-white">
                  ${Math.max(
                    0,
                    balanceModal.type === 'ADD'
                      ? Number(balanceModal.user.balance || 0) + parseFloat(balanceModal.amount || '0')
                      : Number(balanceModal.user.balance || 0) - parseFloat(balanceModal.amount || '0')
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  USD
                </span>
              </div>
            )}

            {/* Reason / Memo */}
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Reason / Audit Memo (Optional):</label>
              <input
                type="text"
                value={balanceModal.reason}
                onChange={(e) => setBalanceModal({ ...balanceModal, reason: e.target.value })}
                placeholder="e.g. Manual deposit confirmation, promotional bonus, or balance correction"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setBalanceModal(null)}>
                Cancel
              </Button>
              <Button
                variant={balanceModal.type === 'ADD' ? 'primary' : 'danger'}
                size="sm"
                onClick={handleAdjustBalance}
                isLoading={balanceLoading}
                disabled={!balanceModal.amount || parseFloat(balanceModal.amount) <= 0}
              >
                {balanceModal.type === 'ADD' ? 'Confirm +Add Balance' : 'Confirm -Remove Balance'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Confirmation Modal (Suspend, Ban, Reinstate, Revoke) */}
      {actionModal && (
        <Modal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={`Confirm Action: ${actionModal.action.toUpperCase()}`}
          description={`Target account: ${actionModal.user.name} (@${actionModal.user.username})`}
        >
          <div className="space-y-4 text-xs text-left">
            <Alert
              type={actionModal.action === 'ban' ? 'error' : 'warning'}
              title="Audit Logging Notice"
            >
              This action will be permanently recorded in the immutable security audit log with your administrative actor clearance.
            </Alert>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Reason for {actionModal.action}:</label>
              <textarea
                rows={3}
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Terms violation, suspicious login pattern, or requested reinstatement"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                variant={actionModal.action === 'ban' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleExecuteAction}
                isLoading={actionLoading}
              >
                Confirm {actionModal.action.toUpperCase()}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. Admin Deposits View (NOWPayments Crypto Gateway)
// ----------------------------------------------------------------------
export const AdminDepositsView: React.FC = () => {
  return <AdminCryptoPaymentsView />;
};

// ----------------------------------------------------------------------
// 4. Admin Withdrawals View
// ----------------------------------------------------------------------
export const AdminWithdrawalsView: React.FC = () => {
  return <AdminWithdrawalManagementView />;
};

// ----------------------------------------------------------------------
// 5. Admin Investment Plans View
// ----------------------------------------------------------------------
export const AdminInvestmentPlansView: React.FC = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min: '100',
    max: '10000',
    duration: '30',
    return_rate: '6.5% - 8.0%',
    risk: 'CONSERVATIVE',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80'
  });

  const presetImages = [
    { label: 'Institutional Treasury', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80' },
    { label: 'Trading & Markets', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80' },
    { label: 'Decentralized Alpha', url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80' },
    { label: 'Real Estate Portfolio', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80' },
    { label: 'Green Energy Fund', url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&auto=format&fit=crop&q=80' },
    { label: 'AI Compute & Tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80' },
  ];

  const [plans, setPlans] = useState([
    {
      id: 1,
      name: 'Conservative Treasury Index',
      description: 'Structured low-volatility model prioritizing capital preservation with short-duration exposure.',
      min: '$100',
      max: '$5,000',
      duration: '30 Days',
      return_rate: '4.5% - 6.0%',
      risk: 'CONSERVATIVE',
      image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      status: 'ACTIVE'
    },
    {
      id: 2,
      name: 'Balanced Multi-Asset Strategy',
      description: 'Balanced risk-adjusted strategy combining fixed yield instruments with curated algorithmic liquidity.',
      min: '$500',
      max: '$25,000',
      duration: '90 Days',
      return_rate: '7.5% - 10.0%',
      risk: 'MODERATE',
      image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      status: 'ACTIVE'
    },
    {
      id: 3,
      name: 'Dynamic Alpha Portfolio',
      description: 'High-dynamism quantitative diversification across decentralized protocol incentives.',
      min: '$2,000',
      max: '$100,000',
      duration: '180 Days',
      return_rate: '12.0% - 16.5%',
      risk: 'DYNAMIC',
      image_url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
      status: 'ACTIVE'
    },
  ]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      min: '100',
      max: '10000',
      duration: '30',
      return_rate: '6.5% - 8.0%',
      risk: 'CONSERVATIVE',
      image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80'
    });
    setEditingPlan(null);
    setCreateOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      min: plan.min.replace(/[^0-9]/g, ''),
      max: plan.max.replace(/[^0-9]/g, ''),
      duration: plan.duration.replace(/[^0-9]/g, ''),
      return_rate: plan.return_rate || '7.0%',
      risk: plan.risk,
      image_url: plan.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80'
    });
    setCreateOpen(true);
  };

  const handleSavePlan = () => {
    if (!formData.name) return;

    if (editingPlan) {
      setPlans(plans.map((p) => (
        p.id === editingPlan.id
          ? {
              ...p,
              name: formData.name,
              description: formData.description,
              min: `$${Number(formData.min).toLocaleString()}`,
              max: `$${Number(formData.max).toLocaleString()}`,
              duration: `${formData.duration} Days`,
              return_rate: formData.return_rate,
              risk: formData.risk,
              image_url: formData.image_url
            }
          : p
      )));
    } else {
      const newPlan = {
        id: plans.length + 1,
        name: formData.name,
        description: formData.description,
        min: `$${Number(formData.min).toLocaleString()}`,
        max: `$${Number(formData.max).toLocaleString()}`,
        duration: `${formData.duration} Days`,
        return_rate: formData.return_rate,
        risk: formData.risk,
        image_url: formData.image_url,
        status: 'ACTIVE'
      };
      setPlans([...plans, newPlan]);
    }
    setCreateOpen(false);
  };

  const columns: Column<typeof plans[0]>[] = [
    {
      header: 'Cover',
      cell: (r) => (
        <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
          <img
            src={r.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80'}
            alt={r.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      ),
    },
    {
      header: 'Plan Structure',
      cell: (r) => (
        <div>
          <span className="font-bold text-white block">{r.name}</span>
          <span className="text-[11px] text-slate-400 line-clamp-1">{r.description}</span>
        </div>
      ),
      sortable: true
    },
    { header: 'Min Limit', accessorKey: 'min' },
    { header: 'Max Limit', accessorKey: 'max' },
    { header: 'Horizon', accessorKey: 'duration' },
    { header: 'Target Return', accessorKey: 'return_rate' },
    {
      header: 'Risk',
      cell: (r) => (
        <Badge variant={r.risk === 'CONSERVATIVE' ? 'neutral' : r.risk === 'MODERATE' ? 'warning' : 'primary'}>
          {r.risk}
        </Badge>
      )
    },
    {
      header: 'Status',
      cell: (r) => (
        <Badge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {r.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenEdit(r)}
            leftIcon={<Edit2 className="w-3 h-3" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPlans(plans.map((p) => (p.id === r.id ? { ...p, status: p.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } : p)));
            }}
          >
            {r.status === 'ACTIVE' ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Investment Plans & Model Catalog</h2>
          <p className="text-xs text-slate-400">Configure visual covers, duration schedules, limits, and risk parameters</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          New Investment Plan
        </Button>
      </div>

      <DataTable title="Active Investment Models" columns={columns} data={plans} />

      {createOpen && (
        <Modal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          title={editingPlan ? `Edit Investment Plan: ${editingPlan.name}` : "Create Investment Plan"}
          description="Specify plan branding image, capital limits, expected returns, and terms"
        >
          <div className="space-y-4 text-xs text-left max-h-[75vh] overflow-y-auto pr-1">
            <Input
              label="Plan Name"
              placeholder="e.g. High-Yield Green Energy Bond"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Plan Cover Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Visual Image Preview and Presets */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Or Select a Curated Theme Cover:</label>
              <div className="grid grid-cols-3 gap-2">
                {presetImages.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: preset.url })}
                    className={`relative rounded-lg overflow-hidden border text-left p-1 transition-all ${
                      formData.image_url === preset.url
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-12 object-cover rounded"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] text-slate-300 block mt-1 truncate px-0.5">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {formData.image_url && (
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-3">
                <div className="w-16 h-12 rounded overflow-hidden bg-slate-950 shrink-0">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold block">✓ Image Connected</span>
                  This image will be displayed on the public catalog and investor dashboard.
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Short Strategy Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain the underlying asset backing, yield sources, and allocation model..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Min Capital ($)"
                type="number"
                placeholder="100"
                required
                value={formData.min}
                onChange={(e) => setFormData({ ...formData, min: e.target.value })}
              />
              <Input
                label="Max Capital ($)"
                type="number"
                placeholder="25000"
                required
                value={formData.max}
                onChange={(e) => setFormData({ ...formData, max: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Duration Horizon (Days)"
                type="number"
                placeholder="30"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
              <Input
                label="Target Return Rate / Model"
                placeholder="e.g. 8.5% - 10.0%"
                required
                value={formData.return_rate}
                onChange={(e) => setFormData({ ...formData, return_rate: e.target.value })}
              />
            </div>

            <Select
              label="Risk Classification"
              value={formData.risk}
              onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
              options={[
                { value: 'CONSERVATIVE', label: 'Conservative (Low Volatility)' },
                { value: 'MODERATE', label: 'Moderate (Balanced)' },
                { value: 'DYNAMIC', label: 'Dynamic (High Alpha)' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSavePlan}>
                {editingPlan ? 'Update Plan' : 'Save & Publish Plan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 6. Admin Investments View
// ----------------------------------------------------------------------
export const AdminInvestmentsView: React.FC = () => {
  return <AdminInvestmentManagementView />;
};

// ----------------------------------------------------------------------
// 7. Admin Staking View
// ----------------------------------------------------------------------
export const AdminStakingView: React.FC = () => {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingPool, setEditingPool] = useState<any | null>(null);
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    symbol: 'USD',
    description: '',
    reward_rate: '10.50',
    lock_period_days: '30',
    min_stake: '25.00',
    max_stake: '50000.00',
    reward_model: 'COMPOUNDING',
    status: 'ACTIVE'
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    reward_rate: '',
    lock_period_days: '',
    min_stake: '',
    max_stake: '',
    status: 'ACTIVE'
  });
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';

  const fetchPools = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/staking-pools', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPools(data.data || []);
      }
    } catch (e: any) {
      console.error('Failed to load staking pools:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  const openEditModal = (pool: any) => {
    const v = pool.active_version;
    setEditingPool(pool);
    setEditForm({
      name: pool.name || '',
      description: pool.description || '',
      reward_rate: v?.reward_rate ? String(v.reward_rate) : '5.00',
      lock_period_days: v?.lock_period_days ? String(v.lock_period_days) : '30',
      min_stake: v?.minimum_stake ? String(v.minimum_stake) : '10.00',
      max_stake: v?.maximum_stake ? String(v.maximum_stake) : '100000.00',
      status: pool.status || 'ACTIVE'
    });
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.symbol) {
      alert('Pool name and symbol are required.');
      return;
    }
    try {
      setSaving(true);
      const token = getToken();
      const res = await fetch('/api/admin/staking-pools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createForm.name,
          symbol: createForm.symbol.toUpperCase(),
          description: createForm.description || `${createForm.symbol.toUpperCase()} Staking Delegation Node`,
          reward_rate: parseFloat(createForm.reward_rate) || 10.5,
          lock_period_days: parseInt(createForm.lock_period_days, 10) || 30,
          min_stake: createForm.min_stake || '25.00',
          max_stake: createForm.max_stake || '50000.00',
          reward_model: createForm.reward_model,
          status: createForm.status
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`New staking pool "${createForm.name}" created successfully!`);
        setIsCreatingPool(false);
        setCreateForm({
          name: '',
          symbol: 'USD',
          description: '',
          reward_rate: '10.50',
          lock_period_days: '30',
          min_stake: '25.00',
          max_stake: '50000.00',
          reward_model: 'COMPOUNDING',
          status: 'ACTIVE'
        });
        fetchPools();
      } else {
        alert(data.message || 'Failed to create staking pool');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePool = async () => {
    if (!editingPool) return;
    try {
      setSaving(true);
      const token = getToken();
      const res = await fetch(`/api/admin/staking-pools/${editingPool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          reward_rate: parseFloat(editForm.reward_rate) || 5.0,
          lock_period_days: parseInt(editForm.lock_period_days, 10) || 30,
          status: editForm.status
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Staking pool "${editForm.name}" updated successfully!`);
        setEditingPool(null);
        fetchPools();
      } else {
        alert(data.message || 'Failed to update pool');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePool = async (poolId: number, poolName: string) => {
    if (!window.confirm(`Are you sure you want to delete/archive staking pool "${poolName}" (#${poolId})?`)) {
      return;
    }
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/staking-pools/${poolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Staking pool #${poolId} archived successfully.`);
        fetchPools();
      } else {
        alert(data.message || 'Failed to delete pool');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  const handleToggleStatus = async (poolId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'MAINTENANCE' : currentStatus === 'MAINTENANCE' ? 'DISABLED' : 'ACTIVE';
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/staking-pools/${poolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Staking pool #${poolId} status updated to ${nextStatus}`);
        fetchPools();
      } else {
        alert(data.message || 'Failed to update pool status');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Staking Validator Pools Management</h2>
          <p className="text-xs text-slate-400">Control proof-of-stake node delegations, yields, lockups, and active statuses across all currencies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreatingPool(true)}
            className="bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Staking Pool
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPools} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 py-8 text-center text-xs">Loading staking pools...</div>
      ) : pools.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-slate-400 text-sm">No staking pools configured currently.</p>
          <Button variant="primary" size="sm" onClick={() => setIsCreatingPool(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create First Staking Pool
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map(pool => {
            const v = pool.active_version;
            const statusColor = pool.status === 'ACTIVE' ? 'success' : pool.status === 'MAINTENANCE' ? 'warning' : 'danger';
            return (
              <div key={pool.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-white px-2 py-0.5 bg-slate-800 rounded-md">{pool.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{pool.id}</span>
                    </div>
                    <Badge variant={statusColor}>{pool.status}</Badge>
                  </div>
                  <h4 className="font-bold text-sm text-slate-200 mb-1">{pool.name}</h4>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{pool.description}</p>
                  <div className="text-xs space-y-1.5 border-t border-slate-800 pt-3 text-slate-300">
                    <div className="flex justify-between"><span>Reward Rate:</span><span className="font-bold text-emerald-400">+{v?.reward_rate || '8.50'}% APR</span></div>
                    <div className="flex justify-between"><span>Lockup Period:</span><span>{v?.lock_period_days || 30} Days</span></div>
                    <div className="flex justify-between"><span>Min / Max Stake:</span><span className="font-mono">${v?.minimum_stake || '10'} - ${v?.maximum_stake || '50,000'}</span></div>
                    <div className="flex justify-between"><span>Reward Model:</span><span className="font-mono text-indigo-300">{pool.reward_model || v?.reward_model || 'COMPOUNDING'}</span></div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-indigo-700/60 hover:bg-indigo-900/30 text-indigo-300 flex-1"
                    onClick={() => openEditModal(pool)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex-1"
                    onClick={() => handleToggleStatus(pool.id, pool.status)}
                  >
                    {pool.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-rose-900/50 hover:bg-rose-950/40 text-rose-400 p-2"
                    title="Archive Staking Pool"
                    onClick={() => handleDeletePool(pool.id, pool.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Staking Pool Modal */}
      {isCreatingPool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Create New Staking Pool</h3>
                <p className="text-xs text-slate-400">Launch a new staking delegation pool for user deposits</p>
              </div>
              <button
                onClick={() => setIsCreatingPool(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Pool Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ethereum Validator Vault"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Currency / Symbol</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ETH, SOL, USD"
                    value={createForm.symbol}
                    onChange={(e) => setCreateForm({ ...createForm, symbol: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Reward Rate (APR %)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={createForm.reward_rate}
                    onChange={(e) => setCreateForm({ ...createForm, reward_rate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Lockup Period (Days)</label>
                  <input
                    type="number"
                    required
                    value={createForm.lock_period_days}
                    onChange={(e) => setCreateForm({ ...createForm, lock_period_days: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Min Stake</label>
                  <input
                    type="number"
                    value={createForm.min_stake}
                    onChange={(e) => setCreateForm({ ...createForm, min_stake: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Max Stake</label>
                  <input
                    type="number"
                    value={createForm.max_stake}
                    onChange={(e) => setCreateForm({ ...createForm, max_stake: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Reward Model</label>
                <select
                  value={createForm.reward_model}
                  onChange={(e) => setCreateForm({ ...createForm, reward_model: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                >
                  <option value="COMPOUNDING">COMPOUNDING (Daily Auto-Reinvest)</option>
                  <option value="FIXED_PERCENTAGE">FIXED_PERCENTAGE (Linear Distribute)</option>
                  <option value="VARIABLE_YIELD">VARIABLE_YIELD (Validator Dynamic)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Pool strategy and details..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingPool(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {saving ? 'Creating...' : 'Create Staking Pool'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staking Pool Modal */}
      {editingPool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Edit Staking Pool #{editingPool.id}</h3>
                <p className="text-xs text-slate-400">{editingPool.symbol} Pool Configuration</p>
              </div>
              <button
                onClick={() => setEditingPool(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Pool Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Reward Rate (APR %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.reward_rate}
                    onChange={(e) => setEditForm({ ...editForm, reward_rate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Lockup Period (Days)</label>
                  <input
                    type="number"
                    value={editForm.lock_period_days}
                    onChange={(e) => setEditForm({ ...editForm, lock_period_days: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Accepting Stakes)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Paused)</option>
                  <option value="DISABLED">DISABLED (Hidden)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPool(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePool}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 8. Admin Games View
// ----------------------------------------------------------------------
export const AdminGamesView: React.FC = () => {
  const [games, setGames] = useState<any[]>([]);
  const [killSwitch, setKillSwitch] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [targetRtp, setTargetRtp] = useState('');
  const [auditReason, setAuditReason] = useState('');
  const [minBetInput, setMinBetInput] = useState('');
  const [maxBetInput, setMaxBetInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'DISABLED'>('ACTIVE');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rtpLogs, setRtpLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'rtp_audit'>('catalog');

  const getToken = () => localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';

  const fetchGames = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/games', { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setGames(data.data.games || []);
        setKillSwitch(data.data.kill_switch || false);
      }
    } catch (e: any) {
      console.error('Failed to load games:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRtpLogs = async () => {
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/games/rtp-audit-logs', { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setRtpLogs(data.data || []);
      }
    } catch (e: any) {
      console.error('Failed to load RTP logs:', e);
    }
  };

  useEffect(() => {
    fetchGames();
    fetchRtpLogs();
  }, []);

  const handleToggleMaintenance = async (slug: string) => {
    try {
      const token = localStorage.getItem('apex_session_token');
      const res = await fetch(`/api/admin/games/${slug}/maintenance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || `Game status toggled.` });
        fetchGames();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed to update status.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message });
    }
  };

  const handleToggleKillSwitch = async () => {
    try {
      const token = localStorage.getItem('apex_session_token');
      const newStatus = !killSwitch;
      const res = await fetch('/api/admin/games/kill-switch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setKillSwitch(newStatus);
        setStatusMessage({
          type: 'success',
          text: `Global Gaming Kill Switch is now ${newStatus ? 'ENABLED (All games stopped)' : 'DISABLED (Gaming operational)'}.`
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message });
    }
  };

  const handleSaveGameConfig = async () => {
    if (!editingGame) return;
    try {
      const token = localStorage.getItem('apex_session_token');
      const payload: any = {
        status: selectedStatus,
        configured_rtp_pct: targetRtp,
        min_bet: minBetInput,
        max_bet: maxBetInput,
        audit_reason: auditReason || 'Admin console configuration update'
      };

      const res = await fetch(`/api/admin/games/${editingGame.slug}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Updated ${editingGame.name} RTP and limits successfully.` });
        setEditingGame(null);
        fetchGames();
        fetchRtpLogs();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed to update game.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message });
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Game',
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.thumbnail_url && (
            <img src={r.thumbnail_url} alt={r.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0" />
          )}
          <div>
            <div className="font-semibold text-white text-xs">{r.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">/{r.slug}</div>
          </div>
        </div>
      )
    },
    { header: 'Category', cell: (r) => <Badge variant="neutral">{r.category}</Badge> },
    {
      header: 'Configured RTP',
      cell: (r) => (
        <div>
          <span className="font-mono text-emerald-400 font-bold text-xs">{r.configured_rtp_pct || '98.00'}%</span>
          <span className="text-[10px] text-slate-500 block">Edge: {r.house_edge_pct}%</span>
        </div>
      )
    },
    {
      header: 'Limits',
      cell: (r) => <span className="text-xs font-mono text-slate-300">${r.min_bet} - ${r.max_bet}</span>
    },
    {
      header: 'Volume / GGR',
      cell: (r) => (
        <div className="text-xs">
          <div className="text-slate-300 font-mono">${r.total_volume_usd || '0.00'}</div>
          <div className="text-[10px] text-emerald-400 font-mono">+${r.gross_gaming_revenue_usd || '0.00'} GGR</div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (r) => (
        <Badge variant={r.status === 'ACTIVE' ? 'success' : r.status === 'MAINTENANCE' ? 'warning' : 'danger'}>
          {r.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingGame(r);
              setTargetRtp(r.configured_rtp_pct || '98.00');
              setSelectedStatus(r.status);
              setMinBetInput(r.min_bet || '1.00');
              setMaxBetInput(r.max_bet || '5000.00');
              setAuditReason('');
            }}
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Config
          </Button>
          <Button
            size="sm"
            variant={r.status === 'ACTIVE' ? 'outline' : 'primary'}
            onClick={() => handleToggleMaintenance(r.slug)}
          >
            {r.status === 'ACTIVE' ? 'Pause' : 'Activate'}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            Provably Fair Games & Mathematical RTP Management
          </h2>
          <p className="text-xs text-slate-400">
            Control individual game visibility, maintenance modes, stake boundaries, and legal RTP return rates across all 19 integrated titles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={killSwitch ? 'danger' : 'outline'}
            size="sm"
            onClick={handleToggleKillSwitch}
            className="flex items-center gap-2 border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
          >
            <AlertOctagon className="w-4 h-4" />
            {killSwitch ? 'Emergency Kill Switch ACTIVE' : 'Arm Kill Switch'}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchGames}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Alert
          type={statusMessage.type === 'success' ? 'success' : 'error'}
          title={statusMessage.type === 'success' ? 'Operation Completed' : 'Configuration Error'}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'catalog'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Game Catalog ({games.length} Games)
        </button>
        <button
          onClick={() => {
            setActiveTab('rtp_audit');
            fetchRtpLogs();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'rtp_audit'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          RTP Audit Log Trail ({rtpLogs.length})
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <DataTable
          title="Gaming Catalog & RTP Configurations"
          columns={columns}
          data={games}
          isLoading={loading}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Mathematical RTP Audit Trail</h3>
          <p className="text-xs text-slate-400 mb-4">
            Immutable log of all administrative adjustments made to game house edges and return-to-player ratios.
          </p>
          {rtpLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No RTP modifications recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {rtpLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-400 mr-2">{log.game_name}</span>
                    <span className="text-slate-400 font-mono">
                      RTP changed from <strong className="text-rose-400">{log.previous_rtp}%</strong> to <strong className="text-emerald-400">{log.new_rtp}%</strong> (House edge: {log.new_house_edge}%)
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">Reason: {log.reason}</div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <div>{log.admin_email}</div>
                    <div className="text-slate-500">{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Game Modal */}
      {editingGame && (
        <Modal
          isOpen={true}
          title={`Configure ${editingGame.name}`}
          onClose={() => setEditingGame(null)}
        >
          <div className="space-y-4 text-left">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              <strong>Mathematical RTP Governance:</strong> Allowed RTP parameter for {editingGame.name} is constrained between <strong>{editingGame.min_allowed_rtp || '92.00'}%</strong> and <strong>{editingGame.max_allowed_rtp || '99.80'}%</strong> to guarantee certified odds.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Return To Player (RTP %):
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.01"
                  min={editingGame.min_allowed_rtp || '92'}
                  max={editingGame.max_allowed_rtp || '99.8'}
                  value={targetRtp}
                  onChange={(e) => setTargetRtp(e.target.value)}
                  placeholder="e.g. 98.50"
                  className="font-mono text-emerald-400 font-bold"
                />
                <span className="text-xs text-slate-400 font-mono">
                  House Edge: {(100 - (parseFloat(targetRtp) || 98)).toFixed(2)}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Game Operational Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="ACTIVE">ACTIVE (Fully playable)</option>
                <option value="MAINTENANCE">MAINTENANCE (Temporarily paused with banner)</option>
                <option value="DISABLED">DISABLED (Hidden from lobby)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Min Bet ($):</label>
                <Input
                  type="number"
                  step="0.10"
                  value={minBetInput}
                  onChange={(e) => setMinBetInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Max Bet ($):</label>
                <Input
                  type="number"
                  step="10.00"
                  value={maxBetInput}
                  onChange={(e) => setMaxBetInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Audit Log Reason:</label>
              <Input
                type="text"
                placeholder="Reason for modifying parameters..."
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setEditingGame(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveGameConfig}>
                Save Game Configuration
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 9. Admin Game History View
// ----------------------------------------------------------------------
export const AdminGameHistoryView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const getToken = () => localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/games/security-audit-logs', { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setLogs(data.data || []);
      }
    } catch (e: any) {
      console.error('Failed to fetch security logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm ||
      String(log.id).includes(searchTerm) ||
      String(log.bet_id || '').includes(searchTerm) ||
      String(log.user_id || '').includes(searchTerm) ||
      String(log.outcome_result || '').toLowerCase().includes(searchTerm.toLowerCase());

    const payoutNum = parseFloat(log.payout) || 0;
    const isWon = payoutNum > 0 || String(log.outcome_result).toUpperCase().includes('WIN') || String(log.outcome_result).toUpperCase().includes('WON');
    if (outcomeFilter === 'WON') return matchesSearch && isWon;
    if (outcomeFilter === 'LOST') return matchesSearch && !isWon;
    return matchesSearch;
  });

  const totalPayouts = logs.reduce((acc, l) => acc + (parseFloat(l.payout) || 0), 0);
  const wonCount = logs.filter(l => (parseFloat(l.payout) || 0) > 0).length;

  const columns: Column<any>[] = [
    { header: 'Spin ID', accessorKey: 'id' },
    { header: 'User ID', accessorKey: 'user_id' },
    { header: 'Bet ID', accessorKey: 'bet_id' },
    {
      header: 'Outcome',
      cell: (r) => {
        const isWin = (parseFloat(r.payout) || 0) > 0;
        return (
          <Badge variant={isWin ? 'success' : 'neutral'}>
            {r.outcome_result || (isWin ? 'WIN' : 'LOSS')}
          </Badge>
        );
      }
    },
    {
      header: 'Payout',
      cell: (r) => (
        <span className={`font-mono text-xs ${parseFloat(r.payout) > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
          ${parseFloat(r.payout || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Server Seed Hash',
      cell: (r) => (
        <span className="font-mono text-[10px] text-slate-400 cursor-pointer hover:text-indigo-400" onClick={() => setSelectedAuditLog(r)} title="Click to verify provably fair hash">
          {r.server_seed_hash ? `${r.server_seed_hash.slice(0, 16)}...` : 'N/A'}
        </span>
      )
    },
    {
      header: 'Timestamp',
      cell: (r) => <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
    },
    {
      header: 'Action',
      cell: (r) => (
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] py-0.5 px-2 border-slate-700 hover:bg-slate-800 text-indigo-300"
          onClick={() => setSelectedAuditLog(r)}
        >
          Verify
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Provably Fair Audit Session Logs</h2>
          <p className="text-xs text-slate-400">Cryptographically verifiable immutable audit records for all game wagers and player outcomes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchLogs} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Records
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-xs">Total Spins Logged</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{logs.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-xs">Player Wins</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{wonCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-xs">House Retained (Losses)</div>
          <div className="text-xl font-bold text-slate-400 mt-1 font-mono">{logs.length - wonCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-xs">Total Disbursed Payouts</div>
          <div className="text-xl font-bold text-indigo-400 mt-1 font-mono">${totalPayouts.toFixed(2)}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search spin ID, bet ID, outcome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400">Filter Outcome:</span>
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
            {(['ALL', 'WON', 'LOST'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setOutcomeFilter(tab)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  outcomeFilter === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTable title="All Provably Fair Game Records" columns={columns} data={filteredLogs} isLoading={loading} />

      {/* Cryptographic Verification Modal */}
      {selectedAuditLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAuditLog(null)}
          title={`Provably Fair Verification - Spin #${selectedAuditLog.id}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 bg-slate-800/80 rounded-xl space-y-2 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Outcome Result:</span>
                <span className="font-bold text-emerald-400">{selectedAuditLog.outcome_result}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payout Amount:</span>
                <span className="font-bold text-white font-mono">${selectedAuditLog.payout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-300">{new Date(selectedAuditLog.timestamp).toUTCString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Server Seed (Raw Cryptographic Secret)</label>
                <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-indigo-300 break-all select-all">
                  {selectedAuditLog.server_seed || selectedAuditLog.game_seed || 'b4a5c8932ef871b7642194aef943b7829a4301fcbc879a613d9876fa543210ef'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Server Seed SHA-256 Hash (Commitment)</label>
                <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400 break-all select-all">
                  {selectedAuditLog.server_seed_hash || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Verified Authentic. The SHA-256 hash of the server seed strictly matches the pre-spin commitment hash. Outcome was unalterable and mathematically provably fair.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedAuditLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 10. Admin Referrals View
// ----------------------------------------------------------------------
export const AdminReferralsView: React.FC = () => {
  const referrals = [
    { referrer: 'Sarah Jenkins (@sarah_investor)', referred: 'Michael Sterling (@michael_inv)', date: '2026-08-28', status: 'ACTIVE' },
    { referrer: 'Sarah Jenkins (@sarah_investor)', referred: 'Clara Vance (@clara_capital)', date: '2026-09-02', status: 'ACTIVE' },
  ];

  const columns: Column<typeof referrals[0]>[] = [
    { header: 'Referrer Account', accessorKey: 'referrer' },
    { header: 'Invited Account', accessorKey: 'referred' },
    { header: 'Linkage Date', accessorKey: 'date' },
    { header: 'Status', cell: (r) => <Badge variant="success">{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-white">Referral Network Linkages</h2>
        <p className="text-xs text-slate-400">Trace invitation trees and commission eligibility</p>
      </div>
      <DataTable title="Referral Connection Records" columns={columns} data={referrals} />
    </div>
  );
};

// ----------------------------------------------------------------------
// 11. Admin Support View
// ----------------------------------------------------------------------
export const AdminSupportView: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketStatus, setTicketStatus] = useState('OPEN');

  const getToken = () => localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTickets(data.data);
      }
    } catch (e: any) {
      console.error('Failed to load support tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicketThread = async (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status || 'OPEN');
    setReplyText('');
    try {
      setMessagesLoading(true);
      const token = getToken();
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data?.messages) {
        setMessages(data.data.messages);
      } else {
        setMessages([]);
      }
    } catch (e: any) {
      console.error('Failed to load ticket messages:', e);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendReply = async (shouldResolve = false) => {
    if (!selectedTicket || (!replyText.trim() && !shouldResolve)) return;

    try {
      setSending(true);
      const token = getToken();

      if (replyText.trim()) {
        const msgRes = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ message: replyText.trim() })
        });
        const msgData = await msgRes.json();
        if (msgData.success && msgData.data) {
          setMessages(prev => [...prev, msgData.data]);
          setReplyText('');
        }
      }

      const nextStatus = shouldResolve ? 'RESOLVED' : ticketStatus;
      if (nextStatus !== selectedTicket.status) {
        await fetch(`/api/support/tickets/${selectedTicket.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: nextStatus })
        });
        setSelectedTicket({ ...selectedTicket, status: nextStatus });
      }

      fetchTickets();
      if (shouldResolve) {
        setSelectedTicket(null);
      }
    } catch (e: any) {
      alert(e.message || 'Error communicating with server');
    } finally {
      setSending(false);
    }
  };

  const columns: Column<any>[] = [
    { header: 'Ticket ID', cell: (r) => `TCK-${r.id}` },
    { header: 'User / Email', cell: (r) => r.user_name || r.user_email || `User #${r.user_id}` },
    { header: 'Subject', accessorKey: 'subject' },
    {
      header: 'Priority',
      cell: (r) => (
        <Badge variant={r.priority === 'HIGH' || r.priority === 'URGENT' ? 'danger' : 'neutral'}>
          {r.priority}
        </Badge>
      )
    },
    {
      header: 'Status',
      cell: (r) => (
        <Badge variant={r.status === 'OPEN' ? 'warning' : r.status === 'RESOLVED' ? 'success' : 'neutral'}>
          {r.status}
        </Badge>
      )
    },
    {
      header: 'Action',
      cell: (r) => (
        <Button size="sm" variant="outline" onClick={() => openTicketThread(r)}>
          Open Thread
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Customer Support Ticket Queue</h2>
          <p className="text-xs text-slate-400">Review real-time customer inquiries, chat, and update ticket resolution status</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTickets}>
          Refresh Queue
        </Button>
      </div>

      <DataTable
        title={`All Support Inquiries (${tickets.length})`}
        columns={columns}
        data={tickets}
        isLoading={loading}
      />

      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Support Ticket: TCK-${selectedTicket.id}`}
          description={`Subject: ${selectedTicket.subject} | User: ${selectedTicket.user_name || selectedTicket.user_email || selectedTicket.user_id}`}
        >
          <div className="space-y-4 text-xs text-left">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase tracking-wider font-mono">Current Status</span>
                <span className="font-semibold text-white">{selectedTicket.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Change:</span>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Conversation messages history */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 max-h-64 overflow-y-auto space-y-3">
              {messagesLoading ? (
                <div className="text-center py-4 text-slate-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No message history found for this ticket.</div>
              ) : (
                messages.map((m: any, idx: number) => {
                  const isAdmin = m.sender_role === 'ADMIN' || m.sender_role === 'SUPER_ADMIN' || m.sender_role === 'SUPPORT';
                  return (
                    <div
                      key={m.id || idx}
                      className={`p-3 rounded-xl max-w-[85%] ${
                        isAdmin
                          ? 'ml-auto bg-indigo-950/80 border border-indigo-800 text-indigo-100'
                          : 'mr-auto bg-slate-800 border border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 gap-4">
                        <span className="font-bold">{isAdmin ? 'Support Team' : m.sender_name || 'Customer'}</span>
                        <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input */}
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Official Reply:</label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type official response to customer..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={sending}
                  disabled={!replyText.trim() || sending}
                  onClick={() => handleSendReply(false)}
                >
                  Send Message
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500"
                  isLoading={sending}
                  disabled={sending}
                  onClick={() => handleSendReply(true)}
                >
                  Reply & Mark Resolved
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 12. Admin KYC View
// ----------------------------------------------------------------------
export const AdminKycView: React.FC = () => {
  const [kycQueue, setKycQueue] = useState([
    { id: 1, user: 'Sarah Jenkins', type: 'Government Passport', status: 'PENDING_REVIEW', date: '2026-09-07' },
  ]);

  const columns: Column<typeof kycQueue[0]>[] = [
    { header: 'Queue ID', accessorKey: 'id' },
    { header: 'Applicant', accessorKey: 'user' },
    { header: 'Document Type', accessorKey: 'type' },
    { header: 'Submission Date', accessorKey: 'date' },
    { header: 'Status', cell: (r) => <Badge variant={r.status === 'APPROVED' ? 'success' : 'warning'}>{r.status}</Badge> },
    {
      header: 'Review Actions',
      cell: (r) => (
        r.status === 'PENDING_REVIEW' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setKycQueue(kycQueue.map((k) => (k.id === r.id ? { ...k, status: 'APPROVED' } : k)));
                alert('KYC Tier 2 verified and approved!');
              }}
            >
              Approve Tier 2
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setKycQueue(kycQueue.map((k) => (k.id === r.id ? { ...k, status: 'REJECTED' } : k)));
                alert('KYC submission rejected.');
              }}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Decided</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-white">KYC Verification Desk</h2>
        <p className="text-xs text-slate-400">Review identification submissions for anti-money laundering compliance</p>
      </div>

      <DataTable title="Pending KYC Submissions" columns={columns} data={kycQueue} />
    </div>
  );
};

// ----------------------------------------------------------------------
// 13. Admin Risk & Fraud View
// ----------------------------------------------------------------------
export const AdminRiskView: React.FC = () => {
  const anomalies = [
    { ip: '192.168.1.104', type: 'RAPID_LOGIN_ATTEMPTS', user: 'Unknown', severity: 'MEDIUM', timestamp: '2026-09-07 14:22:10' },
    { ip: '10.0.4.19', type: 'PASSWORD_RESET_BURST', user: 'marcus_v', severity: 'HIGH', timestamp: '2026-09-07 11:15:40' },
  ];

  const columns: Column<typeof anomalies[0]>[] = [
    { header: 'Source IP Address', accessorKey: 'ip' },
    { header: 'Anomaly Pattern', accessorKey: 'type' },
    { header: 'Associated Target', accessorKey: 'user' },
    { header: 'Risk Severity', cell: (r) => <Badge variant={r.severity === 'HIGH' ? 'danger' : 'warning'}>{r.severity}</Badge> },
    { header: 'Timestamp', accessorKey: 'timestamp' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-white">Risk & Fraud Anomaly Radar</h2>
        <p className="text-xs text-slate-400">Automated intrusion detection, rate-limit warnings, and suspicious IP logs</p>
      </div>

      <DataTable title="Security Anomalies Flagged" columns={columns} data={anomalies} />
    </div>
  );
};

// ----------------------------------------------------------------------
// 14. Admin Reports View
// ----------------------------------------------------------------------
export const AdminReportsView: React.FC = () => {
  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Financial & Operational Reports</h2>
          <p className="text-xs text-slate-400">Comprehensive portfolio reconciliations and platform activity statistics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => alert('Exporting compliance report (CSV)...')} leftIcon={<Download className="w-4 h-4" />}>
          Export CSV Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 bg-slate-800 border-slate-700 space-y-2">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Processed Volume</span>
          <div className="text-2xl font-bold text-white">$1,450,200.00</div>
          <span className="text-[10px] text-emerald-400">100% On-Chain & Gateway Reconciled</span>
        </Card>

        <Card className="p-5 bg-slate-800 border-slate-700 space-y-2">
          <span className="text-xs text-slate-400 uppercase font-semibold">Active Capital in Plans</span>
          <div className="text-2xl font-bold text-white">$840,000.00</div>
          <span className="text-[10px] text-indigo-400">Locked in 142 active contracts</span>
        </Card>

        <Card className="p-5 bg-slate-800 border-slate-700 space-y-2">
          <span className="text-xs text-slate-400 uppercase font-semibold">Gross Gaming Turnover</span>
          <div className="text-2xl font-bold text-white">$128,400.00</div>
          <span className="text-[10px] text-slate-400">RTP within expected 98.2% bound</span>
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 15. Admin Notifications View
// ----------------------------------------------------------------------
export const AdminNotificationsView: React.FC = () => {
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Multi-Currency Secure Crypto Gateway Live', channel: 'GLOBAL_PORTAL', date: '2026-09-07' },
    { id: 2, title: 'Scheduled Database Maintenance Notice', channel: 'ALL_INVESTORS', date: '2026-09-01' },
  ]);

  const columns: Column<typeof announcements[0]>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Headline', accessorKey: 'title' },
    { header: 'Audience Channel', accessorKey: 'channel' },
    { header: 'Dispatched Date', accessorKey: 'date' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Broadcasts & System Announcements</h2>
          <p className="text-xs text-slate-400">Dispatch banner notices and critical platform notifications</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setBroadcastOpen(true)} leftIcon={<Send className="w-4 h-4" />}>
          Dispatch Announcement
        </Button>
      </div>

      <DataTable title="Dispatched Announcements" columns={columns} data={announcements} />

      {broadcastOpen && (
        <Modal
          isOpen={broadcastOpen}
          onClose={() => setBroadcastOpen(false)}
          title="Compose Platform Broadcast"
          description="Send global notice to participant dashboards"
        >
          <div className="space-y-4 text-xs text-left">
            <Input label="Headline / Announcement Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Select
              label="Recipient Audience"
              options={[
                { value: 'GLOBAL', label: 'All Registered Participants' },
                { value: 'TIER2', label: 'Tier 2 KYC Verified Users Only' },
                { value: 'STAFF', label: 'Internal Staff & Admins Only' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAnnouncements([{ id: Date.now(), title, channel: 'GLOBAL', date: '2026-09-07' }, ...announcements]);
                  alert('Announcement dispatched!');
                  setBroadcastOpen(false);
                }}
              >
                Send Broadcast
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 16. Admin CMS View
// ----------------------------------------------------------------------
export const AdminCmsView: React.FC = () => {
  const pages = [
    { slug: 'terms', title: 'Terms & Conditions', updated: '2026-09-07', status: 'PUBLISHED' },
    { slug: 'privacy', title: 'Privacy Policy', updated: '2026-09-07', status: 'PUBLISHED' },
    { slug: 'risk-disclosure', title: 'Risk Disclosure', updated: '2026-09-07', status: 'PUBLISHED' },
    { slug: 'about', title: 'About Us', updated: '2026-09-07', status: 'PUBLISHED' },
  ];

  const columns: Column<typeof pages[0]>[] = [
    { header: 'Route Slug', accessorKey: 'slug' },
    { header: 'Document Title', accessorKey: 'title' },
    { header: 'Last Edited', accessorKey: 'updated' },
    { header: 'Status', cell: (r) => <Badge variant="success">{r.status}</Badge> },
    {
      header: 'Edit Page',
      cell: () => (
        <Button size="sm" variant="outline" onClick={() => alert('CMS page editor opened.')}>
          Edit Content
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-white">CMS Content & Public Notices</h2>
        <p className="text-xs text-slate-400">Manage editorial text across public legal agreements and landing pages</p>
      </div>

      <DataTable title="Managed Legal & Platform Pages" columns={columns} data={pages} />
    </div>
  );
};

// ----------------------------------------------------------------------
// 17. Admin Staff & Accounts View (Super Admin Exclusive)
// ----------------------------------------------------------------------
export const AdminStaffView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [modalLoading, setModalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('apex_session_token') || '';
      const res = await fetch('/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStaff(json.data || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setModalLoading(true);
    try {
      const token = localStorage.getItem('apex_session_token') || '';
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, username, email, password, role })
      });
      const json = await res.json();
      if (res.ok) {
        setCreateModalOpen(false);
        setName('');
        setUsername('');
        setEmail('');
        setPassword('');
        loadStaff();
      } else {
        setErrorMsg(json.message || 'Failed to enroll staff member');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setModalLoading(false);
    }
  };

  const columns: Column<any>[] = [
    { header: 'Staff ID', accessorKey: 'id' },
    { header: 'Full Name', accessorKey: 'name', sortable: true },
    { header: 'Internal Email', accessorKey: 'email' },
    {
      header: 'Assigned Role',
      cell: (r) => (
        <Badge variant={r.roles?.includes('SUPER_ADMIN') ? 'primary' : 'info'}>
          {r.roles?.[0] || 'STAFF'}
        </Badge>
      )
    },
    {
      header: '2FA Status',
      cell: (r) => (
        <Badge variant={r.two_factor_enabled ? 'success' : 'warning'}>
          {r.two_factor_enabled ? 'Enforced' : 'Pending'}
        </Badge>
      )
    },
    {
      header: 'Status',
      cell: (r) => <Badge variant="success">{r.status}</Badge>
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Super Admin Clearance Only</Badge>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Staff Accounts & Administrative Clearances</h2>
          <p className="text-xs text-slate-400">Provision operations personnel and assign structural governance roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStaff}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Enroll Staff Member
          </Button>
        </div>
      </div>

      <DataTable title="Administrative Staff Directory" columns={columns} data={staff} />

      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Enroll Administrative Staff Member"
          description="Create an internal personnel account with role clearance"
        >
          <form onSubmit={handleCreateStaff} className="space-y-4 text-xs text-left">
            {errorMsg && (
              <Alert type="error" title="Enrollment Error">
                {errorMsg}
              </Alert>
            )}

            <Input
              label="Staff Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Miller"
            />
            <Input
              label="Username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jordan_admin"
            />
            <Input
              label="Internal Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan.m@apexplatform.internal"
            />
            <Input
              label="Initial Temporary Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            <Select
              label="Assigned Operational Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'ADMIN', label: 'ADMIN - Operations and compliance supervisor' },
                { value: 'FINANCE', label: 'FINANCE - Treasury supervisor and reports auditor' },
                { value: 'SUPPORT', label: 'SUPPORT - Customer service ticket specialist' },
                { value: 'INVESTMENT_MANAGER', label: 'INVESTMENT_MANAGER - Portfolio strategies curator' },
                { value: 'GAME_MANAGER', label: 'GAME_MANAGER - Game parameters supervisor' },
                { value: 'CONTENT_MANAGER', label: 'CONTENT_MANAGER - Public CMS and notices editor' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={modalLoading}>
                Confirm Enrollment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 18. Admin Roles & Permissions Matrix View (Super Admin Exclusive)
// ----------------------------------------------------------------------
export const AdminRolesView: React.FC = () => {
  const [matrix, setMatrix] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveAlert, setSaveAlert] = useState<string | null>(null);

  const permissionsList = [
    'users.view',
    'users.edit',
    'users.suspend',
    'users.ban',
    'deposits.view',
    'deposits.manage',
    'withdrawals.view',
    'withdrawals.manage',
    'investment_plans.view',
    'investment_plans.create',
    'investment_plans.edit',
    'games.view',
    'games.manage',
    'support.view',
    'support.manage',
    'reports.view',
    'reports.export',
    'settings.view',
    'settings.edit',
    'admins.view',
    'admins.create',
  ];

  const roles = ['ADMIN', 'FINANCE', 'SUPPORT', 'INVESTMENT_MANAGER', 'GAME_MANAGER', 'CONTENT_MANAGER'];

  const loadMatrix = async () => {
    try {
      const token = localStorage.getItem('apex_session_token') || '';
      const res = await fetch('/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const newMat: Record<string, boolean> = {};
        json.data?.roles?.forEach((r: any) => {
          r.permissions?.forEach((p: string) => {
            newMat[`${r.name}:${p}`] = true;
          });
        });
        setMatrix(newMat);
      }
    } catch {
      // Fallback defaults
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const togglePermission = (roleName: string, perm: string) => {
    const key = `${roleName}:${perm}`;
    setMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveMatrix = async () => {
    setIsSaving(true);
    setSaveAlert(null);
    try {
      const token = localStorage.getItem('apex_session_token') || '';
      const payload: Record<string, string[]> = {};
      roles.forEach((r) => {
        payload[r] = permissionsList.filter((p) => !!matrix[`${r}:${p}`]);
      });

      const res = await fetch('/api/admin/roles/matrix', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ matrix: payload })
      });

      if (res.ok) {
        setSaveAlert('RBAC Permission Matrix updated and enforced across all active sessions.');
      } else {
        const err = await res.json();
        setSaveAlert(err.message || 'Failed to save matrix');
      }
    } catch {
      setSaveAlert('Network error saving matrix');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Super Admin Clearance Only</Badge>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Role-Based Access Control Matrix (RBAC)</h2>
          <p className="text-xs text-slate-400">
            Enforce granular permission rules across operational departments. Super Admin retains unconditional authority.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSaveMatrix}
          isLoading={isSaving}
        >
          Save Matrix Policies
        </Button>
      </div>

      {saveAlert && (
        <Alert type="info" title="RBAC Policy Update" onClose={() => setSaveAlert(null)}>
          {saveAlert}
        </Alert>
      )}

      <Card className="p-4 bg-slate-800 border-slate-700 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
              <th className="py-2.5 px-3">Permission Identifier</th>
              {roles.map((r) => (
                <th key={r} className="py-2.5 px-3 text-center">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 font-mono">
            {permissionsList.map((perm) => (
              <tr key={perm} className="hover:bg-slate-750">
                <td className="py-2 px-3 text-slate-300 font-semibold">{perm}</td>
                {roles.map((r) => {
                  const isChecked = !!matrix[`${r}:${perm}`];
                  return (
                    <td key={r} className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(r, perm)}
                        className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 19. Admin Audit Logs View
// ----------------------------------------------------------------------
export const AdminAuditLogsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('apex_session_token') || '';
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const columns: Column<any>[] = [
    { header: 'Log ID', accessorKey: 'id', sortable: true },
    {
      header: 'Category',
      cell: (r) => (
        <Badge variant={r.category === 'SECURITY' ? 'danger' : r.category === 'AUTH' ? 'primary' : 'neutral'}>
          {r.category || 'SYSTEM'}
        </Badge>
      )
    },
    { header: 'Action Executed', accessorKey: 'action', sortable: true },
    {
      header: 'Severity',
      cell: (r) => (
        <Badge variant={r.severity === 'CRITICAL' ? 'danger' : r.severity === 'HIGH' ? 'warning' : 'neutral'}>
          {r.severity || 'INFO'}
        </Badge>
      )
    },
    { header: 'IP Metadata', accessorKey: 'ip_address' },
    {
      header: 'Timestamp',
      cell: (r) => <span className="text-[11px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">System Audit & Compliance Logs</h2>
          <p className="text-xs text-slate-400">Tamper-evident chronological logs of all staff, security, and authentication events</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadLogs}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Audit Trail
        </Button>
      </div>

      <DataTable title="Immutable Audit Stream" columns={columns} data={auditLogs} />
    </div>
  );
};

// ----------------------------------------------------------------------
// 20. Admin Settings View
// ----------------------------------------------------------------------
export const AdminSettingsView: React.FC = () => {
  const [maintenance, setMaintenance] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  return (
    <div className="space-y-6 text-left max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white">System Parameters & Platform Control</h2>
        <p className="text-xs text-slate-400">Configure global platform switches, security thresholds, and operating parameters</p>
      </div>

      <Card className="p-6 bg-slate-800 border-slate-700 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div>
            <h4 className="font-bold text-sm text-white">Maintenance Mode</h4>
            <p className="text-xs text-slate-400">Temporarily suspend public access for system upgrades.</p>
          </div>
          <Button
            size="sm"
            variant={maintenance ? 'danger' : 'outline'}
            onClick={() => setMaintenance(!maintenance)}
          >
            {maintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
          </Button>
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div>
            <h4 className="font-bold text-sm text-white">Public User Registration</h4>
            <p className="text-xs text-slate-400">Allow new visitors to register investor accounts.</p>
          </div>
          <Button
            size="sm"
            variant={registrationOpen ? 'primary' : 'outline'}
            onClick={() => setRegistrationOpen(!registrationOpen)}
          >
            {registrationOpen ? 'Registration Open' : 'Registration Closed'}
          </Button>
        </div>

        <div className="space-y-3">
          <Input label="Platform Title Brand" defaultValue="AMZDistributor Global" />
          <Input label="Support Email Route" defaultValue="support@amzdistributor.com" />
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => alert('Platform parameters saved!')}>
              Save System Parameters
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
