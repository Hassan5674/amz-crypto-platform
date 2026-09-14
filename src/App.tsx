import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CoinAnimationProvider } from './components/animations/CoinAnimationContext.js';
import { AudioProvider } from './components/audio/AudioContext.js';
import { SessionAuthWrapper } from './components/common/SessionAuthWrapper.js';
import { PublicNavbar } from './components/layout/PublicNavbar.js';
import { PublicFooter } from './components/layout/PublicFooter.js';

// Public pages
import { HomePage } from './pages/public/HomePage.js';
import {
  InvestmentPlansPage,
  StakingPage,
  GamesPage,
  HowItWorksPage,
  ReferralProgramPage,
} from './pages/public/PlatformPages.js';
import {
  AboutPage,
  FAQPage,
  SecurityPage,
  ContactPage,
  BlogNewsPage,
  TermsPage,
  PrivacyPage,
  RiskDisclosurePage,
  ResponsibleGamingPage,
  AmlKycPage,
  SystemStatusPage,
} from './pages/public/LegalCompliancePages.js';

// Auth screens & error pages
import {
  LoginScreen,
  RegisterScreen,
  AdminLoginScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  EmailVerificationScreen,
  AccountLockedScreen,
  SessionExpiredScreen,
  Error404Page,
  Error403Page,
  Error500Page,
} from './pages/auth/AuthScreens.js';

// User dashboard layout & views
import { UserDashboardLayout, UserViewId } from './pages/dashboard/UserDashboardLayout.js';
import {
  DashboardOverviewView,
  WalletView,
  DepositsView,
  WithdrawalsView,
  InvestmentPlansUserView,
  MyInvestmentsView,
  StakingUserView,
  GamesUserView,
  GameHistoryUserView,
  ReferralsUserView,
  TransactionsUserView,
  NotificationsUserView,
  SupportUserView,
  ProfileUserView,
  SecurityUserView,
  SettingsUserView,
} from './pages/dashboard/UserDashboardViews.js';

// Admin dashboard layout & views
import { AdminDashboardLayout, AdminViewId } from './pages/admin/AdminDashboardLayout.js';
import {
  AdminOverviewView,
  AdminUsersView,
  AdminDepositsView,
  AdminDepositBonusesView,
  AdminWithdrawalsView,
  AdminInvestmentPlansView,
  AdminInvestmentsView,
  AdminStakingView,
  AdminGamesView,
  AdminGameHistoryView,
  AdminReferralsView,
  AdminSupportView,
  AdminKycView,
  AdminRiskView,
  AdminReportsView,
  AdminNotificationsView,
  AdminCmsView,
  AdminStaffView,
  AdminRolesView,
  AdminAuditLogsView,
  AdminSettingsView,
} from './pages/admin/AdminViews.js';
import {
  AdminFinancialOverviewView,
  AdminTransactionExplorerView,
  AdminReconciliationView,
  AdminManualAdjustmentView,
} from './components/finance/AdminFinanceViews.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';

export type AppRoute =
  | 'home'
  | 'investment-plans'
  | 'staking'
  | 'games'
  | 'how-it-works'
  | 'referral-program'
  | 'about'
  | 'faq'
  | 'security'
  | 'contact'
  | 'blog-news'
  | 'terms'
  | 'privacy'
  | 'risk-disclosure'
  | 'responsible-gaming'
  | 'aml-kyc'
  | 'system-status'
  | 'login'
  | 'admin-login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'account-locked'
  | 'session-expired'
  | 'user-dashboard'
  | 'admin-dashboard'
  | '404'
  | '403'
  | '500';

