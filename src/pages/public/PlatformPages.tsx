import React, { useState } from 'react';
import {
  TrendingUp,
  Coins,
  Gamepad2,
  Lock,
  ArrowRight,
  Shield,
  Percent,
  Calendar,
  Users,
  AlertTriangle,
  Play,
  Share2,
  Award
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { Alert } from '../../components/ui/Alert.js';
import { InvestmentPlan, GameItem, StakingPool } from '../../types/index.js';

// ----------------------------------------------------------------------
// 1. Investment Plans Public Page
// ----------------------------------------------------------------------
export const InvestmentPlansPage: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);

  const plans: any[] = [
    {
      id: 1,
      slug: 'conservative-treasury',
      name: 'Conservative Treasury Index',
      description: 'Structured low-volatility model prioritizing capital preservation with short-duration exposure to institutional credit notes.',
      image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      min_amount: 100,
      max_amount: 5000,
      duration_days: 30,
      target_return_indicator: '4.5% - 6.0% (Indicative / Non-guaranteed)',
      risk_level: 'CONSERVATIVE',
      status: 'ACTIVE',
      currency: 'USD',
      created_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 2,
      slug: 'balanced-growth',
      name: 'Balanced Multi-Asset Strategy',
      description: 'Balanced risk-adjusted strategy combining fixed yield instruments with curated algorithmic liquidity provision.',
      image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      min_amount: 500,
      max_amount: 25000,
      duration_days: 90,
      target_return_indicator: '7.5% - 10.0% (Indicative / Non-guaranteed)',
      risk_level: 'MODERATE',
      status: 'ACTIVE',
      currency: 'USD',
      created_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 3,
      slug: 'dynamic-alpha',
      name: 'Dynamic Alpha Portfolio',
      description: 'High-dynamism quantitative diversification across decentralized protocol incentives and infrastructure nodes.',
      image_url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
      min_amount: 2000,
      max_amount: 100000,
      duration_days: 180,
      target_return_indicator: '12.0% - 16.5% (Indicative / Non-guaranteed)',
      risk_level: 'DYNAMIC',
      status: 'ACTIVE',
      currency: 'USD',
      created_at: '2025-01-10T00:00:00Z'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <Badge variant="primary" size="md">Asset Allocation Catalog</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          Structured Investment Plans
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Clear minimum and maximum capital parameters, defined lockup horizons, and non-guaranteed target disclosure indicators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.id} hoverEffect className="flex flex-col justify-between overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
            {plan.image_url ? (
              <div className="h-44 w-full overflow-hidden bg-slate-900 relative">
                <img
                  src={plan.image_url}
                  alt={plan.name}
                  className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={
                      plan.risk_level === 'CONSERVATIVE'
                        ? 'success'
                        : plan.risk_level === 'MODERATE'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {plan.risk_level} RISK
                  </Badge>
                </div>
              </div>
            ) : null}

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                {!plan.image_url && (
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant={
                        plan.risk_level === 'CONSERVATIVE'
                          ? 'success'
                          : plan.risk_level === 'MODERATE'
                          ? 'info'
                          : 'warning'
                      }
                    >
                      {plan.risk_level} RISK
                    </Badge>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {plan.duration_days} Days Lockup
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  {plan.description}
                </p>

                <div className="space-y-3 py-4 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Min Allocation:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ${plan.min_amount.toLocaleString()} {plan.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Allocation:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ${plan.max_amount.toLocaleString()} {plan.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Return Rate:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {plan.target_return_indicator}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Settlement:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Automated Smart Ledger
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedPlan(plan)}
                >
                  Inspect Plan Specification
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <Modal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          title={selectedPlan.name}
          description="Investment Specification & Risk Profile"
        >
          <div className="space-y-4 text-xs">
            {selectedPlan.image_url && (
              <div className="h-40 w-full rounded-xl overflow-hidden mb-3 bg-slate-900">
                <img
                  src={selectedPlan.image_url}
                  alt={selectedPlan.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Description:</div>
              <p className="text-slate-600 dark:text-slate-400">{selectedPlan.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                <span className="font-bold text-sm">{(selectedPlan.active_version as any)?.duration_days || (selectedPlan as any).duration_days || 30} Calendar Days</span>
              </div>
              <div className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase">Min - Max Limits</span>
                <span className="font-bold text-sm">${(selectedPlan.active_version as any)?.min_amount || (selectedPlan as any).min_amount || '100'} - ${(selectedPlan.active_version as any)?.max_amount || (selectedPlan as any).max_amount || '10,000'}</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-900 dark:text-indigo-300">
              <strong>Capital Allocation:</strong> Real-time ledger execution with daily returns calculation and automated smart ledger distribution upon cycle maturity.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedPlan(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setSelectedPlan(null); onNavigate('dashboard'); }}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. Staking Public Page
// ----------------------------------------------------------------------
export const StakingPage: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  const pools: StakingPool[] = [
    {
      id: 1,
      asset_symbol: 'ETH',
      asset_name: 'Ethereum Validator Reserve',
      lockup_days: 60,
      min_stake: 0.1,
      max_stake: 32.0,
      estimated_apr_indicator: '3.8% - 4.5% (Indicative)',
      status: 'ACTIVE',
      total_staked_indicator: '1,420 ETH (Simulated)'
    },
    {
      id: 2,
      asset_symbol: 'SOL',
      asset_name: 'Solana High-Throughput Node',
      lockup_days: 30,
      min_stake: 2.0,
      max_stake: 1000.0,
      estimated_apr_indicator: '6.2% - 7.1% (Indicative)',
      status: 'ACTIVE',
      total_staked_indicator: '28,450 SOL (Simulated)'
    },
    {
      id: 3,
      asset_symbol: 'USDC',
      asset_name: 'USD Stablecoin Liquidity Reserve',
      lockup_days: 90,
      min_stake: 100,
      max_stake: 100000,
      estimated_apr_indicator: '5.2% (Indicative)',
      status: 'ACTIVE',
      total_staked_indicator: '$2,150,000 (Simulated)'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <Badge variant="primary" size="md">Proof of Stake Governance</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          Delegated Staking Infrastructure
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Validator pool integrations with transparent lockup terms, real-time yield distribution, and non-custodial cryptographic security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pools.map((p) => (
          <Card key={p.id} hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                  {p.asset_symbol}
                </div>
                <Badge variant="success">{p.status}</Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{p.asset_name}</h3>
              <p className="text-xs text-slate-500 mb-4">{p.lockup_days} Days Lockup Cycle</p>

              <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Min / Max Stake:</span>
                  <span className="font-semibold">{p.min_stake} - {p.max_stake} {p.asset_symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated APR:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.estimated_apr_indicator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pool Volume:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{p.total_staked_indicator}</span>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('dashboard')}>
                Stake Assets Now
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. Games Lobby Public Page
// ----------------------------------------------------------------------
export const GamesPage: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  const [activeGameDemo, setActiveGameDemo] = useState<GameItem | null>(null);

  const games: GameItem[] = [
    {
      id: 1,
      slug: 'classic-dice',
      name: 'Quantum Dice',
      category: 'PROBABILISTIC',
      description: 'Provably fair deterministic dice protocol with verifiable seed verification.',
      thumbnail: 'https://images.unsplash.com/photo-1570303345338-e1f0eddf4946?w=600&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '98.5% (Configured Model)'
    },
    {
      id: 2,
      slug: 'coin-flip',
      name: 'Binary Coin Flip',
      category: 'PROBABILISTIC',
      description: 'High-speed two-state probabilistic simulation with instant cryptographic verification.',
      thumbnail: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=600&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '98.0% (Configured Model)'
    },
    {
      id: 3,
      slug: 'red-black',
      name: 'Roulette Red / Black',
      category: 'PROBABILISTIC',
      description: 'Color-based European single-zero probabilistic sector distribution.',
      thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '97.3% (Standard Sector)'
    },
    {
      id: 4,
      slug: 'number-game',
      name: 'AMZDistributor Number Matrix',
      category: 'STRATEGY',
      description: 'Multi-tiered grid matrix selection with combinatorial multiplier structures.',
      thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '96.8% (Configured Model)'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <Badge variant="primary" size="md">Verifiable Entertainment</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          Provably Fair Games Lobby
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Interactive probabilistic engines equipped with transparent seed generation and mathematical RTP disclosures.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {games.map((g) => (
          <Card key={g.id} hoverEffect className="p-0 overflow-hidden flex flex-col justify-between">
            <div className="relative h-44 overflow-hidden bg-slate-950">
              <img
                src={g.thumbnail}
                alt={g.name}
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3">
                <Badge variant="success">{g.status}</Badge>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {g.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 mb-1">{g.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{g.description}</p>
                <div className="text-[11px] text-slate-500 font-medium">
                  RTP Spec: <strong className="text-slate-800 dark:text-slate-200">{g.rtp_indicator}</strong>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                  onClick={() => setActiveGameDemo(g)}
                >
                  Play Game
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Game Sandbox Modal */}
      {activeGameDemo && (
        <Modal
          isOpen={!!activeGameDemo}
          onClose={() => setActiveGameDemo(null)}
          title={`Game Session: ${activeGameDemo.name}`}
          description="Provably Fair Cryptographic Game Engine"
        >
          <div className="space-y-4 text-xs text-left">
            <div className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-center border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase mb-2">Cryptographic Seed Verification</div>
              <div className="text-xs text-emerald-400 break-all mb-3">
                Server Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </div>
              <div className="p-6 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-2xl font-bold text-white mb-1">🎮 Provably Fair Engine Ready</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Play interactive games with instant on-chain or off-chain verifiable seed generation in the player dashboard.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveGameDemo(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setActiveGameDemo(null); onNavigate('dashboard'); }}>
                Go to Games Lobby
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. How It Works Public Page
// ----------------------------------------------------------------------
export const HowItWorksPage: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Badge variant="primary" size="md">User Guide & Flow</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          How AMZDistributor Operates
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Understanding our multi-layered governance, audit trails, and participation cycles.
        </p>
      </div>

      <div className="space-y-8">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-5 items-start">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            1
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Registration & Security Enrollment</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every member registers with email, username, phone, and optional two-factor authentication (2FA). Passwords undergo argon2/bcrypt-compatible hashing with zero plaintext persistence.
            </p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-5 items-start">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            2
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Verification & Tier Compliance</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              In accordance with international AML/KYC standards, user tiers determine transaction boundaries with continuous real-time ledger status validation.
            </p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-5 items-start">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            3
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Plan Selection & Duration Horizons</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Users review catalog parameters including duration schedules (30, 90, 180 days), minimum capital entries, and risk levels before committing allocations.
            </p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-5 items-start">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            4
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Administrative Separation of Duties</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Financial reconciliation is managed strictly by Finance roles; customer tickets are managed by Support; and Super Admin manages the system permissions matrix.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. Referral Program Public Page
// ----------------------------------------------------------------------
export const ReferralProgramPage: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Badge variant="primary" size="md">Community Growth</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          AMZDistributor Referral Program
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Transparent multi-tier invitation architecture with automated commission settlements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="text-center p-6">
          <Share2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
          <h3 className="font-bold text-base mb-1">Tier 1: Direct Referral</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Invite colleagues via your custom tracking code. Earn up to 7% instant commission on all verified portfolio activations.
          </p>
        </Card>

        <Card className="text-center p-6">
          <Users className="w-8 h-8 text-violet-600 dark:text-violet-400 mx-auto mb-3" />
          <h3 className="font-bold text-base mb-1">Tier 2: Network Growth</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Secondary network override of 3% credited automatically as your invited network grows.
          </p>
        </Card>

        <Card className="text-center p-6">
          <Award className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
          <h3 className="font-bold text-base mb-1">VIP Ambassador Status</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Specialized reporting tools, higher tier rewards, and priority withdrawal queue routing.
          </p>
        </Card>
      </div>

      <div className="text-center">
        <Button variant="primary" size="md" onClick={() => onNavigate('dashboard')}>
          View Your Referral Dashboard
        </Button>
      </div>
    </div>
  );
};
