import React from 'react';
import {
  Shield,
  TrendingUp,
  Coins,
  Gamepad2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  HelpCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';

export const HomePage: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <div className="w-full text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Architecture Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            Institutional Logistics, Distribution & Financial Infrastructure
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Institutional Governance for Capital, Staking, and Verifiable Commerce.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AMZDistributor delivers high-reliability multi-tier portfolio oversight, transparent provably fair gaming architectures, and granular enterprise permission matrices.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" variant="primary" onClick={() => onNavigate('register')} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Verified Account
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('investment-plans')}>
              Explore Plans & Limits
            </Button>
          </div>

          {/* Platform Status Card */}
          <div className="mt-12 max-w-2xl mx-auto p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-left flex items-start gap-3 text-xs text-emerald-950 dark:text-emerald-200">
            <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-900 dark:text-white">AMZDistributor Operations Active:</strong> Automated cryptocurrency deposit gateway with instant verification, real-time multi-network support, and enterprise ledger security are online.
            </div>
          </div>
        </div>
      </section>

      {/* 2. Platform Statistics */}
      <section className="py-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Platform Infrastructure Benchmarks
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">RBAC Security Roles</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">8 Defined</div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 inline-block">24 Granular Permissions</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Supported Crypto Assets</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">10+ Coins</div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 inline-block">Instant Settlement</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gateway Latency</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">&lt; 15 ms</div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 inline-block">Global Edge Network</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Security Standard</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">SOC-2 / TLS 1.3</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">Enterprise Protected</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform Overview Pillars */}
      <section className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Engineered Across Three Core Operational Verticals
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            AMZDistributor establishes dedicated execution boundaries for investment models, staking protocols, and provably fair arcade mechanics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <Card hoverEffect className="text-left">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Structured Investment Plans
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              Multi-tiered duration structures with conservative, balanced, and dynamic risk allocations. Transparent fee schedules with no hidden exit penalties.
            </p>
            <button
              onClick={() => onNavigate('investment-plans')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:gap-2 transition-all"
            >
              <span>View Structure Catalog</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </Card>

          {/* Pillar 2 */}
          <Card hoverEffect className="text-left">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-5">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delegated Staking Infrastructure
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              Direct validator pool integration with simulated lockups across top proof-of-stake networks. Non-custodial ledger tracking and automated status checks.
            </p>
            <button
              onClick={() => onNavigate('staking')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:gap-2 transition-all"
            >
              <span>Inspect Staking Pools</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </Card>

          {/* Pillar 3 */}
          <Card hoverEffect className="text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Provably Fair Games Lobby
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              Cryptographically verified Dice, Coin Flip, Red/Black, and Number Matrix games. Complete client-side seed verification with zero house manipulation.
            </p>
            <button
              onClick={() => onNavigate('games')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:gap-2 transition-all"
            >
              <span>Explore Games Lobby</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </Card>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Protocol Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Four Steps to Multi-Role Participation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Step 01</div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Identity Verification</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Register an account, verify email and phone channels, and submit Tier 1 basic profile identification.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Step 02</div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Select Strategy</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose between Fixed-Duration Treasury models, staking pools, or transparent probabilistic simulations.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Step 03</div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Audit Trail Logging</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every event, status change, and session update is recorded into immutable, timestamped audit logs.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Step 04</div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Role Governance</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Operations, finance approvals, and game audits are partitioned across dedicated administrative clearances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Security & Compliance Highlights */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-left space-y-4">
            <Badge variant="primary" size="md">Enterprise Security Architecture</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Zero Trust RBAC and Continuous Audit Trails
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Privilege escalation is impossible by design. Client requests validate against server-side authorization middleware with token rotation, IP verification, and sensitive credential masking.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>8 Independent Staff Roles with granular 24-permission enforcement</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Masked audit logging sanitizing credentials, secrets, and private tokens</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Double-entry cryptographic ledger with real-time balance reconciliation</span>
              </div>
            </div>
            <div className="pt-3">
              <Button variant="outline" size="sm" onClick={() => onNavigate('security')}>
                Read Security Whitepaper
              </Button>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl border border-slate-800 shadow-xl font-mono text-xs text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-[11px] text-slate-500">
              <span>SECURITY_EVENT_AUDIT_STREAM</span>
              <span className="text-emerald-400">ACTIVE_LISTENER</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="text-slate-400">[2026-09-07T14:45:10Z] <span className="text-indigo-400">AUTH:</span> Session initialized (User ID: 4)</div>
              <div className="text-slate-400">[2026-09-07T14:45:12Z] <span className="text-emerald-400">RBAC:</span> Permission 'users.view' verified for FINANCE</div>
              <div className="text-slate-400">[2026-09-07T14:45:15Z] <span className="text-emerald-400">GUARD:</span> Financial gateway transaction verified: LIVE_LEDGER_POSTED</div>
              <div className="text-slate-400">[2026-09-07T14:45:20Z] <span className="text-sky-400">AUDIT:</span> SHA-256 seal generated for audit log chunk #4102</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Quick Accordion */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-left">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 mt-1">Key information regarding platform capabilities and investor governance.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">How are cryptocurrency deposits processed?</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Deposits are handled directly via multi-chain cryptographic payment gateways supporting Bitcoin, Ethereum, Solana, USDT, TRON, and over 500 Web3 wallets with automatic on-chain ledger confirmation.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Are investment returns or staking yields guaranteed?</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                No. AMZDistributor never makes false claims of "guaranteed returns" or "risk-free investing". All yields and returns reflect actual protocol performance and market allocations.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">How does Role-Based Access Control work?</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Every administrative action checks specific permissions (e.g. `users.suspend`, `deposits.manage`, `settings.edit`). Even administrators cannot perform sensitive tasks outside their assigned department.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Call To Action Banner */}
      <section className="py-16 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to Inspect the Enterprise Portal?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-indigo-200 max-w-xl mx-auto">
            Access the user dashboard, review available investment catalogs, test the games lobby, or switch to the administrative control panel.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="md" variant="primary" onClick={() => onNavigate('dashboard')}>
              Enter User Dashboard
            </Button>
            <Button size="md" variant="outline" onClick={() => onNavigate('system-status')} className="text-white border-indigo-400/40 hover:bg-indigo-900/40">
              Check System Status
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