function MainApp() {
  const { isAuthenticated, currentRole, logout } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash === 'admin' || hash === 'admin-login') return 'admin-login';
      if (hash === 'login') return 'login';
      if (hash === 'register') return 'register';
    }
    return 'home';
  });
  const [userView, setUserView] = useState<UserViewId>('overview');
  const [adminView, setAdminView] = useState<AdminViewId>('overview');

  // Listen to hash changes for deep links like #admin or #login
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash === 'admin' || hash === 'admin-login') {
        setCurrentRoute('admin-login');
      } else if (hash === 'login') {
        setCurrentRoute('login');
      } else if (hash === 'register') {
        setCurrentRoute('register');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 15-minute inactivity auto-logout timer for enterprise security
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 15 minutes in milliseconds = 900,000 ms
      timeoutId = setTimeout(() => {
        logout();
        setCurrentRoute('session-expired');
      }, 15 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout]);

  // Auto-redirect if role switches while on dashboard or login pages
  useEffect(() => {
    if (isAuthenticated) {
      if (currentRole === 'USER') {
        if (currentRoute === 'login' || currentRoute === 'register' || currentRoute === 'admin-login' || currentRoute === 'admin-dashboard') {
          setCurrentRoute('user-dashboard');
        }
      } else {
        // Staff/Admin roles
        if (currentRoute === 'login' || currentRoute === 'register' || currentRoute === 'admin-login' || currentRoute === 'user-dashboard') {
          setCurrentRoute('admin-dashboard');
        }
      }
    }
  }, [isAuthenticated, currentRole]);

  // Check for crypto wallet deep link callbacks (e.g. from Phantom Mobile or MetaMask return)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasPhantom = params.get('phantom_connect') || params.get('phantom_encryption_public_key');
    const hasDeposit = params.get('open_deposit');

    if (hasPhantom || hasDeposit) {
      const pubKey = params.get('phantom_encryption_public_key');
      const address = pubKey || ('7VzSol' + Math.random().toString(36).substring(2, 8) + 'Sol');
      const state = {
        address,
        walletType: 'PHANTOM',
        chainId: 999999,
        chainName: 'Solana Mainnet',
        isSigned: true,
        signature: 'phantom_deeplink_verified',
        signedAt: new Date().toISOString()
      };
      localStorage.setItem('apex_connected_wallet', JSON.stringify(state));
      sessionStorage.setItem('apex_auto_open_deposit', '1');
      window.dispatchEvent(new Event('apex_wallet_connected'));

      if (isAuthenticated) {
        setCurrentRoute('user-dashboard');
        setUserView('deposits');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated]);

  const handleNavigate = (route: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Normalize and map potential route aliases to valid AppRoute values
    let targetRoute: AppRoute = 'home';
    const normalized = route.toLowerCase().trim();

    if (normalized === 'dashboard' || normalized === 'user-dashboard' || normalized === 'portal') {
      targetRoute = isAuthenticated && currentRole !== 'USER' ? 'admin-dashboard' : (isAuthenticated ? 'user-dashboard' : 'login');
    } else if (normalized === 'admin-dashboard' || normalized === 'admin-portal') {
      targetRoute = isAuthenticated && currentRole !== 'USER' ? 'admin-dashboard' : 'admin-login';
    } else if (normalized === 'admin' || normalized === 'admin-login') {
      targetRoute = 'admin-login';
    } else if (normalized === 'blog' || normalized === 'news' || normalized === 'blog-news') {
      targetRoute = 'blog-news';
    } else if (normalized === 'plans' || normalized === 'investment-plans') {
      targetRoute = 'investment-plans';
    } else if (normalized === 'referrals' || normalized === 'referral-program') {
      targetRoute = 'referral-program';
    } else if (normalized === 'status' || normalized === 'system-status') {
      targetRoute = 'system-status';
    } else if (normalized === 'kyc' || normalized === 'aml' || normalized === 'aml-kyc') {
      targetRoute = 'aml-kyc';
    } else if (normalized === 'terms' || normalized === 'terms-and-conditions') {
      targetRoute = 'terms';
    } else if (normalized === 'privacy' || normalized === 'privacy-policy') {
      targetRoute = 'privacy';
    } else if (normalized === 'risk' || normalized === 'risk-disclosure') {
      targetRoute = 'risk-disclosure';
    } else if (normalized === 'responsible-gaming' || normalized === 'gaming-policy') {
      targetRoute = 'responsible-gaming';
    } else if (normalized === 'how-it-works') {
      targetRoute = 'how-it-works';
    } else if (normalized === 'staking') {
      targetRoute = 'staking';
    } else if (normalized === 'games') {
      targetRoute = 'games';
    } else if (normalized === 'about') {
      targetRoute = 'about';
    } else if (normalized === 'faq') {
      targetRoute = 'faq';
    } else if (normalized === 'security') {
      targetRoute = 'security';
    } else if (normalized === 'contact') {
      targetRoute = 'contact';
    } else if (normalized === 'login') {
      targetRoute = 'login';
    } else if (normalized === 'register') {
      targetRoute = 'register';
    } else if (normalized === 'forgot-password') {
      targetRoute = 'forgot-password';
    } else if (normalized === 'reset-password') {
      targetRoute = 'reset-password';
    } else if (normalized === 'verify-email') {
      targetRoute = 'verify-email';
    } else {
      targetRoute = (route as AppRoute) || 'home';
    }

    setCurrentRoute(targetRoute);
  };

  const handleLogout = () => {
    logout();
    setCurrentRoute('home');
  };

  // 1. User Dashboard Rendering
  if (currentRoute === 'user-dashboard') {
    if (!isAuthenticated) {
      return (
        <LoginScreen
          onNavigate={(route) => setCurrentRoute(route as AppRoute)}
          onSuccess={() => setCurrentRoute('user-dashboard')}
        />
      );
    }

    return (
      <UserDashboardLayout
        currentView={userView}
        onViewChange={(v) => setUserView(v)}
        onLogout={handleLogout}
      >
        <ErrorBoundary fallbackTitle="Unable to load this dashboard view">
          {userView === 'overview' && <DashboardOverviewView onViewChange={setUserView} />}
          {userView === 'wallet' && <WalletView />}
          {userView === 'deposits' && <DepositsView />}
          {userView === 'withdrawals' && <WithdrawalsView />}
          {userView === 'investment-plans' && <InvestmentPlansUserView onViewChange={setUserView} />}
          {userView === 'my-investments' && <MyInvestmentsView />}
          {userView === 'staking' && <StakingUserView />}
          {userView === 'games' && <GamesUserView />}
          {userView === 'game-history' && <GameHistoryUserView />}
          {userView === 'referrals' && <ReferralsUserView />}
          {userView === 'transactions' && <TransactionsUserView />}
          {userView === 'notifications' && <NotificationsUserView />}
          {userView === 'support' && <SupportUserView />}
          {userView === 'profile' && <ProfileUserView />}
          {userView === 'security' && <SecurityUserView />}
          {userView === 'settings' && <SettingsUserView />}
        </ErrorBoundary>
      </UserDashboardLayout>
    );
  }

  // 2. Admin Dashboard Rendering
  if (currentRoute === 'admin-dashboard') {
    if (!isAuthenticated || currentRole === 'USER') {
      return (
        <AdminLoginScreen
          onNavigate={(route) => setCurrentRoute(route as AppRoute)}
          onSuccess={() => setCurrentRoute('admin-dashboard')}
        />
      );
    }

    return (
      <AdminDashboardLayout
        currentView={adminView}
        onViewChange={(v) => setAdminView(v)}
        onLogout={handleLogout}
      >
        <ErrorBoundary fallbackTitle="Unable to load this admin panel view">
          {adminView === 'overview' && <AdminOverviewView onViewChange={setAdminView} />}
          {adminView === 'financial-overview' && <AdminFinancialOverviewView />}
          {adminView === 'transaction-explorer' && <AdminTransactionExplorerView />}
          {adminView === 'reconciliation' && <AdminReconciliationView />}
          {adminView === 'adjustments' && <AdminManualAdjustmentView />}
          {adminView === 'users' && <AdminUsersView />}
          {adminView === 'deposits' && <AdminDepositsView />}
          {adminView === 'deposit-bonuses' && <AdminDepositBonusesView />}
          {adminView === 'withdrawals' && <AdminWithdrawalsView />}
          {adminView === 'investment-plans' && <AdminInvestmentPlansView />}
          {adminView === 'investments' && <AdminInvestmentsView />}
          {adminView === 'staking' && <AdminStakingView />}
          {adminView === 'games' && <AdminGamesView />}
          {adminView === 'game-history' && <AdminGameHistoryView />}
          {adminView === 'referrals' && <AdminReferralsView />}
          {adminView === 'support' && <AdminSupportView />}
          {adminView === 'kyc' && <AdminKycView />}
          {adminView === 'risk' && <AdminRiskView />}
          {adminView === 'reports' && <AdminReportsView />}
          {adminView === 'notifications' && <AdminNotificationsView />}
          {adminView === 'cms' && <AdminCmsView />}
          {adminView === 'admins' && <AdminStaffView />}
          {adminView === 'roles' && <AdminRolesView />}
          {adminView === 'audit-logs' && <AdminAuditLogsView />}
          {adminView === 'settings' && <AdminSettingsView />}
        </ErrorBoundary>
      </AdminDashboardLayout>
    );
  }

  // 3. Auth Screens Rendering (Full Screen, no navbar/footer)
  if (currentRoute === 'admin-login') {
    return (
      <AdminLoginScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
        onSuccess={() => setCurrentRoute('admin-dashboard')}
      />
    );
  }

  if (currentRoute === 'login') {
    return (
      <LoginScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
        onSuccess={() => {
          if (currentRole === 'USER') setCurrentRoute('user-dashboard');
          else setCurrentRoute('admin-dashboard');
        }}
      />
    );
  }

  if (currentRoute === 'register') {
    return (
      <RegisterScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
        onSuccess={() => setCurrentRoute('verify-email')}
      />
    );
  }

  if (currentRoute === 'forgot-password') {
    return (
      <ForgotPasswordScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
      />
    );
  }

  if (currentRoute === 'reset-password') {
    return (
      <ResetPasswordScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
      />
    );
  }

  if (currentRoute === 'verify-email') {
    return (
      <EmailVerificationScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
        onSuccess={() => setCurrentRoute('user-dashboard')}
      />
    );
  }

  if (currentRoute === 'account-locked') {
    return (
      <AccountLockedScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
      />
    );
  }

  if (currentRoute === 'session-expired') {
    return (
      <SessionExpiredScreen
        onNavigate={(route) => setCurrentRoute(route as AppRoute)}
      />
    );
  }

  if (currentRoute === '403') {
    return (
      <Error403Page onNavigate={(route) => setCurrentRoute(route as AppRoute)} />
    );
  }

  if (currentRoute === '500') {
    return (
      <Error500Page onNavigate={(route) => setCurrentRoute(route as AppRoute)} />
    );
  }

  // 4. Public Web Pages Rendering (With Navbar & Footer)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      <PublicNavbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenLogin={() => setCurrentRoute('login')}
        onOpenRegister={() => setCurrentRoute('register')}
      />

      <main className="flex-1">
        {currentRoute === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
          />
        )}
        {currentRoute === 'investment-plans' && (
          <InvestmentPlansPage onNavigate={handleNavigate} />
        )}
        {currentRoute === 'staking' && (
          <StakingPage onNavigate={handleNavigate} />
        )}
        {currentRoute === 'games' && (
          <GamesPage onNavigate={handleNavigate} />
        )}
        {currentRoute === 'how-it-works' && <HowItWorksPage onNavigate={handleNavigate} />}
        {currentRoute === 'referral-program' && (
          <ReferralProgramPage onNavigate={handleNavigate} />
        )}
        {currentRoute === 'about' && <AboutPage />}
        {currentRoute === 'faq' && <FAQPage />}
        {currentRoute === 'security' && <SecurityPage />}
        {currentRoute === 'contact' && <ContactPage />}
        {currentRoute === 'blog-news' && <BlogNewsPage />}
        {currentRoute === 'terms' && <TermsPage />}
        {currentRoute === 'privacy' && <PrivacyPage />}
        {currentRoute === 'risk-disclosure' && <RiskDisclosurePage />}
        {currentRoute === 'responsible-gaming' && <ResponsibleGamingPage />}
        {currentRoute === 'aml-kyc' && <AmlKycPage />}
        {currentRoute === 'system-status' && <SystemStatusPage />}

        {/* Fallback 404 */}
        {![
          'home',
          'investment-plans',
          'staking',
          'games',
          'how-it-works',
          'referral-program',
          'about',
          'faq',
          'security',
          'contact',
          'blog-news',
          'terms',
          'privacy',
          'risk-disclosure',
          'responsible-gaming',
          'aml-kyc',
          'system-status',
        ].includes(currentRoute) && (
          <Error404Page onNavigate={(route) => setCurrentRoute(route as AppRoute)} />
        )}
      </main>

      <PublicFooter onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CoinAnimationProvider>
        <AudioProvider>
          <SessionAuthWrapper>
            <MainApp />
          </SessionAuthWrapper>
        </AudioProvider>
      </CoinAnimationProvider>
    </AuthProvider>
  );
}
