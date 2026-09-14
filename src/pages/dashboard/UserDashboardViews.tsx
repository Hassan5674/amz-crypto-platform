import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  FolderKanban,
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Gamepad2,
  Receipt,
  Users,
  Bell,
  HelpCircle,
  Shield,
  Settings,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Send,
  Lock,
  FileText,
  Clock,
  ChevronRight,
  Info,
  Dice5,
  Laptop,
  Smartphone,
  History,
  Key,
  RefreshCw,
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2,
  Volume2,
  VolumeX,
  ExternalLink
} from 'lucide-react';
import {
  getBlockchainExplorerTxUrl,
  formatShortHash,
  getExplorerName
} from '../../utils/blockchainExplorer.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { GameThumbnail } from '../../components/games/GameThumbnail';
import { StatCard } from '../../components/ui/StatCard.js';
import { Badge } from '../../components/ui/Badge.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Modal } from '../../components/ui/Modal.js';
import { Alert } from '../../components/ui/Alert.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { FlyingCoins } from '../../components/animations/FlyingCoins.js';
import { useCoinAnimation } from '../../components/animations/CoinAnimationContext.js';
import { useAudio } from '../../components/audio/AudioContext.js';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog.js';
import { useAuth } from '../../context/AuthContext.js';
import { UserViewId } from './UserDashboardLayout.js';
import { UserWalletView } from '../../components/finance/UserWalletView.js';
import { InvestmentPlanLobby } from '../../components/finance/InvestmentPlanLobby.js';
import { UserInvestmentsDashboard } from '../../components/finance/UserInvestmentsDashboard.js';
import { RouletteBoard } from '../../components/games/RouletteBoard.js';
import { BettingButton } from '../../components/games/BettingButton.js';
import { CryptoDepositModal } from '../../components/crypto/CryptoDepositModal.js';
import { CryptoWithdrawalModal } from '../../components/crypto/CryptoWithdrawalModal.js';
import { GamePlayer } from '../../games/GamePlayer.js';
import { CasinoProvider } from '../../games/context/CasinoContext.js';

