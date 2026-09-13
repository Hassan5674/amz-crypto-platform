import React from 'react';
import { Shield, Lock, ArrowUpRight } from 'lucide-react';
import { AmzLogo } from '../common/AmzLogo.js';

export const PublicFooter: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs text-left">
      {/* Platform Protocol Notice Banner */}
      <div className="bg-slate-950/80 border-b border-slate-800 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3 text-slate-300 text-xs">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-white">AMZDistributor Protocol:</strong> Multi-currency institutional gateway with real-time on-chain confirmation, verifiable distribution ledger, and enterprise cryptographic security standards.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <AmzLogo size="md" />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An institutional web platform engineered for multi-tier portfolio oversight, verified high-speed distribution, and enterprise role-based governance.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>TLS 1.3 Strict Transport Encryption</span>
            </div>
          </div>

          {/* Platform Col */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Platform</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => onNavigate('investment-plans')} className="hover:text-white">Investment Plans</button></li>
              <li><button onClick={() => onNavigate('staking')} className="hover:text-white">Staking Pools</button></li>
              <li><button onClick={() => onNavigate('games')} className="hover:text-white">Games Lobby</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white">How It Works</button></li>
              <li><button onClick={() => onNavigate('referral-program')} className="hover:text-white">Referrals</button></li>
            </ul>
          </div>

          {/* Compliance & Security Col */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Governance</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => onNavigate('security')} className="hover:text-white">Security Controls</button></li>
              <li><button onClick={() => onNavigate('aml-kyc')} className="hover:text-white">AML/KYC Framework</button></li>
              <li><button onClick={() => onNavigate('risk-disclosure')} className="hover:text-white">Risk Disclosure</button></li>
              <li><button onClick={() => onNavigate('responsible-gaming')} className="hover:text-white">Responsible Gaming</button></li>
              <li><button onClick={() => onNavigate('system-status')} className="hover:text-white">System Status</button></li>
            </ul>
          </div>

          {/* Legal Col */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Legal</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => onNavigate('terms')} className="hover:text-white">Terms of Service</button></li>
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-white">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('faq')} className="hover:text-white">FAQ</button></li>
              <li><button onClick={() => onNavigate('contact')} className="hover:text-white">Support & Contact</button></li>
              <li><button onClick={() => onNavigate('blog-news')} className="hover:text-white">Platform News</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} AMZDistributor Global Logistics & Finance. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>ISO/IEC 27001 Prepared</span>
            <span>•</span>
            <span>Deterministic Seed Protocol</span>
            <span>•</span>
            <span>Modular RBAC Matrix</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
