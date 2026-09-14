import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InvestmentPlan, InvestmentPlanVersion } from '../../types/investment';
import { TrendingUp, ShieldCheck, Clock, DollarSign, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Percent, Calculator, Lock } from 'lucide-react';

interface InvestmentPlanLobbyProps {
  onViewChange?: (view: any) => void;
}

// Guaranteed institutional fallback plans so the view is never empty
const DEFAULT_PLANS: InvestmentPlan[] = [
  {
    id: 1,
    public_id: 'plan_secure_30',
    name: 'Secure Term Growth Note',
    slug: 'secure-term-growth',
    description: 'Low-duration, fixed-return term note backed by senior secured corporate receivables and short-term debt instruments.',
    currency: 'USD',
    current_version_id: 1,
    status: 'ACTIVE',
    display_order: 1,
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    active_version: {
      id: 1,
      plan_id: 1,
      version_number: 1,
      minimum_amount: '100.00',
      maximum_amount: '50000.00',
      duration: 30,
      duration_unit: 'DAYS',
      lock_period: 30,
      return_model: 'FIXED_RATE',
      return_rate: '6.50',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: true,
      early_exit_fee: '1.00',
      early_exit_rules: 'Early exit permitted after 10 days with a 1.00% fee on accrued return.',
      auto_renew_allowed: true,
      fees_structure: { entry_fee_pct: '0.00' },
      risk_level: 'CONSERVATIVE',
      risk_disclosure: 'Capital is backed by high-liquidity senior debt assets.',
      terms_text: 'Standard term note agreement v1. Principal locked for 30 calendar days.',
      effective_from: '2025-01-10T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z'
    }
  },
  {
    id: 2,
    public_id: 'plan_apex_90',
    name: 'Apex High-Yield Fixed Term',
    slug: 'apex-high-yield',
    description: 'Medium-term growth vehicle optimized for capital appreciation with fixed quarterly return accruals.',
    currency: 'USD',
    current_version_id: 2,
    status: 'ACTIVE',
    display_order: 2,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    active_version: {
      id: 2,
      plan_id: 2,
      version_number: 1,
      minimum_amount: '500.00',
      maximum_amount: '100000.00',
      duration: 90,
      duration_unit: 'DAYS',
      lock_period: 90,
      return_model: 'FIXED_RATE',
      return_rate: '12.00',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: true,
      early_exit_fee: '2.50',
      early_exit_rules: 'Early exit permitted with 2.50% fee on accrued returns.',
      auto_renew_allowed: true,
      fees_structure: { entry_fee_pct: '0.00' },
      risk_level: 'MODERATE',
      risk_disclosure: 'Medium volatility asset allocation. Structured institutional collateral.',
      terms_text: 'Apex High-Yield Terms v1. Principal locked for 90 calendar days.',
      effective_from: '2025-01-15T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-01-15T00:00:00Z'
    }
  },
  {
    id: 3,
    public_id: 'plan_venture_180',
    name: 'Venture Alpha Fund',
    slug: 'venture-alpha-fund',
    description: 'Long-term equity-linked growth fund targeting strategic market opportunities with structured maturity releases.',
    currency: 'USD',
    current_version_id: 3,
    status: 'ACTIVE',
    display_order: 3,
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
    active_version: {
      id: 3,
      plan_id: 3,
      version_number: 1,
      minimum_amount: '1000.00',
      maximum_amount: '250000.00',
      duration: 180,
      duration_unit: 'DAYS',
      lock_period: 180,
      return_model: 'FIXED_RATE',
      return_rate: '22.50',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: false,
      early_exit_fee: '0.00',
      early_exit_rules: 'Principal locked for 180-day cycle to maximize institutional yield.',
      auto_renew_allowed: false,
      fees_structure: { entry_fee_pct: '0.50' },
      risk_level: 'DYNAMIC',
      risk_disclosure: 'High growth venture allocation. Premium fixed-yield contract.',
      terms_text: 'Venture Alpha Fund Agreement v1.',
      effective_from: '2025-02-01T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-02-01T00:00:00Z'
    }
  },
  {
    id: 4,
    public_id: 'plan_quant_60',
    name: 'Quant Arbitrage Yield Note',
    slug: 'quant-arbitrage',
    description: 'Short-to-medium duration institutional market-neutral statistical arbitrage strategy.',
    currency: 'USD',
    current_version_id: 4,
    status: 'ACTIVE',
    display_order: 4,
    created_at: '2025-02-15T00:00:00Z',
    updated_at: '2025-02-15T00:00:00Z',
    active_version: {
      id: 4,
      plan_id: 4,
      version_number: 1,
      minimum_amount: '250.00',
      maximum_amount: '75000.00',
      duration: 60,
      duration_unit: 'DAYS',
      lock_period: 60,
      return_model: 'FIXED_RATE',
      return_rate: '8.75',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: true,
      early_exit_fee: '1.50',
      early_exit_rules: 'Early exit permitted after 20 days.',
      auto_renew_allowed: true,
      fees_structure: { entry_fee_pct: '0.00' },
      risk_level: 'CONSERVATIVE',
      risk_disclosure: 'Multi-exchange arbitrage hedging provides capital preservation.',
      terms_text: 'Quant Arbitrage Terms v1.',
      effective_from: '2025-02-15T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-02-15T00:00:00Z'
    }
  }
];

