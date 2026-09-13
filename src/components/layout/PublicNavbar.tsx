import React, { useState } from 'react';
import { Shield, Menu, X, ChevronDown, Lock, UserCheck, ArrowRight, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { AmzLogo } from '../common/AmzLogo.js';
import { useAuth } from '../../context/AuthContext.js';

export interface PublicNavbarProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ currentRoute = 'home', onNavigate = (_route: string) => {} }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [legalDropdownOpen, setLegalDropdownOpen] = useState(false);
  const { user, currentRole, isAuthenticated, logout } = useAuth();

  const handleNav = (route: string) => {
    onNavigate(route);
    setMobileMenuOpen(false);
    setPlatformDropdownOpen(false);
    setLegalDropdownOpen(false);
  };

  const handlePortalClick = () => {
    if (!isAuthenticated) {
      handleNav('login');
    } else if (currentRole === 'USER') {
      handleNav('user-dashboard');
    } else {
      handleNav('admin-dashboard');
    }
  };

  const handleSignOut = async () => {
    await logout();
    handleNav('home');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('home')}>
            <AmzLogo size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => handleNav('home')}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                currentRoute === 'home' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
              }`}
            >
              Home
            </button>

            <button
              onClick={() => handleNav('about')}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                currentRoute === 'about' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
              }`}
            >
              About
            </button>

            {/* Platform Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
                className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <span>Platform</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {platformDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
                  <button
                    onClick={() => handleNav('investment-plans')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Investment Plans
                  </button>
                  <button
                    onClick={() => handleNav('staking')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Staking Pools
                  </button>
                  <button
                    onClick={() => handleNav('games')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Games Lobby
                  </button>
                  <button
                    onClick={() => handleNav('how-it-works')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    How It Works
                  </button>
                  <button
                    onClick={() => handleNav('referral-program')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Referral Program
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNav('security')}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                currentRoute === 'security' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
              }`}
            >
              Security
            </button>

            <button
              onClick={() => handleNav('system-status')}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                currentRoute === 'system-status' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
              }`}
            >
              Status
            </button>

            {/* Legal Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLegalDropdownOpen(!legalDropdownOpen)}
                className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <span>Compliance</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {legalDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
                  <button
                    onClick={() => handleNav('terms')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Terms & Conditions
                  </button>
                  <button
                    onClick={() => handleNav('privacy')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Privacy Policy
                  </button>
                  <button
                    onClick={() => handleNav('risk-disclosure')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Risk Disclosure
                  </button>
                  <button
                    onClick={() => handleNav('responsible-gaming')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Responsible Gaming
                  </button>
                  <button
                    onClick={() => handleNav('aml-kyc')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    AML / KYC Policy
                  </button>
                  <button
                    onClick={() => handleNav('faq')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    FAQ
                  </button>
                  <button
                    onClick={() => handleNav('blog-news')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    News & Updates
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNav('contact')}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                currentRoute === 'contact' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePortalClick}
                  leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
                >
                  {currentRole === 'USER' ? 'My Dashboard' : 'Admin Console'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  className="text-slate-400 hover:text-rose-400"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleNav('login')}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleNav('register')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePortalClick}
                className="text-xs py-1 px-2.5"
              >
                {currentRole === 'USER' ? 'Dashboard' : 'Admin'}
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNav('login')}
                  className="text-xs py-1 px-2.5"
                >
                  Log In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleNav('register')}
                  className="text-xs py-1 px-2.5"
                >
                  Register
                </Button>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <button onClick={() => handleNav('home')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Home</button>
            <button onClick={() => handleNav('about')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">About</button>
            <button onClick={() => handleNav('investment-plans')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Investment Plans</button>
            <button onClick={() => handleNav('staking')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Staking</button>
            <button onClick={() => handleNav('games')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Games</button>
            <button onClick={() => handleNav('how-it-works')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">How It Works</button>
            <button onClick={() => handleNav('referral-program')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Referrals</button>
            <button onClick={() => handleNav('security')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Security</button>
            <button onClick={() => handleNav('faq')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">FAQ</button>
            <button onClick={() => handleNav('blog-news')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">News</button>
            <button onClick={() => handleNav('contact')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Contact</button>
            <button onClick={() => handleNav('terms')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Terms</button>
            <button onClick={() => handleNav('privacy')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Privacy</button>
            <button onClick={() => handleNav('risk-disclosure')} className="p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Risk Disclosure</button>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Button variant="primary" size="sm" onClick={handlePortalClick} className="w-full">
                  Go to {currentRole === 'USER' ? 'My Dashboard' : 'Admin Console'}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleNav('login')}>
                    Switch Account
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="text-rose-400">
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleNav('login')} className="w-full">
                  Log In
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleNav('register')} className="w-full">
                  Create Account
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