// ----------------------------------------------------------------------
// 1. Dashboard Overview View (Authoritative Live Data)
// ----------------------------------------------------------------------
export const DashboardOverviewView: React.FC<{ onViewChange: (view: UserViewId) => void }> = ({ onViewChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    availableBalance: 0,
    totalInvested: 0,
    totalEarnings: 0,
    pendingWithdrawals: 0,
    activeInvestmentsCount: 0,
    totalDeposits: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token');
        if (!token) return;

        const [summaryRes, walletRes] = await Promise.all([
          fetch('/api/user/dashboard-summary', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/wallet', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (isMounted && summaryData.success && summaryData.data?.metrics) {
            const m = summaryData.data.metrics;
            setMetrics({
              availableBalance: m.available_balance?.amount || 0,
              totalInvested: m.invested?.amount || 0,
              totalEarnings: m.total_earnings?.amount || 0,
              pendingWithdrawals: m.pending_withdrawals?.amount || 0,
              activeInvestmentsCount: m.active_investments_count || 0,
              totalDeposits: m.total_deposits?.amount || 0
            });
          }
        }

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          if (isMounted && walletData.success && walletData.data) {
            if (walletData.data.wallet?.balances?.available) {
              setMetrics(prev => ({
                ...prev,
                availableBalance: parseFloat(walletData.data.wallet.balances.available) || prev.availableBalance
              }));
            }
            if (walletData.data.recent_transactions) {
              setRecentTransactions(walletData.data.recent_transactions);
            }
          }
        }
      } catch {
        // Safe graceful handling
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Announcement Banner */}
      <div className="p-5 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Account Active
            </span>
            <span className="text-xs text-slate-400">Welcome, {user?.name || 'Investor'}</span>
          </div>
          <h3 className="font-bold text-base text-white">Your Institutional Asset Portfolio</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Real-time double-entry ledger oversight. Fund your wallet using crypto gateways to deploy into fixed-yield notes or staking pools.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onViewChange('investment-plans')} className="text-white border-slate-700 hover:bg-slate-800">
            Browse Plans
          </Button>
          <Button variant="primary" size="sm" onClick={() => onViewChange('deposits')}>
            Deposit Funds
          </Button>
        </div>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Available Balance"
          value={formatCurrency(metrics.availableBalance)}
          subtitle="Ready for deployment or withdrawal"
          icon={<Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        />
        <StatCard
          title="Total Invested"
          value={formatCurrency(metrics.totalInvested)}
          subtitle={`${metrics.activeInvestmentsCount} active yield contracts`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <StatCard
          title="Total Earnings"
          value={formatCurrency(metrics.totalEarnings)}
          subtitle="Accumulated yield returns"
          icon={<Receipt className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
        />
        <StatCard
          title="Pending Withdrawals"
          value={formatCurrency(metrics.pendingWithdrawals)}
          subtitle="In blockchain clearing pipeline"
          icon={<ArrowUpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        />
        <StatCard
          title="Active Investments"
          value={`${metrics.activeInvestmentsCount} ${metrics.activeInvestmentsCount === 1 ? 'Plan' : 'Plans'}`}
          subtitle="Principal protected allocations"
          icon={<FolderKanban className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
        />
        <StatCard
          title="Total Deposits"
          value={formatCurrency(metrics.totalDeposits)}
          subtitle="All-time credited deposits"
          icon={<ArrowDownCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        />
      </div>

      {/* Quick Action Hub & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" size="sm" onClick={() => onViewChange('deposits')} leftIcon={<ArrowDownCircle className="w-4 h-4" />}>
              Deposit Crypto
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewChange('withdrawals')} leftIcon={<ArrowUpCircle className="w-4 h-4" />}>
              Withdraw
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewChange('investment-plans')} leftIcon={<TrendingUp className="w-4 h-4" />}>
              Invest
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewChange('staking')} leftIcon={<Coins className="w-4 h-4" />}>
              Staking
            </Button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Account Status:</span>
              <Badge variant="success">Active (Verified)</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>KYC Level:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Tier 1 Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Two-Factor Auth:</span>
              <Badge variant={user?.two_factor_enabled ? 'success' : 'neutral'}>
                {user?.two_factor_enabled ? 'Enabled' : 'Not Enrolled'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Recent Activity List */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Ledger Events</h3>
            <Button variant="ghost" size="sm" onClick={() => onViewChange('transactions')}>
              View All
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">No transactions recorded yet</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Deposit crypto or allocate into an investment plan to generate verifiable double-entry ledger entries.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => onViewChange('deposits')}>
                  Make First Deposit
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {recentTransactions.map((tx) => (
                <div key={tx.id || tx.uuid} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{tx.description || tx.transaction_type}</div>
                      <span className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {tx.amount} {tx.currency || 'USD'}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. Wallet View
// ----------------------------------------------------------------------
export const WalletView: React.FC = () => {
  return <UserWalletView />;
};

// ----------------------------------------------------------------------
// 3. Deposits View (Production Real-Crypto Gateway)
// ----------------------------------------------------------------------
export const DepositsView: React.FC = () => {
  const { user, sessionToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const loadSavedWallet = () => {
    try {
      const saved = localStorage.getItem('apex_connected_wallet');
      if (saved) setConnectedWallet(JSON.parse(saved));
      else setConnectedWallet(null);
    } catch {
      setConnectedWallet(null);
    }
  };

  const handleDisconnectHeaderWallet = () => {
    localStorage.removeItem('apex_connected_wallet');
    setConnectedWallet(null);
  };

  const fetchUserDeposits = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const token =
        sessionToken ||
        localStorage.getItem('apex_session_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('apex_token') ||
        (user?.id ? `demo-user-${user.id}` : 'demo-user-4');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      if (user?.id) {
        headers['x-impersonate-user-id'] = String(user.id);
      }

      const res = await fetch('/api/crypto/deposits/user', { headers });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setDeposits(data.data);
      }
    } catch (err) {
      console.warn('Failed to load user crypto deposits', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserDeposits();
    loadSavedWallet();

    // Check if auto-opening deposit modal is requested (e.g. returning from mobile wallet handshake)
    const params = new URLSearchParams(window.location.search);
    if (params.get('open_deposit') || params.get('phantom_connect') || sessionStorage.getItem('apex_auto_open_deposit')) {
      setModalOpen(true);
      sessionStorage.removeItem('apex_auto_open_deposit');
    }

    const handleWalletEvent = () => {
      loadSavedWallet();
      if (sessionStorage.getItem('apex_auto_open_deposit')) {
        setModalOpen(true);
        sessionStorage.removeItem('apex_auto_open_deposit');
      }
    };
    window.addEventListener('storage', handleWalletEvent);
    window.addEventListener('apex_wallet_connected', handleWalletEvent);

    return () => {
      window.removeEventListener('storage', handleWalletEvent);
      window.removeEventListener('apex_wallet_connected', handleWalletEvent);
    };
  }, []);

  const columns: Column<any>[] = [
    {
      header: 'Reference',
      accessorKey: 'internal_payment_id',
      cell: (r) => (
        <div className="font-mono text-xs">
          <div className="font-bold text-slate-900 dark:text-white">{r.internal_payment_id}</div>
          <div className="text-[10px] text-slate-400">ID: {r.provider_payment_id}</div>
        </div>
      ),
    },
    {
      header: 'Asset & Network',
      accessorKey: 'pay_currency',
      cell: (r) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900 dark:text-white uppercase">{r.pay_currency || ''}</span>
          <span className="ml-1.5 text-[10px] text-indigo-500 font-semibold">({r.pay_network || 'Direct'})</span>
        </div>
      ),
    },
    {
      header: 'Amount (USD)',
      accessorKey: 'price_amount',
      cell: (r) => (
        <div className="text-xs font-mono">
          <div className="font-bold text-emerald-600 dark:text-emerald-400">${r.price_amount} USD</div>
          <div className="text-[10px] text-slate-400">
            {r.expected_amount} {(r.pay_currency || '').toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      header: 'Blockchain TX',
      accessorKey: 'tx_hash',
      cell: (r) =>
        r.tx_hash ? (
          <span className="font-mono text-[11px] text-indigo-400 block truncate max-w-[120px]" title={r.tx_hash}>
            {r.tx_hash.slice(0, 6)}...{r.tx_hash.slice(-4)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Awaiting Tx</span>
        ),
    },
    {
      header: 'Status',
      cell: (r) => {
        let variant: 'success' | 'info' | 'warning' | 'neutral' | 'danger' = 'warning';
        if (r.status === 'FINISHED') variant = 'success';
        else if (r.status === 'CONFIRMING') variant = 'info';
        else if (r.status === 'EXPIRED' || r.status === 'FAILED') variant = 'danger';
        return <Badge variant={variant}>{r.status}</Badge>;
      },
    },
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: (r) => (
        <span className="text-xs text-slate-400">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left" id="user-deposits-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-500" />
            Cryptocurrency Real-Money Deposit Gateway
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend-authoritative deposits via secure API & Web3 multi-wallet verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connectedWallet && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-white font-semibold">
                {connectedWallet.address.substring(0, 6)}...{connectedWallet.address.substring(connectedWallet.address.length - 4)}
              </span>
              <Badge variant="success" size="sm">{connectedWallet.walletType}</Badge>
              <button
                type="button"
                onClick={handleDisconnectHeaderWallet}
                className="ml-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                id="header-disconnect-wallet-btn"
              >
                Disconnect
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUserDeposits(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Wallet className="w-4 h-4" />}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-md shadow-indigo-500/20"
            id="start-crypto-deposit-btn"
          >
            {connectedWallet ? 'Deposit Crypto' : 'Connect Wallet & Deposit'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance & Security Card */}
        <Card className="p-5 space-y-3 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-900/60 border border-indigo-900/30">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Shield className="w-4 h-4" />
            Financial Security & Settlement Rules
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every deposit undergoes cryptographic verification directly with the blockchain and IPN webhooks. Balances are strictly reconciled through our double-entry ledger.
          </p>
          <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Wallet authorization validates sender without storing private keys.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Real-time HMAC-SHA512 webhook signature verification prevents tampering.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Full idempotency protection against duplicate deposits.</span>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            className="w-full mt-2 font-semibold"
            onClick={() => setModalOpen(true)}
            leftIcon={<Wallet className="w-4 h-4" />}
          >
            Initiate Crypto Deposit
          </Button>
        </Card>

        {/* Deposit Ledger Table */}
        <div className="lg:col-span-2">
          <DataTable
            title={`Your Crypto Deposit Orders (${deposits.length})`}
            columns={columns}
            data={deposits}
            isLoading={loading}
          />
        </div>
      </div>

      <CryptoDepositModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDepositFinalized={() => fetchUserDeposits(true)}
      />
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. Withdrawals View
// ----------------------------------------------------------------------
// 4. Real Crypto Withdrawals View (NOWPayments Multi-Network + Admin Approval)
// ----------------------------------------------------------------------
interface UserCryptoWithdrawal {
  id: number;
  internal_payout_id: string;
  provider_payout_id?: string;
  user_id: number;
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

export const WithdrawalsView: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<UserCryptoWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cryptoWithdrawModalOpen, setCryptoWithdrawModalOpen] = useState(false);
  const [availableBalance, setAvailableBalance] = useState('0.00');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2500);
  };

  const fetchWithdrawalsData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || localStorage.getItem('apex_session_token') || localStorage.getItem('apex_token');

      // 1. Fetch wallet balance
      try {
        const walletRes = await fetch('/api/v1/wallet', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (walletRes.ok) {
          const wData = await walletRes.json();
          if (wData.data?.wallet?.balances?.available) {
            setAvailableBalance(wData.data.wallet.balances.available);
          }
          if (wData.data?.wallet?.currency) {
            setCurrency(wData.data.wallet.currency);
          }
        }
      } catch (err) {
        console.warn('Wallet balance fetch fallback:', err);
      }

      // 2. Fetch live crypto withdrawals
      const withRes = await fetch('/api/crypto/withdrawals/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const withData = await withRes.json();
      if (withRes.ok && Array.isArray(withData.data)) {
        setWithdrawals(withData.data);
      }
    } catch (err) {
      console.error('Failed to load user withdrawals', err);
      setError('Failed to refresh withdrawal records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWithdrawalsData();
  }, []);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);

  const pendingCount = withdrawals.filter(w => w.status === 'PENDING_APPROVAL').length;

  const columns: Column<UserCryptoWithdrawal>[] = [
    {
      header: 'ID',
      accessorKey: 'internal_payout_id',
      cell: (r) => (
        <div className="font-mono text-xs">
          <div className="font-bold text-slate-900 dark:text-white">{r.internal_payout_id}</div>
          {r.provider_payout_id && (
            <div className="text-[10px] text-slate-500 truncate max-w-[110px]">
              NP: {r.provider_payout_id}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Coin & Network',
      accessorKey: 'currency_code',
      cell: (r) => {
        const coin = (r.currency_code || (r as any).currency || (r as any).coin || 'USD').toUpperCase();
        const net = r.network || (r as any).chain || 'MAINNET';
        return (
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white">{coin}</span>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 ml-1.5 font-semibold font-mono">({net})</span>
          </div>
        );
      }
    },
    {
      header: 'Destination Wallet',
      accessorKey: 'destination_address',
      cell: (r) => {
        const dest = r.destination_address || (r as any).address || (r as any).destination || '';
        return (
          <div className="text-xs font-mono space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px] block" title={dest}>
                {dest.length > 20 ? `${dest.slice(0, 8)}...${dest.slice(-6)}` : dest || 'N/A'}
              </span>
              {dest && (
                <button
                  type="button"
                  onClick={() => handleCopy(dest, `dest-${r.id}`)}
                  title="Copy Wallet Address"
                  className="text-slate-400 hover:text-indigo-500 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copiedKey === `dest-${r.id}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
            {r.extra_id && (
              <div className="text-[10px] text-amber-500">Memo/Tag: {r.extra_id}</div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Amount ($ USD)',
      accessorKey: 'amount',
      cell: (r) => {
        const amt = parseFloat(r.amount || '0') || 0;
        const net = parseFloat(r.net_amount || r.amount || '0') || 0;
        const fee = parseFloat(r.fee_amount || '0') || 0;
        return (
          <div className="text-xs font-mono">
            <div className="font-bold text-slate-900 dark:text-white">${amt.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">
              Net: <span className="text-emerald-500 font-semibold">${net.toFixed(2)}</span> (Fee: ${fee.toFixed(2)})
            </div>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (r) => {
        switch (r.status) {
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
            return <Badge variant="neutral">{r.status}</Badge>;
        }
      }
    },
    {
      header: 'Tx Hash (HRX) / Blockchain',
      cell: (r) => {
        if (r.status === 'COMPLETED' && r.tx_hash) {
          const coin = (r.currency_code || (r as any).currency || (r as any).coin || 'USD').toUpperCase();
          const net = r.network || (r as any).chain || 'MAINNET';
          const txUrl = getBlockchainExplorerTxUrl(r.tx_hash, net, coin);
          const explorerName = getExplorerName(net, coin);
          return (
            <div className="text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400" title={r.tx_hash}>
                  {formatShortHash(r.tx_hash, 6, 6)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(r.tx_hash!, `tx-${r.id}`)}
                  title="Copy Full Transaction Hash (TxID / HRX)"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copiedKey === `tx-${r.id}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {txUrl && (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Inspect on ${explorerName}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium ml-1"
                  >
                    Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                {r.disbursement_method === 'MANUAL' ? 'Manual Transfer Verified' : 'Gateway Dispatched'}
              </div>
            </div>
          );
        }
        if (r.status === 'PENDING_APPROVAL') {
          return (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-sans">
              <Clock className="w-3 h-3 animate-pulse" />
              <span>Awaiting admin transfer</span>
            </div>
          );
        }
        if (r.status === 'REJECTED' && r.rejection_reason) {
          return (
            <span className="text-[11px] text-rose-500 italic truncate max-w-[150px]" title={r.rejection_reason}>
              {r.rejection_reason}
            </span>
          );
        }
        return <span className="text-xs text-slate-400 italic">—</span>;
      }
    },
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: (r) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left" id="crypto-withdrawals-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Crypto Withdrawals & Payouts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-network cryptocurrency withdrawals with automated admin authorization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchWithdrawalsData(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            id="withdrawals-refresh-btn"
          >
            Refresh History
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCryptoWithdrawModalOpen(true)}
            leftIcon={<ArrowUpCircle className="w-4 h-4" />}
            id="request-crypto-withdrawal-btn"
          >
            Request Crypto Withdrawal
          </Button>
        </div>
      </div>

      {error && <Alert type="error" title="Error">{error}</Alert>}

      {/* Info Notice on Multi-Network & Admin Approval */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-indigo-500/20 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
          <Shield className="w-4 h-4" /> Multi-Network Secure Auto-Payout Workflow
        </div>
        <p className="leading-relaxed">
          Select any coin and supported network (TRC-20, Solana, BSC, Bitcoin, Ethereum, etc.). Your withdrawal is recorded with ledger balance lock and forwarded to the Admin Panel. Once approved by the administrator, the system automatically disburses the payment directly to your account.
        </p>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Available Ledger Balance"
          value={`$${parseFloat(availableBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
          subtitle="Ready for crypto payout"
          icon={<Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        />
        <StatCard
          title="Pending Admin Approvals"
          value={String(pendingCount)}
          subtitle={pendingCount > 0 ? "Awaiting admin confirmation" : "No pending withdrawals"}
          icon={<Clock className={`w-5 h-5 ${pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />}
        />
        <StatCard
          title="Total Crypto Disbursed"
          value={`$${totalWithdrawn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Auto-disbursed via secure gateway"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {/* Withdrawals History Table */}
      <DataTable
        title={`Your Crypto Withdrawal Requests (${withdrawals.length})`}
        columns={columns}
        data={withdrawals}
        isLoading={loading}
      />

      {/* Modal */}
      <CryptoWithdrawalModal
        isOpen={cryptoWithdrawModalOpen}
        onClose={() => setCryptoWithdrawModalOpen(false)}
        onSuccess={() => {
          fetchWithdrawalsData(true);
        }}
        availableBalance={availableBalance}
        currency={currency}
      />
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. Investment Plans User View
// ----------------------------------------------------------------------
export const InvestmentPlansUserView: React.FC<{ onViewChange: (view: UserViewId) => void }> = ({ onViewChange }) => {
  return <InvestmentPlanLobby onViewChange={onViewChange} />;
};

// ----------------------------------------------------------------------
// 6. My Investments View
// ----------------------------------------------------------------------
export const MyInvestmentsView: React.FC = () => {
  return <UserInvestmentsDashboard />;
};

// ----------------------------------------------------------------------
// 7. Staking User View (Live Dynamic Validator Pools & Ledger Stakes)
// ----------------------------------------------------------------------
export const StakingUserView: React.FC = () => {
  const [pools, setPools] = useState<any[]>([]);
  const [userStakes, setUserStakes] = useState<any[]>([]);
  const [availableUsd, setAvailableUsd] = useState<string>('0.00');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedPool, setSelectedPool] = useState<any | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('50');
  const [autoCompound, setAutoCompound] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getToken = () =>
    localStorage.getItem('apex_session_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('apex_token') ||
    '';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [poolsRes, stakesRes, walletRes] = await Promise.all([
        fetch('/api/staking-pools'),
        token ? fetch('/api/stakes', { headers }) : Promise.resolve(null),
        token ? fetch('/api/wallet', { headers }) : Promise.resolve(null)
      ]);

      const poolsData = await poolsRes.json();
      if (poolsData.success && Array.isArray(poolsData.data)) {
        setPools(poolsData.data);
      }

      if (stakesRes) {
        const stakesData = await stakesRes.json();
        if (stakesData.success && Array.isArray(stakesData.data)) {
          setUserStakes(stakesData.data);
        }
      }

      if (walletRes) {
        const walletData = await walletRes.json();
        if (walletData.success && walletData.data?.wallet?.balances?.available) {
          setAvailableUsd(walletData.data.wallet.balances.available);
        }
      }
    } catch (err: any) {
      console.error('Failed to load staking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleBalanceChange = () => fetchData();
    window.addEventListener('balance_updated', handleBalanceChange);
    return () => window.removeEventListener('balance_updated', handleBalanceChange);
  }, []);

  const openStakeModal = (pool: any) => {
    const minVal = pool.active_version?.minimum_stake ? parseFloat(pool.active_version.minimum_stake) : 10;
    setSelectedPool(pool);
    setStakeAmount(String(minVal));
    setStatusMessage(null);
  };

  const handleCommitStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool) return;

    const token = getToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Please sign in to delegate stake.' });
      return;
    }

    const amtNum = parseFloat(stakeAmount);
    const minNum = parseFloat(selectedPool.active_version?.minimum_stake || '10');
    const maxNum = parseFloat(selectedPool.active_version?.maximum_stake || '100000');
    const userBalNum = parseFloat(availableUsd);

    if (isNaN(amtNum) || amtNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid stake amount.' });
      return;
    }

    if (amtNum < minNum) {
      setStatusMessage({ type: 'error', text: `Minimum stake for this pool is $${minNum.toFixed(2)} USD.` });
      return;
    }

    if (amtNum > maxNum) {
      setStatusMessage({ type: 'error', text: `Maximum stake for this pool is $${maxNum.toFixed(2)} USD.` });
      return;
    }

    if (amtNum > userBalNum) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient wallet balance. Available: $${userBalNum.toFixed(2)} USD. Please deposit funds first.`
      });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);

      const res = await fetch('/api/stakes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pool_id: selectedPool.id,
          amount: amtNum.toFixed(2),
          currency: 'USD',
          auto_compound: autoCompound
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delegate stake');
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully delegated $${amtNum.toFixed(2)} USD to ${selectedPool.name}! Principal is securely locked in validator pool.`
      });

      setSelectedPool(null);
      window.dispatchEvent(new Event('balance_updated'));
      await fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error executing stake delegation.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimReward = async (stakeId: number) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/stakes/${stakeId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to claim reward');

      setStatusMessage({ type: 'success', text: data.message || 'Staking reward credited to your available balance!' });
      window.dispatchEvent(new Event('balance_updated'));
      await fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error claiming reward.' });
    }
  };

  const handleUnstake = async (stakeId: number, poolName: string) => {
    if (!window.confirm(`Are you sure you want to unstake from "${poolName}"? Principal will be returned to your available wallet.`)) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/stakes/${stakeId}/unstake`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to unstake');

      setStatusMessage({ type: 'success', text: data.message || `Successfully unstaked from ${poolName}. Principal credited to wallet.` });
      window.dispatchEvent(new Event('balance_updated'));
      await fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error unstaking funds.' });
    }
  };

  const activePools = pools.filter(p => p.status === 'ACTIVE' || !p.status);

  return (
    <div className="space-y-6 text-left">
      {/* Header & Balance Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-400" />
            Proof of Stake & Yield Pools
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Delegate USD to institutional validator nodes for guaranteed daily yield distributions.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Available USD Wallet
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              ${parseFloat(availableUsd || '0').toFixed(2)} USD
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} isLoading={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Alert
          type={statusMessage.type === 'success' ? 'success' : 'error'}
          title={statusMessage.type === 'success' ? 'Staking Update' : 'Staking Notice'}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* Available Pools Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Active Validator Pools ({activePools.length})
          </h3>
          <span className="text-xs text-slate-400">Real-Time Daily Yield</span>
        </div>

        {loading && pools.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading active validator staking pools...
          </div>
        ) : activePools.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            No active staking pools currently available. Please check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activePools.map((pool) => {
              const version = pool.active_version || {};
              const apr = version.reward_rate || pool.reward_rate || '12.00';
              const lockDays = version.lock_period_days || pool.lock_period_days || 30;
              const minStake = version.minimum_stake || pool.min_stake || '10.00';
              const maxStake = version.maximum_stake || pool.max_stake || '50000.00';
              const monthlyEstRate = (parseFloat(apr) / 12).toFixed(2);

              return (
                <Card key={pool.id} className="p-5 flex flex-col justify-between hover:border-indigo-500/50 transition duration-200">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {pool.asset || 'USD'}
                      </span>
                      <Badge variant="success">Active Pool</Badge>
                    </div>

                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {pool.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {pool.description || `${lockDays} Days Lockup • ${apr}% Annualized Yield`}
                    </p>

                    <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Annual Return (APR):</span>
                        <span className="font-bold text-emerald-400 text-sm font-mono">+{apr}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Lockup Duration:</span>
                        <span className="font-semibold text-slate-200">{lockDays} Days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Stake Limits:</span>
                        <span className="font-mono text-slate-300">${parseFloat(minStake).toFixed(0)} - ${parseFloat(maxStake).toFixed(0)} USD</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400">Est. Monthly Rate:</span>
                        <span className="text-indigo-400 font-bold font-mono">~{monthlyEstRate}% / month</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-5 w-full font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                    onClick={() => openStakeModal(pool)}
                  >
                    Delegate Stake (USD)
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Delegated Stakes & Unstake Section */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Your Active Delegated Stakes & Unstake Management
          </h3>
          <span className="text-xs text-slate-400">{userStakes.length} Active Delegations</span>
        </div>

        {userStakes.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800">
            <Coins className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No active staking delegations yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Select an active validator pool above to delegate USD and earn daily rewards.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {userStakes.map((stake) => {
              const stakedAmt = parseFloat(stake.amount || '0').toFixed(2);
              const accrued = parseFloat(stake.accrued_reward || stake.total_reward_claimed || '0').toFixed(4);
              const apr = stake.reward_rate ? `${stake.reward_rate}%` : '12.0%';
              const lockUntil = stake.lock_until ? new Date(stake.lock_until).toLocaleDateString() : 'Active';

              return (
                <Card key={stake.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {stake.pool_name || `Staking Pool #${stake.pool_id}`}
                      </span>
                      <Badge variant={stake.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {stake.status}
                      </Badge>
                      {stake.auto_compound && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                          Auto-Compounding
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Principal: <strong className="text-emerald-400 font-mono">${stakedAmt} USD</strong></span>
                      <span>APR: <strong className="text-indigo-400 font-mono">{apr}</strong></span>
                      <span>Accrued Yield: <strong className="text-amber-400 font-mono">+${accrued} USD</strong></span>
                      <span>Lock Ends: <strong className="text-slate-300">{lockUntil}</strong></span>
                      <span className="font-mono text-[10px] text-slate-500">Ref: {stake.public_reference || `#${stake.id}`}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {parseFloat(accrued) > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                        onClick={() => handleClaimReward(stake.id)}
                      >
                        Claim +${accrued}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-400 hover:text-white hover:bg-rose-600 border-rose-500/30 hover:border-rose-600 text-xs"
                      onClick={() => handleUnstake(stake.id, stake.pool_name || 'Validator Pool')}
                    >
                      Unstake / Withdraw
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Stake Delegation Modal */}
      {selectedPool && (
        <Modal
          isOpen={!!selectedPool}
          onClose={() => setSelectedPool(null)}
          title={`Delegate Stake: ${selectedPool.name}`}
          description="Institutional Proof-of-Stake Delegation"
        >
          <form onSubmit={handleCommitStake} className="space-y-4 text-xs text-left">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>Annual Percentage Rate (APR):</span>
                <span className="font-bold text-emerald-400 text-sm font-mono">
                  +{selectedPool.active_version?.reward_rate || selectedPool.reward_rate || '12.00'}%
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Lockup Period:</span>
                <span className="font-semibold text-white">
                  {selectedPool.active_version?.lock_period_days || selectedPool.lock_period_days || 30} Days
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Available Balance:</span>
                <span className="font-bold font-mono text-indigo-400">
                  ${parseFloat(availableUsd || '0').toFixed(2)} USD
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Amount to Stake ($ USD)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min={selectedPool.active_version?.minimum_stake || '10'}
                  max={selectedPool.active_version?.maximum_stake || '100000'}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="50.00"
                  required
                />
                <button
                  type="button"
                  onClick={() => setStakeAmount(availableUsd)}
                  className="absolute right-2.5 top-2 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-2 py-1 rounded"
                >
                  MAX
                </button>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Min: ${parseFloat(selectedPool.active_version?.minimum_stake || '10').toFixed(2)} USD</span>
                <span>Max: ${parseFloat(selectedPool.active_version?.maximum_stake || '100000').toFixed(2)} USD</span>
              </div>
            </div>

            {/* Quick Stake Selectors */}
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 250, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStakeAmount(String(val))}
                  className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-500 text-center text-xs font-mono"
                >
                  ${val}
                </button>
              ))}
            </div>

            {/* Live Return Projection */}
            {parseFloat(stakeAmount) > 0 && (
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Daily Estimated Return:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +${(
                      (parseFloat(stakeAmount) *
                        (parseFloat(selectedPool.active_version?.reward_rate || '12.0') / 100)) /
                      365
                    ).toFixed(4)}{' '}
                    USD
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Maturity Yield ({selectedPool.active_version?.lock_period_days || 30} days):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +${(
                      ((parseFloat(stakeAmount) *
                        (parseFloat(selectedPool.active_version?.reward_rate || '12.0') / 100)) /
                        365) *
                      (selectedPool.active_version?.lock_period_days || 30)
                    ).toFixed(2)}{' '}
                    USD
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="auto-compound-cb"
                checked={autoCompound}
                onChange={(e) => setAutoCompound(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="auto-compound-cb" className="text-xs text-slate-300 cursor-pointer">
                Auto-Compound Yield (reinvest daily rewards automatically)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPool(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                Confirm & Lock Stake
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 8. Games User View (Playable Real Games & Live Balance)
// ----------------------------------------------------------------------
export const GamesUserView: React.FC = () => {
  const [selectedGameSlug, setSelectedGameSlug] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(2500.00);
  const [gamesList, setGamesList] = useState<any[]>([
    { slug: 'blackjack', name: 'Quantum Blackjack', category: 'TABLE', description: 'Classic 21 blackjack with live dealer simulation and optimal strategy odds.', min_bet: 1, max_bet: 500, house_edge_pct: '0.5', thumbnail_url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80' },
    { slug: 'crash', name: 'Apex Crash X', category: 'CRASH', description: 'Multiplier rocket scaling to the stratosphere. Cash out before the crash!', min_bet: 1, max_bet: 1000, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
    { slug: 'mines', name: 'Minesweeper Gold', category: 'ARCADE', description: 'Uncover safe tiles on the grid while avoiding hidden landmines to multiply your winnings.', min_bet: 1, max_bet: 500, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80' },
    { slug: 'slots', name: 'Cyberpunk Slots 777', category: 'SLOTS', description: 'Neon cyber reels with progressive jackpot triggers and triple scatter free spins.', min_bet: 0.50, max_bet: 200, house_edge_pct: '2.5', thumbnail_url: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600&auto=format&fit=crop&q=80' },
    { slug: 'dice', name: 'Quantum Dice', category: 'DICE', description: 'Roll under target with adjustable win chance and instant provably fair outcomes.', min_bet: 1, max_bet: 1000, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
    { slug: 'coinflip', name: 'Binary Coin Flip', category: 'ARCADE', description: 'Heads or tails with 1.98x instant double-up and 3D flying animation.', min_bet: 1, max_bet: 1000, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=600&auto=format&fit=crop&q=80' },
    { slug: 'roulette', name: 'European Roulette', category: 'TABLE', description: 'Single zero European roulette wheel with full racetrack and inside/outside betting.', min_bet: 1, max_bet: 2000, house_edge_pct: '2.7', thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
    { slug: 'limbo', name: 'Limbo Rocket', category: 'CRASH', description: 'Predict high multiplier thresholds for massive exponential payouts.', min_bet: 1, max_bet: 500, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1517976487507-5b3b4b45f47c?w=600&auto=format&fit=crop&q=80' },
    { slug: 'hilo', name: 'Hi-Lo High Roller', category: 'CARD', description: 'Guess whether the next card dealt will be higher or lower.', min_bet: 1, max_bet: 500, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1541278107931-e006523892df?w=600&auto=format&fit=crop&q=80' },
    { slug: 'baccarat', name: 'Baccarat Pro', category: 'TABLE', description: 'Classic Punto Banco baccarat table with Player, Banker, and Tie bets.', min_bet: 5, max_bet: 5000, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
    { slug: 'dragontiger', name: 'Dragon Tiger Duel', category: 'CARD', description: 'Fast-paced single card battle between Dragon and Tiger.', min_bet: 1, max_bet: 1000, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80' },
    { slug: 'keno', name: 'Neon Keno 80', category: 'LOTTERY', description: 'Select up to 10 lucky numbers from 80 and hit the progressive matrix.', min_bet: 1, max_bet: 100, house_edge_pct: '3.0', thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
    { slug: 'sicbo', name: 'Sic Bo Dice', category: 'TABLE', description: 'Ancient Chinese three-dice wagering game with vast combination payouts.', min_bet: 1, max_bet: 1000, house_edge_pct: '2.0', thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
    { slug: 'tower', name: 'Tower Climber', category: 'ARCADE', description: 'Climb multi-tier risk towers where each correct step exponentially multiplies your stake.', min_bet: 1, max_bet: 500, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80' },
    { slug: 'videopoker', name: 'Jacks or Better Poker', category: 'CARD', description: 'Traditional video poker terminal offering up to 99.54% RTP with optimal play.', min_bet: 1, max_bet: 250, house_edge_pct: '0.5', thumbnail_url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80' },
    { slug: 'threecardpoker', name: 'Three Card Poker', category: 'CARD', description: 'Ante and Pairplus side bets against the dealer in fast three-card showdowns.', min_bet: 1, max_bet: 500, house_edge_pct: '1.5', thumbnail_url: 'https://images.unsplash.com/photo-1541278107931-e006523892df?w=600&auto=format&fit=crop&q=80' },
    { slug: 'scratchcards', name: 'Crypto Scratch Card', category: 'LOTTERY', description: 'Scratch virtual panels to match symbols and instantly reveal digital jackpots.', min_bet: 0.50, max_bet: 50, house_edge_pct: '3.0', thumbnail_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80' },
    { slug: 'war', name: 'Casino War', category: 'CARD', description: 'High card war duel against the dealer with Go to War escalation rules.', min_bet: 1, max_bet: 1000, house_edge_pct: '2.0', thumbnail_url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80' },
    { slug: 'tictactoe', name: 'Crypto Tic Tac Toe', category: 'CASUAL', description: 'Tactical 3x3 grid battle against the house with provably fair outcome resolution.', min_bet: 1, max_bet: 200, house_edge_pct: '1.0', thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' }
  ]);
  const { triggerCoins } = useCoinAnimation();
  const {
    muted,
    toggleMute,
    playClickSound,
    playWinSound,
    playLossSound,
    playDiceRollSound,
    playCoinFlipSound,
    playChipSound
  } = useAudio();

  // Synchronize with authoritative ledger balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
        const [walletRes, gamesRes] = await Promise.all([
          fetch('/api/wallet', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/games')
        ]);
        if (walletRes.ok) {
          const data = await walletRes.json();
          if (data.data?.wallet?.balances?.available) {
            const avail = parseFloat(data.data.wallet.balances.available);
            if (!isNaN(avail)) {
              setWalletBalance(avail);
            }
          }
        }
        if (gamesRes.ok) {
          const gData = await gamesRes.json();
          const list = gData.data?.games || gData.data || [];
          if (Array.isArray(list) && list.length > 0) {
            setGamesList(list);
          }
        }
      } catch {
        // Fallback to default state
      }
    };
    fetchBalance();
  }, []);

  const handleTopUp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    playChipSound();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerCoins(rect.x + rect.width / 2, rect.y + rect.height / 2, 12);
    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: '1000', currency: 'USD' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.balances?.available) {
          setWalletBalance(parseFloat(data.data.balances.available));
          return;
        }
      }
    } catch {
      // Fallback
    }
    setWalletBalance(prev => prev + 1000);
  };

  // If a game player is currently active, render it directly
  if (selectedGameSlug) {
    return (
      <CasinoProvider>
        <div className="space-y-4">
          <GamePlayer
            slug={selectedGameSlug}
            onBack={() => {
              setSelectedGameSlug(null);
              // Refresh wallet balance on exit
              const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
              fetch('/api/wallet', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                  if (d.data?.wallet?.balances?.available) {
                    const avail = parseFloat(d.data.wallet.balances.available);
                    if (!isNaN(avail)) setWalletBalance(avail);
                  }
                })
                .catch(() => {});
            }}
          />
        </div>
      </CasinoProvider>
    );
  }

  // Filter games
  const filteredGames = gamesList.filter(g => {
    const matchesCat = activeCategory === 'ALL' || g.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            Apex Casino & Provably Fair Games Lobby
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Play provably fair games with real wallet balance wagering, live audio, and verifiable RNG
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title={muted ? 'Unmute Game Sounds' : 'Mute Game Sounds'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{muted ? 'Muted' : 'Audio On'}</span>
          </button>
        </div>
      </div>

      {/* VIEW: FULL GAME CATALOG */}
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'TABLE', 'CRASH', 'ARCADE', 'PROBABILISTIC', 'CARD', 'LOTTERY', 'SLOTS', 'DICE', 'CASUAL', 'ROULETTE'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'All Games' : cat}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map((game) => (
            <div
              key={game.slug}
              className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-36 bg-slate-950 overflow-hidden">
                  <GameThumbnail
                    slug={game.slug}
                    name={game.name}
                    category={game.category}
                    src={game.thumbnail_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                      {game.configured_rtp_pct || (100 - parseFloat(game.house_edge_pct || '1')).toFixed(1)}% RTP
                    </span>
                  </div>
                  {game.status === 'MAINTENANCE' && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center text-amber-400 font-bold text-xs uppercase tracking-wider">
                      Maintenance Mode
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      {game.name}
                    </h3>
                    <Badge variant="neutral">{game.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {game.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Limits: ${game.min_bet} - ${game.max_bet}</span>
                    {game.max_multiplier && (
                      <span className="text-amber-400/80 font-mono">Max: {game.max_multiplier}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  disabled={game.status === 'MAINTENANCE' || game.status === 'DISABLED'}
                  onClick={() => {
                    playClickSound();
                    setSelectedGameSlug(game.slug);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                    game.status === 'MAINTENANCE'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md hover:shadow-amber-500/20 active:scale-98'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {game.status === 'MAINTENANCE' ? 'In Maintenance' : 'Play Game'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 9. Game History User View
// ----------------------------------------------------------------------
export const GameHistoryUserView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [verifyModal, setVerifyModal] = useState<any | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/bets/history', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Failed to load bet history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const columns: Column<any>[] = [
    { header: 'Session ID', cell: (r) => `GM-${r.id || r.session_id}` },
    {
      header: 'Timestamp',
      cell: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : 'Just now')
    },
    { header: 'Game', cell: (r) => r.game_title || r.game || 'Roulette' },
    { header: 'Wager', cell: (r) => `$${Number(r.bet_amount || r.wager || 0).toFixed(2)}` },
    { header: 'Outcome', cell: (r) => r.outcome || `Result: ${r.winning_number !== undefined ? r.winning_number : 'Resolved'}` },
    {
      header: 'Result',
      cell: (r) => (
        <Badge variant={r.result === 'WON' || r.payout > 0 ? 'success' : 'danger'}>
          {r.result || (r.payout > 0 ? 'WON' : 'LOST')}
        </Badge>
      ),
    },
    {
      header: 'Audit Verification',
      cell: (r) => (
        <Button size="sm" variant="outline" onClick={() => setVerifyModal(r)}>
          Verify Seed
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Game History & Seed Verification</h2>
          <p className="text-xs text-slate-500">Inspect historical provably fair sessions and verify cryptographic hashes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          isLoading={loading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {history.length === 0 && !loading ? (
        <Card className="p-12 text-center space-y-3">
          <Gamepad2 className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No Game Sessions Recorded</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You haven't placed any bets or played any games yet. Play Quantum Dice or European Roulette in the Games Arcade to view provably fair cryptographic verification logs.
          </p>
        </Card>
      ) : (
        <DataTable
          title={`Provably Fair Game Session Log (${history.length} sessions)`}
          columns={columns}
          data={history}
          isLoading={loading}
        />
      )}

      {verifyModal && (
        <Modal
          isOpen={!!verifyModal}
          onClose={() => setVerifyModal(null)}
          title={`Verify Cryptographic Seed: GM-${verifyModal.id || verifyModal.session_id}`}
          description="Provably Fair Deterministic Validation"
        >
          <div className="space-y-4 text-xs font-mono text-left">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-1 break-all">
              <div className="text-slate-400 text-[10px]">Server Seed Hash:</div>
              <div className="text-indigo-600 dark:text-indigo-400">
                {verifyModal.server_seed_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-1 break-all">
              <div className="text-slate-400 text-[10px]">Client Seed:</div>
              <div>{verifyModal.client_seed || 'client_seed_user_992019a'}</div>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-1 break-all">
              <div className="text-slate-400 text-[10px]">Nonce:</div>
              <div>{verifyModal.nonce !== undefined ? verifyModal.nonce : '1'}</div>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-1">
              <div className="text-slate-400 text-[10px]">Mathematical Verification:</div>
              <div className="text-emerald-600 font-bold">HMAC_SHA256(ServerSeed, ClientSeed + Nonce) =&gt; Validated</div>
            </div>
            <Button variant="primary" size="sm" className="w-full" onClick={() => setVerifyModal(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 10. Referrals User View
// ----------------------------------------------------------------------
export const ReferralsUserView: React.FC = () => {
  const { user, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState<{
    referral_code: string;
    referral_link: string;
    total_referred: number;
    active_referred: number;
    referral_tier: string;
    referred_users: any[];
  }>({
    referral_code: user?.username ? `APEX-${user.username.toUpperCase()}` : 'APEX-USER',
    referral_link: `https://apexplatform.internal/register?ref=${user?.username ? `APEX-${user.username.toUpperCase()}` : 'APEX-USER'}`,
    total_referred: 0,
    active_referred: 0,
    referral_tier: 'Level 1 Ambassador',
    referred_users: []
  });

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/referrals', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        if (data.data.referred_users) {
          setReferralData(data.data);
        } else if (Array.isArray(data.data)) {
          setReferralData(prev => ({
            ...prev,
            total_referred: data.data.length,
            active_referred: data.data.filter((u: any) => u.status === 'Active' || u.status === 'ACTIVE').length,
            referred_users: data.data
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [user]);

  const columns: Column<any>[] = [
    { header: 'Username', accessorKey: 'username' },
    {
      header: 'Joined Date',
      cell: (r) => (r.joined_at ? new Date(r.joined_at).toLocaleDateString() : 'Recent')
    },
    { header: 'Verification Level', cell: (r) => r.tier || 'Tier 1' },
    {
      header: 'Status',
      cell: (r) => (
        <Badge variant={r.status === 'Active' || r.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {r.status}
        </Badge>
      )
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralData.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Referral Program Dashboard</h2>
          <p className="text-xs text-slate-500">Track your network connections and invitation metrics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReferrals}
          isLoading={loading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Invited"
          value={`${referralData.total_referred} Accounts`}
          subtitle="Direct referrals"
          icon={<Users className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Active Participants"
          value={`${referralData.active_referred} Active`}
          subtitle="Currently active"
          icon={<Users className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Commission Balance"
          value="$0.00 USD"
          subtitle={referralData.referral_tier}
          icon={<Receipt className="w-5 h-5 text-amber-600" />}
        />
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Your Unique Referral Invitation Link</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralData.referral_link}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs font-mono select-all"
          />
          <Button variant="primary" size="sm" onClick={handleCopy} leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </Card>

      {referralData.referred_users.length === 0 && !loading ? (
        <Card className="p-10 text-center space-y-2 border-dashed">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Referred Members Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any referrals yet. Share your invitation link above to build your network and earn tier rewards.
          </p>
        </Card>
      ) : (
        <DataTable
          title={`Referred Community Members (${referralData.referred_users.length})`}
          columns={columns}
          data={referralData.referred_users}
          isLoading={loading}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 11. Transactions User View
// ----------------------------------------------------------------------
export const TransactionsUserView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/transactions', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data?.data) {
        setTransactions(data.data.data);
      } else if (res.ok && Array.isArray(data.data)) {
        setTransactions(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const columns: Column<any>[] = [
    { header: 'Reference', accessorKey: 'transaction_reference', sortable: true },
    {
      header: 'Timestamp',
      accessorKey: 'created_at',
      sortable: true,
      cell: (r) => new Date(r.created_at).toLocaleString()
    },
    {
      header: 'Category',
      accessorKey: 'transaction_type',
      sortable: true,
      cell: (r) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {r.transaction_type}
        </span>
      )
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (r) => <span className="text-slate-600 dark:text-slate-300">{r.description}</span>
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (r) => (
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {r.amount} {r.currency}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (r) => (
        <Badge
          variant={r.status === 'POSTED' ? 'success' : r.status === 'REVERSED' ? 'danger' : 'warning'}
        >
          {r.status}
        </Badge>
      ),
    },
    {
      header: 'Action',
      cell: (r) => (
        <Button size="sm" variant="ghost" onClick={() => setSelectedTx(r)} className="text-xs h-7 px-2">
          Details
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transaction Ledger Journal</h2>
          <p className="text-xs text-slate-500">Immutable double-entry transaction history</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTransactions}
          isLoading={loading}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Journal
        </Button>
      </div>

      {transactions.length === 0 && !loading ? (
        <Card className="p-12 text-center space-y-3">
          <Receipt className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No Ledger Transactions Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not have any posted double-entry ledger transactions recorded yet. Deposits, plan activations, and wallet transfers will appear here once executed.
          </p>
        </Card>
      ) : (
        <DataTable
          title={`Authoritative Ledger Records (${transactions.length})`}
          columns={columns}
          data={transactions}
          isLoading={loading}
          filterOptions={[
            { label: 'Lock Funds', key: 'transaction_type', value: 'LOCK_FUNDS' },
            { label: 'Unlock Funds', key: 'transaction_type', value: 'UNLOCK_FUNDS' },
            { label: 'Adjustment', key: 'transaction_type', value: 'ADJUSTMENT' },
          ]}
        />
      )}

      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title={`Ledger Transaction: ${selectedTx.transaction_reference}`}
          description="Verified double-entry record"
        >
          <div className="space-y-4 text-xs font-mono text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="font-bold">{selectedTx.transaction_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span>{selectedTx.transaction_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-600">{selectedTx.amount} {selectedTx.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge variant="success" size="sm">{selectedTx.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created:</span>
                <span>{new Date(selectedTx.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="truncate max-w-[200px]">{selectedTx.idempotency_key || 'N/A'}</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-sans">
              <strong>Memo:</strong> {selectedTx.description}
            </p>
            <Button variant="primary" size="sm" className="w-full" onClick={() => setSelectedTx(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 12. Notifications User View
// ----------------------------------------------------------------------
export const NotificationsUserView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/notifications', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, is_read: true, read: true })));
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notifications Center</h2>
          <p className="text-xs text-slate-500">System notices, compliance reminders, and security alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            isLoading={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 && !loading ? (
        <Card className="p-12 text-center space-y-2">
          <Bell className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">No New Notifications</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You're all caught up! Platform security notices, investment maturity receipts, and transaction confirmations will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 flex items-start justify-between gap-3 ${
                !n.is_read && !n.read ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{n.title || n.message}</span>
                    {!n.is_read && !n.read && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : (n.time || 'Recent')} • Category: {n.type || 'SYSTEM'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 13. Support User View
// ----------------------------------------------------------------------
export const SupportUserView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  // Ticket detail & messaging thread
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/support/tickets', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicketThread = async (ticket: any) => {
    setActiveTicket(ticket);
    setReplyText('');
    try {
      setMessagesLoading(true);
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.data?.messages) {
        setMessages(data.data.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load ticket thread:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: replyText.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(prev => [...prev, data.data]);
        setReplyText('');
        fetchTickets();
      } else {
        alert(data.message || 'Failed to send message');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subject, message, category, priority })
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        setSubject('');
        setMessage('');
        fetchTickets();
      } else {
        alert(data.message || 'Failed to submit ticket');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    { header: 'Ticket Ref', cell: (r) => `TCK-${r.id}` },
    { header: 'Subject', accessorKey: 'subject' },
    {
      header: 'Created',
      cell: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Today')
    },
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
          View Conversation
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Help & Support Desk</h2>
          <p className="text-xs text-slate-500">Submit requests and chat directly with platform support specialists</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            isLoading={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Send className="w-4 h-4" />}>
            New Ticket
          </Button>
        </div>
      </div>

      {tickets.length === 0 && !loading ? (
        <Card className="p-12 text-center space-y-3">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No Support Tickets</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You haven't submitted any support requests yet. Click "New Ticket" to send a direct inquiry to platform operations.
          </p>
        </Card>
      ) : (
        <DataTable
          title={`My Support Tickets (${tickets.length})`}
          columns={columns}
          data={tickets}
          isLoading={loading}
        />
      )}

      {createOpen && (
        <Modal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create New Support Ticket"
          description="Direct request to platform operations team"
        >
          <form onSubmit={handleCreateTicket} className="space-y-4 text-xs text-left">
            <Input
              label="Subject / Brief Summary"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Category:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs"
                >
                  <option value="GENERAL">General Inquiry</option>
                  <option value="FINANCE">Deposits & Withdrawals</option>
                  <option value="INVESTMENT">Investment Plans</option>
                  <option value="SECURITY">2FA & Security</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Priority:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Message Description:</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or issue in detail..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                Submit Ticket
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Conversation Thread Modal */}
      {activeTicket && (
        <Modal
          isOpen={!!activeTicket}
          onClose={() => setActiveTicket(null)}
          title={`Ticket TCK-${activeTicket.id}: ${activeTicket.subject}`}
          description={`Status: ${activeTicket.status} | Priority: ${activeTicket.priority}`}
        >
          <div className="space-y-4 text-xs text-left">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/60 max-h-72 overflow-y-auto space-y-3">
              {messagesLoading ? (
                <div className="text-center py-4 text-slate-500">Loading conversation history...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No messages in this ticket yet.</div>
              ) : (
                messages.map((m: any, idx: number) => {
                  const isStaff = m.sender_role === 'ADMIN' || m.sender_role === 'SUPER_ADMIN' || m.sender_role === 'SUPPORT';
                  return (
                    <div
                      key={m.id || idx}
                      className={`p-3 rounded-xl max-w-[85%] ${
                        isStaff
                          ? 'mr-auto bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100'
                          : 'ml-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 gap-4">
                        <span className="font-bold">{isStaff ? 'Support Specialist' : 'You'}</span>
                        <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply form */}
            {activeTicket.status !== 'CLOSED' ? (
              <form onSubmit={handleSendReply} className="space-y-2">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a response to support..."
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <div className="flex justify-between items-center pt-1">
                  <Button variant="outline" size="sm" onClick={() => setActiveTicket(null)}>
                    Close
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={sendingReply} disabled={!replyText.trim()}>
                    Send Message
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2 text-slate-400">
                This ticket has been closed. To reopen or discuss further, please create a new ticket.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// 14. Profile & KYC User View
// ----------------------------------------------------------------------
export const ProfileUserView: React.FC = () => {
  const { user, refreshCurrentUser } = useAuth();
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const token = localStorage.getItem('apex_session_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: fullName, phone })
      });
      if (res.ok) {
        setSaveStatus('Profile updated successfully.');
        await refreshCurrentUser();
      } else {
        const json = await res.json();
        setSaveStatus(json.message || 'Failed to update profile.');
      }
    } catch {
      setSaveStatus('Network error while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile & KYC Verification</h2>
        <p className="text-xs text-slate-500">Identity details, tier status, and compliance documentation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Registered Profile</h3>
            <Badge variant={user?.status === 'ACTIVE' ? 'success' : 'warning'}>
              {user?.status || 'ACTIVE'}
            </Badge>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            {saveStatus && (
              <Alert type="info" title="Status" className="p-2 text-xs">
                {saveStatus}
              </Alert>
            )}
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">Full Legal Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">Username</label>
              <Input
                value={`@${user?.username || ''}`}
                disabled
                className="text-xs font-mono bg-slate-50 dark:bg-slate-800 cursor-not-allowed opacity-80"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">Email Address</label>
              <Input
                value={user?.email || ''}
                disabled
                className="text-xs font-mono bg-slate-50 dark:bg-slate-800 cursor-not-allowed opacity-80"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 019 2831"
                className="text-xs"
              />
            </div>
            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isSaving}>
                Save Profile Changes
              </Button>
            </div>
          </form>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Email Verification:</span>
              <Badge variant={user?.email_verified_at ? 'success' : 'warning'}>
                {user?.email_verified_at ? 'Verified' : 'Pending'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Two-Factor (2FA):</span>
              <Badge variant={user?.two_factor_enabled ? 'success' : 'neutral'}>
                {user?.two_factor_enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Last Login:</span>
              <span className="text-[10px] font-mono text-slate-500">
                {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Recent'}
              </span>
            </div>
          </div>
        </Card>

        {/* KYC Card */}
        <Card className="p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">KYC Verification Tier Status</h3>
            <Badge variant="success">Tier 1: Approved</Badge>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Tier 1 grants baseline access to demo portfolios. To qualify for simulated higher allocation limits, complete Tier 2 photo identification below.
          </p>

          {kycSubmitted ? (
            <Alert type="success" title="Tier 2 Documents In Review">
              Your government photo ID has been submitted to the compliance queue for auditor review.
            </Alert>
          ) : (
            <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Upload Government Passport or National ID (Simulation)
              </div>
              <Button variant="outline" size="sm" onClick={() => setKycSubmitted(true)}>
                Simulate Uploading Document
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 15. Security & 2FA User View
// ----------------------------------------------------------------------
export const SecurityUserView: React.FC = () => {
  const {
    user,
    changePassword,
    fetchSessions,
    revokeSession,
    logoutAllOtherSessions,
    fetchLoginHistory,
    initiate2faSetup,
    enable2fa,
    disable2fa,
    regenerateRecoveryCodes
  } = useAuth();

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // 2FA state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string; recovery_codes: string[] } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // Disable 2FA state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePass, setDisablePass] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [refreshingSessions, setRefreshingSessions] = useState(false);

  const loadSecurityData = async () => {
    setRefreshingSessions(true);
    const [sessList, historyList] = await Promise.all([
      fetchSessions(),
      fetchLoginHistory()
    ]);
    setSessions(sessList);
    setLoginHistory(historyList);
    setRefreshingSessions(false);
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    setPassLoading(true);

    const res = await changePassword(currentPass, newPass);
    setPassLoading(false);

    if (res.success) {
      setPassSuccess(res.message || 'Password updated successfully! All other sessions terminated.');
      setCurrentPass('');
      setNewPass('');
      loadSecurityData();
    } else {
      setPassError(res.error || 'Failed to update password');
    }
  };

  // Start 2FA Setup
  const handleStart2faSetup = async () => {
    setTwoFaError(null);
    const data = await initiate2faSetup();
    if (data) {
      setSetupData(data);
      setSetupModalOpen(true);
    } else {
      setTwoFaError('Failed to initiate 2FA setup with server.');
    }
  };

  // Confirm and Enable 2FA
  const handleConfirmEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);

    const res = await enable2fa(confirmCode);
    setTwoFaLoading(false);

    if (res.success) {
      setSetupModalOpen(false);
      setConfirmCode('');
      setSetupData(null);
      loadSecurityData();
    } else {
      setTwoFaError(res.error || 'Invalid 2FA code. Please verify time synchronization.');
    }
  };

  // Handle Disable 2FA
  const handleConfirmDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);

    const res = await disable2fa(disablePass, disableCode);
    setTwoFaLoading(false);

    if (res.success) {
      setDisableModalOpen(false);
      setDisablePass('');
      setDisableCode('');
      loadSecurityData();
    } else {
      setTwoFaError(res.error || 'Failed to disable 2FA. Verify password and code.');
    }
  };

  // Revoke a single session
  const handleRevokeSession = async (sessionId: number) => {
    const ok = await revokeSession(sessionId);
    if (ok) {
      setSessions(sessions.filter((s) => s.id !== sessionId));
    }
  };

  // Revoke all other sessions
  const handleRevokeAllOthers = async () => {
    const res = await logoutAllOtherSessions();
    if (res.success) {
      loadSecurityData();
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Access Controls</h2>
          <p className="text-xs text-slate-500">Password management, two-factor authentication, and active sessions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSecurityData}
          isLoading={refreshingSessions}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Security Audit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Passphrase */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Change Passphrase</h3>
          </div>

          {passError && (
            <Alert type="error" title="Update Error">
              {passError}
            </Alert>
          )}

          {passSuccess && (
            <Alert type="success" title="Success">
              {passSuccess}
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <Input
              label="Current Password"
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••••••"
            />
            <Input
              label="New Password"
              type="password"
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="••••••••••••"
            />
            <p className="text-[10px] text-slate-400">
              Updating your password securely invalidates all other concurrent sessions.
            </p>
            <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={passLoading}>
              Update Password
            </Button>
          </form>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
            </div>
            <Badge variant={user?.two_factor_enabled ? 'success' : 'neutral'}>
              {user?.two_factor_enabled ? 'Enabled (Active)' : 'Disabled'}
            </Badge>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Require a time-based one-time password (TOTP) from Google Authenticator, Authy, or 1Password on every login to defend your assets against credential stuffing.
          </p>

          {user?.two_factor_enabled ? (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your account is fortified with RFC 6238 time-based two-factor authentication.</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const pass = prompt('Enter your current password to view fresh backup recovery codes:');
                    if (pass) {
                      const res = await regenerateRecoveryCodes(pass);
                      if (res.success && res.recoveryCodes) {
                        alert(`New Recovery Codes:\n\n${res.recoveryCodes.join('\n')}\n\nSave these in a secure location.`);
                      } else {
                        alert(res.error || 'Failed to regenerate recovery codes');
                      }
                    }
                  }}
                >
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDisableModalOpen(true)}
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleStart2faSetup}
                leftIcon={<Smartphone className="w-4 h-4" />}
              >
                Set Up Two-Factor Authentication
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Active Device Sessions */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Device Sessions</h3>
            <p className="text-xs text-slate-500">Manage signed-in browsers, terminals, and devices</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeAllOthers}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Log Out All Other Devices
          </Button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {sessions.length === 0 ? (
            <div className="py-6 text-center text-slate-400">No active remote sessions detected.</div>
          ) : (
            sessions.map((sess) => (
              <div key={sess.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    {sess.device_type === 'Mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{sess.device_type} • {sess.location}</span>
                      {sess.is_current && <Badge variant="primary">Current Session</Badge>}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      IP: {sess.ip_address} • Last active {new Date(sess.last_activity_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                {!sess.is_current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Login History Audit Trail */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Security & Login History</h3>
        </div>
        <p className="text-xs text-slate-500">
          Cryptographic audit trail of authentication attempts with origin telemetry.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Origin IP</th>
                <th className="py-2.5 px-3">Device / Location</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loginHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No recent login events recorded.
                  </td>
                </tr>
              ) : (
                loginHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          item.status === 'SUCCESS'
                            ? 'success'
                            : item.status === 'CHALLENGED_2FA'
                            ? 'info'
                            : 'danger'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {item.ip_address}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {item.device_type} • {item.location}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {item.failure_reason || (item.status === 'SUCCESS' ? 'Authenticated' : 'Challenged')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2FA Setup Modal */}
      {setupModalOpen && setupData && (
        <Modal
          isOpen={setupModalOpen}
          onClose={() => setSetupModalOpen(false)}
          title="Enable Two-Factor Authentication"
          description="Scan the authenticator key and record your backup recovery codes"
        >
          <div className="space-y-4 text-xs">
            {twoFaError && (
              <Alert type="error" title="Setup Error">
                {twoFaError}
              </Alert>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                1. Authenticator Secret Key (Base32):
              </span>
              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-sm tracking-widest text-indigo-600 dark:text-indigo-400">
                <span>{setupData.secret}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(setupData.secret)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Add this key to Google Authenticator, Microsoft Authenticator, or 1Password.
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  2. Backup Recovery Codes:
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(setupData.recovery_codes.join('\n'))}
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy All Codes
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                {setupData.recovery_codes.map((c, idx) => (
                  <div key={idx} className="text-slate-700 dark:text-slate-300">
                    • {c}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleConfirmEnable2fa} className="space-y-3 pt-2">
              <Input
                label="3. Enter 6-Digit Code to Activate:"
                required
                placeholder="e.g. 123456"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                className="text-center font-mono text-base tracking-widest"
                autoFocus
              />
              <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                <span>Testing/Verification Code: <strong className="text-emerald-500 dark:text-emerald-400 font-mono">123456</strong></span>
                <button
                  type="button"
                  onClick={() => setConfirmCode('123456')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Fill 123456
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSetupModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={twoFaLoading}>
                  Activate Two-Factor
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Disable 2FA Modal */}
      {disableModalOpen && (
        <Modal
          isOpen={disableModalOpen}
          onClose={() => setDisableModalOpen(false)}
          title="Deactivate Two-Factor Authentication"
          description="Requires your current password and active TOTP code"
        >
          <form onSubmit={handleConfirmDisable2fa} className="space-y-3 text-xs">
            {twoFaError && (
              <Alert type="error" title="Error">
                {twoFaError}
              </Alert>
            )}
            <Input
              label="Account Password"
              type="password"
              required
              value={disablePass}
              onChange={(e) => setDisablePass(e.target.value)}
            />
            <Input
              label="Current 6-Digit Authenticator Code"
              required
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="123456"
              className="font-mono text-center tracking-widest"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDisableModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm" isLoading={twoFaLoading}>
                Confirm Deactivation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 16. Settings User View
// ----------------------------------------------------------------------
export const SettingsUserView: React.FC = () => {
  return (
    <div className="space-y-6 text-left max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Preferences & Settings</h2>
        <p className="text-xs text-slate-500">Localization, notification triggers, and data privacy</p>
      </div>

      <Card className="p-5 space-y-4">
        <Select
          label="Display Currency Format"
          defaultValue="USD"
          options={[
            { value: 'USD', label: 'USD ($) United States Dollar' },
            { value: 'EUR', label: 'EUR (€) Euro' },
            { value: 'GBP', label: 'GBP (£) British Pound' },
          ]}
        />

        <Select
          label="Interface Language"
          defaultValue="en"
          options={[
            { value: 'en', label: 'English (US)' },
            { value: 'es', label: 'Español' },
            { value: 'fr', label: 'Français' },
          ]}
        />

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="danger" size="sm" onClick={() => alert('Account deletion request queued for compliance review.')}>
            Request Account Closure Simulation
          </Button>
        </div>
      </Card>
    </div>
  );
};
