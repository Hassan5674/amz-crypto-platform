import React, { useEffect } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import { audio } from '../utils/audioEngine.js';
import { AlertTriangle, DollarSign } from 'lucide-react';

interface BetControlsProps {
  bet: number;
  setBet: (value: number) => void;
  disabled?: boolean;
  showMultiplier?: boolean;
  multiplier?: number;
  winAmount?: number;
  minBet?: number;
  maxBet?: number;
  children?: React.ReactNode;
}

export const BetControls: React.FC<BetControlsProps> = ({
  bet,
  setBet,
  disabled = false,
  showMultiplier = false,
  multiplier = 1,
  winAmount = 0,
  minBet = 1,
  maxBet = 5000,
  children
}) => {
  const { state, setGlobalBet } = useCasino();

  useEffect(() => {
    if (state.globalBet && !disabled) {
      setBet(Math.min(state.globalBet, state.balance));
    }
  }, [state.globalBet, disabled, setBet, state.balance]);

  const handleBetChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clamped = Math.min(Math.max(0, numValue), state.balance);
    setBet(clamped);
    setGlobalBet(clamped);
    audio.playClick();
  };

  const handleMultiply = (factor: number) => {
    const newBet = Math.min(bet * factor, state.balance);
    const finalBet = Math.max(minBet, Number(newBet.toFixed(2)));
    setBet(finalBet);
    setGlobalBet(finalBet);
    audio.playClick();
  };

  const handleMin = () => {
    const finalBet = Math.min(minBet, state.balance);
    setBet(finalBet);
    setGlobalBet(finalBet);
    audio.playClick();
  };

  const handleMax = () => {
    const finalBet = Math.min(maxBet, state.balance);
    setBet(finalBet);
    setGlobalBet(finalBet);
    audio.playClick();
  };

  const handleAuto5Percent = () => {
    const autoBet = Math.max(minBet, Math.floor(state.balance * 0.05));
    const finalBet = Math.min(autoBet, state.balance);
    setBet(finalBet);
    setGlobalBet(finalBet);
    audio.playClick();
  };

  const isLargeBet = state.balance > 0 && bet > state.balance * 0.5;

  return (
    <div className="bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Bet Amount Input & Balance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <span className="text-slate-400 uppercase tracking-wider">Bet Amount</span>
          <span className="text-indigo-400 dark:text-indigo-300 font-mono font-semibold">
            ${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} available
          </span>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
            <DollarSign className="w-4 h-4" />
          </span>
          <input
            type="number"
            value={bet === 0 ? '' : bet}
            onChange={(e) => handleBetChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-9 pr-4 py-2.5 text-right text-lg sm:text-xl font-bold font-mono text-white placeholder-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            min={minBet}
            max={Math.min(maxBet, state.balance)}
            step="0.01"
            placeholder="0.00"
            disabled={disabled}
          />
        </div>

        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
          <button
            type="button"
            onClick={handleMin}
            disabled={disabled || state.balance <= 0}
            className="py-1.5 sm:py-2 px-1 text-center text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-lg border border-slate-700 transition-all active:scale-95"
          >
            MIN
          </button>
          <button
            type="button"
            onClick={() => handleMultiply(0.5)}
            disabled={disabled || state.balance <= 0}
            className="py-1.5 sm:py-2 px-1 text-center text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-lg border border-slate-700 transition-all active:scale-95"
          >
            1/2
          </button>
          <button
            type="button"
            onClick={handleAuto5Percent}
            disabled={disabled || state.balance <= 0}
            className="py-1.5 sm:py-2 px-1 text-center text-xs font-semibold text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/60 disabled:opacity-40 rounded-lg border border-indigo-800/80 transition-all active:scale-95"
            title="5% of current balance"
          >
            5%
          </button>
          <button
            type="button"
            onClick={() => handleMultiply(2)}
            disabled={disabled || state.balance <= 0 || bet * 2 > state.balance}
            className="py-1.5 sm:py-2 px-1 text-center text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-lg border border-slate-700 transition-all active:scale-95"
          >
            2x
          </button>
          <button
            type="button"
            onClick={handleMax}
            disabled={disabled || state.balance <= 0}
            className="py-1.5 sm:py-2 px-1 text-center text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 disabled:opacity-40 rounded-lg border border-amber-800/80 transition-all active:scale-95"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Game Specific Options */}
      {children}

      {/* Multiplier & Potential Win Display */}
      {showMultiplier && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Multiplier</div>
            <div className="text-lg sm:text-xl font-extrabold text-cyan-400 font-mono">{multiplier.toFixed(2)}x</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Potential Payout</div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono">${winAmount.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Large Bet Warning Indicator */}
      {isLargeBet && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg py-2 px-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>Large wager ({((bet / state.balance) * 100).toFixed(0)}% of total balance)</span>
        </div>
      )}
    </div>
  );
};

export default BetControls;
