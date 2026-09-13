import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  FolderKanban,
  Coins,
  Gamepad2,
  History,
  Users,
  Receipt,
  Bell,
  HelpCircle,
  UserCheck,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog.js';
import { CryptoDepositModal } from '../../components/crypto/CryptoDepositModal.js';

export type UserViewId =
  | 'overview'
  | 'wallet'
  | 'deposits'
  | 'withdrawals'
  | 'investment-plans'
  | 'my-investments'
  | 'staking'
  | 'games'
  | 'game-history'
  | 'referrals'
  | 'transactions'
  | 'notifications'
  | 'support'
  | 'profile'
  | 'security'
  | 'settings';

export interface UserDashboardLayoutProps {
  currentView: UserViewId;
  onViewChange: (view: UserViewId) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const UserDashboardLayout: React.FC<UserDashboardLayoutProps> = ({
  currentView,
  onViewChange,
  onLogout,
  children
}) => {
  const { user, getAuthHeaders } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [headerBalance, setHeaderBalance] = useState<string>('0.00');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [quickDepositOpen, setQuickDepositOpen] = useState(false);
  const prevBalanceRef = React.useRef<number | null>(null);

  // Load real authoritative wallet balance
  React.useEffect(() => {
    let isMounted = true;
    const loadBalance = async () => {
      try {
        const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/v1/wallet', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (isMounted && data.success) {
          const avail = parseFloat(
            data.data?.wallet?.balances?.available ??
            data.data?.wallet?.available_balance ??
            data.data?.balances?.available ??
            data.data?.available_balance ??
            '0'
          );
          if (prevBalanceRef.current !== null && prevBalanceRef.current !== avail) {
            setIsHighlighted(true);
            setTimeout(() => setIsHighlighted(false), 1500);
          }
          prevBalanceRef.current = avail;
          setHeaderBalance(avail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      } catch {
        // Fallback gracefully
      }
    };
    loadBalance();
    const interval = setInterval(loadBalance, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Listen to balance update events
  React.useEffect(() => {
    const handleBalanceEvent = (e: CustomEvent) => {
      if (e.detail?.balance !== undefined) {
        const avail = parseFloat(e.detail.balance);
        if (!isNaN(avail)) {
          if (prevBalanceRef.current !== null && prevBalanceRef.current !== avail) {
            setIsHighlighted(true);
            setTimeout(() => setIsHighlighted(false), 1500);
          }
          prevBalanceRef.current = avail;
          setHeaderBalance(avail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      }
    };
    window.addEventListener('balance_updated' as any, handleBalanceEvent);
    return () => window.removeEventListener('balance_updated' as any, handleBalanceEvent);
  }, []);

  // Listen to quick deposit and navigation events
  React.useEffect(() => {
    const handleQuickDeposit = () => setQuickDepositOpen(true);
    window.addEventListener('open_quick_deposit', handleQuickDeposit);

    const handleNavEvent = (e: any) => {
      if (e?.detail) {
        onViewChange(e.detail as UserViewId);
      }
    };
    window.addEventListener('navigate_dashboard_view', handleNavEvent);

    return () => {
      window.removeEventListener('open_quick_deposit', handleQuickDeposit);
      window.removeEventListener('navigate_dashboard_view', handleNavEvent);
    };
  }, [onViewChange]);

  const navItems: { id: UserViewId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'wallet', label: 'My Wallet', icon: <Wallet className="w-4 h-4" /> },
    { id: 'deposits', label: 'Deposits', icon: <ArrowDownCircle className="w-4 h-4" /> },
    { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowUpCircle className="w-4 h-4" /> },
    { id: 'investment-plans', label: 'Investment Plans', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'my-investments', label: 'My Portfolio', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'staking', label: 'Staking Pools', icon: <Coins className="w-4 h-4" /> },
    { id: 'games', label: 'Games Lobby', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'game-history', label: 'Game History', icon: <History className="w-4 h-4" /> },
    { id: 'referrals', label: 'Referral Program', icon: <Users className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotifications > 0 ? String(unreadNotifications) : undefined
    },
    { id: 'support', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile & KYC', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'security', label: 'Security & 2FA', icon: <Shield className="w-4 h-4" /> },
    { id: 'settings', label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSelectNav = (id: UserViewId) => {
    onViewChange(id);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 text-left">
      {/* AMZDistributor Platform Security Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 py-1.5 px-4 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>AMZDistributor Network:</strong> Verified high-throughput distribution & commerce infrastructure. Real-time cryptographic ledger active.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
          SECURE PROTOCOL ACTIVE
        </span>
      </div>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shrink-0 select-none">
          {/* User Profile Mini Snippet */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Avatar name={user?.name || 'Investor'} src={user?.avatar} size="md" />
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {user?.name || 'Investor Account'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-slate-500 truncate">@{user?.username}</span>
                <Badge variant="success" size="sm">KYC Tier 1</Badge>
              </div>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Logout */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header Bar */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize">
                  {currentView.replace('-', ' ')}
                </h1>
                <span className="text-[11px] text-slate-500">Investor Oversight & Allocation Console</span>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
               {/* Wallet Balance Preview */}
              <div
                onClick={() => handleSelectNav('wallet')}
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-500 ${
                  isHighlighted
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Wallet className={`w-4 h-4 transition-colors ${isHighlighted ? 'text-emerald-500 animate-bounce' : 'text-emerald-600 dark:text-emerald-400'}`} />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 leading-none">Available Balance</div>
                  <div className={`text-xs font-bold leading-tight transition-colors ${isHighlighted ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                    ${headerBalance} USD
                  </div>
                </div>
              </div>

              {/* Quick Deposit Shortcut Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setQuickDepositOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span className="hidden md:inline">Quick Deposit</span>
              </Button>

              {/* Notification Bell */}
              <button
                onClick={() => handleSelectNav('notifications')}
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => handleSelectNav('profile')}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Avatar name={user?.name || 'User'} src={user?.avatar} size="sm" />
              </button>
            </div>
          </header>

          {/* Main Dynamic View Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-72 bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-base text-slate-900 dark:text-white">Portal Navigation</span>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium ${
                    currentView === item.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && <span className="text-[10px] font-bold">{item.badge}</span>}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="danger" size="sm" className="w-full" onClick={() => setShowLogoutConfirm(true)}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        title="Sign Out of Session?"
        message="Your active authentication token will be cleared. You will need to log back in to access your portfolio."
        confirmText="Confirm Sign Out"
      />

      {/* Quick Deposit Modal */}
      <CryptoDepositModal
        isOpen={quickDepositOpen}
        onClose={() => setQuickDepositOpen(false)}
        onDepositFinalized={() => {
          setQuickDepositOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};