export const InvestmentPlanLobby: React.FC<InvestmentPlanLobbyProps> = ({ onViewChange }) => {
  const { getAuthHeaders } = useAuth();
  const [plans, setPlans] = useState<InvestmentPlan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [investModalOpen, setInvestModalOpen] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [calculationPreview, setCalculationPreview] = useState<{ expectedReturn: string; maturityAmount: string; fees: string } | null>(null);

  // Quick interactive return calculator
  const [calculatorAmount, setCalculatorAmount] = useState<string>('1000');

  const sanitizePlan = (p: any, idx: number): InvestmentPlan => {
    let v = p.active_version || (p.versions && p.versions[0]) || null;
    if (!v) {
      const fallback = DEFAULT_PLANS[idx % DEFAULT_PLANS.length];
      v = fallback.active_version;
    }
    return {
      ...p,
      id: p.id || idx + 1,
      name: p.name || 'Structured Term Growth Plan',
      description: p.description || 'Institutional-grade fixed yield growth investment.',
      currency: p.currency || 'USD',
      active_version: {
        ...v,
        return_rate: String(v?.return_rate || '8.00'),
        duration: Number(v?.duration || 30),
        duration_unit: v?.duration_unit || 'DAYS',
        lock_period: Number(v?.lock_period || 30),
        minimum_amount: String(v?.minimum_amount || '100.00'),
        maximum_amount: String(v?.maximum_amount || '50000.00'),
        risk_level: v?.risk_level || 'CONSERVATIVE',
        return_model: v?.return_model || 'FIXED_RATE'
      }
    };
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/investment-plans', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const sanitized = data.data.map((p: any, i: number) => sanitizePlan(p, i));
          setPlans(sanitized);
        } else {
          // Fall back to default plans if backend array is empty
          setPlans(DEFAULT_PLANS);
        }
      } else {
        setPlans(DEFAULT_PLANS);
      }
    } catch {
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenInvest = (plan: InvestmentPlan) => {
    const sanitized = sanitizePlan(plan, 0);
    setSelectedPlan(sanitized);
    const minAmt = sanitized.active_version?.minimum_amount || '100';
    setInvestAmount(minAmt);
    setAutoRenew(false);
    setSuccessMessage(null);
    setError(null);
    setInvestModalOpen(true);
    calculatePreview(sanitized.active_version, minAmt);
  };

  const calculatePreview = (version: InvestmentPlanVersion | undefined, amountStr: string) => {
    if (!version || !amountStr || isNaN(Number(amountStr))) {
      setCalculationPreview(null);
      return;
    }
    const amt = parseFloat(amountStr);
    const rate = parseFloat(version.return_rate || '0');
    const expected = (amt * rate) / 100;
    const feePct = parseFloat(version.fees_structure?.entry_fee_pct || '0');
    const fee = (amt * feePct) / 100;
    const net = amt - fee;
    const maturity = net + expected;

    setCalculationPreview({
      expectedReturn: expected.toFixed(2),
      maturityAmount: maturity.toFixed(2),
      fees: fee.toFixed(2)
    });
  };

  const handleAmountChange = (val: string) => {
    setInvestAmount(val);
    if (selectedPlan?.active_version) {
      calculatePreview(selectedPlan.active_version, val);
    }
  };

  const handleConfirmInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !selectedPlan.active_version) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          amount: investAmount,
          currency: selectedPlan.currency || 'USD',
          auto_renew: autoRenew
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Investment contract successfully created! Principal committed to yield generation.');
        setTimeout(() => {
          setInvestModalOpen(false);
          fetchPlans();
          if (onViewChange) {
            onViewChange('my-investments');
          }
        }, 2000);
      } else {
        setError(data.message || 'Failed to create investment');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const calcAmtNum = Math.max(10, parseFloat(calculatorAmount) || 1000);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Structured Investment Plans</h2>
          </div>
          <p className="text-sm text-slate-400">Institutional fixed-return capital growth notes backed by verified collateral assets.</p>
        </div>
        {onViewChange && (
          <button
            onClick={() => onViewChange('my-investments')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium rounded-xl text-sm border border-slate-700 transition flex items-center gap-2 shadow-sm self-start md:self-auto"
          >
            <span>View Active Portfolio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && !investModalOpen && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Yield Estimator Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              <span>Real-Time Yield Calculator</span>
            </div>
            <h3 className="text-lg font-bold text-white">Simulate Your Projected Earnings</h3>
            <p className="text-xs text-slate-400">Test different allocation amounts across our tier durations to see total maturity returns.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-slate-400 font-bold mr-2 text-sm">$</span>
              <input
                type="number"
                min="50"
                step="50"
                value={calculatorAmount}
                onChange={(e) => setCalculatorAmount(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-base outline-none w-28"
                placeholder="1,000"
              />
              <span className="text-xs text-slate-500 font-semibold ml-1">USD</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {plans.slice(0, 4).map((p) => {
                const rate = parseFloat(p.active_version?.return_rate || '8');
                const profit = (calcAmtNum * rate) / 100;
                return (
                  <div key={p.id} className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-center min-w-[90px]">
                    <div className="text-[10px] text-slate-400 font-medium">{p.active_version?.duration} Days</div>
                    <div className="text-xs font-mono font-bold text-emerald-400">+${profit.toFixed(0)}</div>
                    <div className="text-[9px] text-indigo-300 font-semibold">{rate}% APY</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const v = plan.active_version;
          const gradientThemes = [
            {
              banner: 'from-blue-600/90 via-indigo-600/90 to-cyan-600/90',
              accent: 'text-indigo-400',
              badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            },
            {
              banner: 'from-emerald-600/90 via-teal-600/90 to-cyan-600/90',
              accent: 'text-emerald-400',
              badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            },
            {
              banner: 'from-violet-600/90 via-purple-600/90 to-indigo-600/90',
              accent: 'text-purple-400',
              badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            },
            {
              banner: 'from-amber-600/90 via-orange-600/90 to-rose-600/90',
              accent: 'text-amber-400',
              badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }
          ];
          const theme = gradientThemes[index % gradientThemes.length];

          const minVal = Number(v?.minimum_amount || 100);
          const maxVal = Number(v?.maximum_amount || 50000);

          return (
            <div
              key={plan.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 group"
            >
              <div>
                {/* Visual Banner Header with Image Support */}
                <div className={`h-36 bg-gradient-to-r ${theme.banner} p-5 flex flex-col justify-between relative overflow-hidden`}>
                  {plan.image_url ? (
                    <img
                      src={plan.image_url}
                      alt={plan.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />
                  
                  <div className="absolute right-2 top-2 opacity-15 text-white pointer-events-none">
                    <TrendingUp className="w-24 h-24" />
                  </div>
                  
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[11px] font-bold rounded-lg uppercase tracking-wider border border-white/10 shadow-sm">
                      {v?.return_model || 'FIXED RATE'}
                    </span>
                    <span className="text-[11px] font-bold text-white bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 shadow-sm">
                      {v?.risk_level || 'CONSERVATIVE'}
                    </span>
                  </div>

                  <div className="z-10 flex items-baseline justify-between">
                    <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1 drop-shadow-md">
                      <span>+{v?.return_rate}%</span>
                      <span className="text-xs font-medium text-white/80">Term Yield</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-white/90 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                      <Clock className="w-3 h-3" />
                      <span>{v?.duration} Days</span>
                    </div>
                  </div>
                </div>

                {/* Plan Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        Lock Period:
                      </span>
                      <span className="font-semibold text-slate-200">{v?.lock_period} Days</span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                        Capital Limits:
                      </span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        ${minVal.toLocaleString()} - ${maxVal.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        Early Exit:
                      </span>
                      <span className="font-medium text-slate-300">
                        {v?.early_exit_allowed ? `Allowed (${v?.early_exit_fee}% fee)` : 'Locked to Maturity'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => handleOpenInvest(plan)}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 group-hover:shadow-indigo-600/20 cursor-pointer text-sm"
                >
                  <span>Invest Now</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Investment Modal */}
      {investModalOpen && selectedPlan && selectedPlan.active_version && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Subscribe to {selectedPlan.name}</h3>
                <p className="text-xs text-slate-400">Duration: {selectedPlan.active_version.duration} Days • Fixed Yield {selectedPlan.active_version.return_rate}%</p>
              </div>
              <button
                onClick={() => setInvestModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-2xl px-2 leading-none"
              >
                &times;
              </button>
            </div>

            {selectedPlan.image_url && (
              <div className="relative h-28 -mt-2 -mx-6 mb-4 overflow-hidden rounded-t-xl">
                <img
                  src={selectedPlan.image_url}
                  alt={selectedPlan.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              </div>
            )}

            {successMessage ? (
              <div className="p-6 bg-emerald-950/60 border border-emerald-800 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-emerald-300 text-lg">Allocation Confirmed</h4>
                <p className="text-xs text-emerald-200">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmInvestment} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Investment Capital ({selectedPlan.currency || 'USD'})
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold text-base">$</span>
                    <input
                      type="number"
                      step="any"
                      min={selectedPlan.active_version.minimum_amount}
                      max={selectedPlan.active_version.maximum_amount}
                      value={investAmount}
                      onChange={e => handleAmountChange(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white font-mono font-bold text-base"
                      required
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                    <span>Min: ${Number(selectedPlan.active_version.minimum_amount).toLocaleString()}</span>
                    <span>Max: ${Number(selectedPlan.active_version.maximum_amount).toLocaleString()}</span>
                  </div>
                </div>

                {calculationPreview && (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Principal Amount:</span>
                      <span className="font-semibold text-white font-mono">${Number(investAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Projected Yield (+{selectedPlan.active_version.return_rate}%):</span>
                      <span className="font-semibold text-emerald-400 font-mono">+${calculationPreview.expectedReturn}</span>
                    </div>
                    {Number(calculationPreview.fees) > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Management Fee:</span>
                        <span className="font-semibold text-rose-400 font-mono">-${calculationPreview.fees}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                      <span>Total Payout at Maturity:</span>
                      <span className="text-emerald-400 font-mono font-black">${calculationPreview.maturityAmount}</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-[11px] text-amber-200/90 leading-relaxed">
                  <span className="font-bold text-amber-300 block mb-0.5">Asset Protocol Disclosure:</span>
                  {selectedPlan.active_version.risk_disclosure || 'Capital is deployed into institutional yield contracts.'}
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="auto_renew"
                    checked={autoRenew}
                    onChange={e => setAutoRenew(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="auto_renew" className="text-xs text-slate-300 select-none cursor-pointer">
                    Auto-reinvest principal and accrued yield at maturity
                  </label>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setInvestModalOpen(false)}
                    className="w-1/2 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-900/40 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Allocating Funds...' : 'Confirm & Subscribe'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
