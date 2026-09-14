import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  FolderKanban,
  Coins,
  Gamepad2,
  History,
  Share2,
  LifeBuoy,
  UserCheck,
  ShieldAlert,
  BarChart3,
  Bell,
  FileText,
  UserCog,
  KeyRound,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  AlertCircle,
  Landmark,
  Receipt,
  Scale,
  Sliders,
  Gift
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog.js';

export type AdminViewId =
  | 'overview'
  | 'financial-overview'
  | 'transaction-explorer'
  | 'reconciliation'
  | 'adjustments'
  | 'users'
  | 'deposits'
  | 'deposit-bonuses'
  | 'withdrawals'
  | 'investment-plans'
  | 'investments'
  | 'staking'
  | 'games'
  | 'game-history'
  | 'referrals'
  | 'support'
  | 'kyc'
  | 'risk'
  | 'reports'
  | 'notifications'
  | 'cms'
  | 'admins'
  | 'roles'
  | 'audit-logs'
  | 'settings';

export interface AdminDashboardLayoutProps {
  currentView: AdminViewId;
  onViewChange: (view: AdminViewId) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  currentView,
  onViewChange,
  onLogout,
  children
}) => {
  const { user, currentRole, hasPermission } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Define admin navigation items with their respective permission requirements
  const adminNavItems: {
    id: AdminViewId;
    label: string;
    icon: React.ReactNode;
    requiredPerm?: string;
    superAdminOnly?: boolean;
    badge?: string;
  }[] = [
    { id: 'overview', label: 'Executive Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'financial-overview', label: 'Financial Overview', icon: <Landmark className="w-4 h-4" />, requiredPerm: 'financial_reports.view' },
    { id: 'transaction-explorer', label: 'Transaction Explorer', icon: <Receipt className="w-4 h-4" />, requiredPerm: 'transactions.view_admin' },
    { id: 'reconciliation', label: 'Reconciliation Panel', icon: <Scale className="w-4 h-4" />, requiredPerm: 'financial_reconciliation.view' },
    { id: 'adjustments', label: 'Manual Adjustments', icon: <Sliders className="w-4 h-4" />, requiredPerm: 'financial_adjustments.request' },
    { id: 'users', label: 'User Directory', icon: <Users className="w-4 h-4" />, requiredPerm: 'users.view' },
    { id: 'deposits', label: 'Deposits Review', icon: <ArrowDownCircle className="w-4 h-4" />, requiredPerm: 'deposits.view' },
    { id: 'deposit-bonuses', label: 'Deposit Bonus Tiers', icon: <Gift className="w-4 h-4" />, requiredPerm: 'settings.view' },
    { id: 'withdrawals', label: 'Withdrawals Queue', icon: <ArrowUpCircle className="w-4 h-4" />, requiredPerm: 'withdrawals.view', badge: '1 Pending' },
    { id: 'investment-plans', label: 'Plan Catalog & Limits', icon: <TrendingUp className="w-4 h-4" />, requiredPerm: 'investment_plans.view' },
    { id: 'investments', label: 'All Investments', icon: <FolderKanban className="w-4 h-4" />, requiredPerm: 'investment_plans.view' },
    { id: 'staking', label: 'Staking Validator Pools', icon: <Coins className="w-4 h-4" />, requiredPerm: 'investment_plans.view' },
    { id: 'games', label: 'Games Management', icon: <Gamepad2 className="w-4 h-4" />, requiredPerm: 'games.view' },
    { id: 'game-history', label: 'Game Session Logs', icon: <History className="w-4 h-4" />, requiredPerm: 'games.view' },
    { id: 'referrals', label: 'Referrals & Affiliates', icon: <Share2 className="w-4 h-4" />, requiredPerm: 'reports.view' },
    { id: 'support', label: 'Support Ticket Queue', icon: <LifeBuoy className="w-4 h-4" />, requiredPerm: 'support.view', badge: '2 Open' },
    { id: 'kyc', label: 'KYC Verification Desk', icon: <UserCheck className="w-4 h-4" />, requiredPerm: 'users.view', badge: '1 Pending' },
    { id: 'risk', label: 'Risk & Anomaly Radar', icon: <ShieldAlert className="w-4 h-4" />, requiredPerm: 'reports.view' },
    { id: 'reports', label: 'Financial & Ops Reports', icon: <BarChart3 className="w-4 h-4" />, requiredPerm: 'reports.view' },
    { id: 'notifications', label: 'Broadcasts & Alerts', icon: <Bell className="w-4 h-4" />, requiredPerm: 'settings.view' },
    { id: 'cms', label: 'CMS Content Pages', icon: <FileText className="w-4 h-4" />, requiredPerm: 'settings.view' },
    { id: 'admins', label: 'Staff & Admin Accounts', icon: <UserCog className="w-4 h-4" />, requiredPerm: 'admins.view', superAdminOnly: true },
    { id: 'roles', label: 'Roles & Permissions', icon: <KeyRound className="w-4 h-4" />, requiredPerm: 'settings.edit', superAdminOnly: true },
    { id: 'audit-logs', label: 'System Audit Logs', icon: <FileSpreadsheet className="w-4 h-4" />, requiredPerm: 'reports.view' },
    { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" />, requiredPerm: 'settings.view' },
  ];

  const handleSelectNav = (id: AdminViewId) => {
    onViewChange(id);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col text-left">
      {/* Top Admin Status Bar */}
      <div className="bg-indigo-950/80 border-b border-indigo-900/60 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">AMZDistributor Operations Control</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">Cryptographic Ledger Live</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Clearance:</span>
          <Badge variant="primary">{currentRole}</Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-950/70 shrink-0 select-none">
          {/* Admin Identity Card */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <Avatar name={user?.name || 'Administrator'} src={user?.avatar} size="md" />
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-white truncate">{user?.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-indigo-400">@{user?.username}</span>
                <span className="text-[10px] text-slate-400">({currentRole})</span>
              </div>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 text-xs">
            {adminNavItems.map((item) => {
              // Permission Gate
              if (item.superAdminOnly && currentRole !== 'SUPER_ADMIN') return null;
              if (item.requiredPerm && !hasPermission(item.requiredPerm)) return null;

              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-indigo-950 text-indigo-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Admin Sidebar Footer */}
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Admin Session</span>
            </button>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-900">
          {/* Header Bar */}
          <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800"
                aria-label="Open administrative drawer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white capitalize">
                  {currentView.replace('-', ' ')}
                </h1>
                <span className="text-[11px] text-slate-400">Institutional Governance & Compliance Oversight</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="neutral">Environment: Sandbox</Badge>
              <Avatar name={user?.name || 'Staff'} src={user?.avatar} size="sm" />
            </div>
          </header>

          {/* Dynamic Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-72 bg-slate-950 h-full shadow-2xl flex flex-col z-10 border-r border-slate-800">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-base text-white">Admin Modules</span>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
              {adminNavItems.map((item) => {
                if (item.superAdminOnly && currentRole !== 'SUPER_ADMIN') return null;
                if (item.requiredPerm && !hasPermission(item.requiredPerm)) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium ${
                      currentView === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && <span className="text-[10px] font-bold">{item.badge}</span>}
                  </button>
                );
              })}
            </nav>
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
        title="Leave Admin Control Session?"
        message="Your administrative clearance will be locked until re-authenticated."
        confirmText="Confirm Exit"
      />
    </div>
  );
};
