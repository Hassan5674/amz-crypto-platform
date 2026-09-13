import React from 'react';
import { AlertTriangle, Wallet, X, ArrowUpRight, ShieldAlert, Coins } from 'lucide-react';
import { InsufficientFundsNotice } from '../context/CasinoContext.js';

interface InsufficientFundsNotificationProps {
  notice: InsufficientFundsNotice | null;
  onDismiss: () => void;
  onDepositClick: () => void;
}

export const InsufficientFundsNotification: React.FC<InsufficientFundsNotificationProps> = ({
  notice,
  onDismiss,
  onDepositClick
}) => {
  if (!notice || !notice.isOpen) return null;

  const shortfall = Math.max(0, notice.betAmount - notice.currentBalance);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full mb-4 animate-in fade-in slide-in-from-top-2 duration-200"
      id="insufficient-funds-notification"
    >
      <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border-2 border-rose-500/70 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-rose-950/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Icon and Header */}
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-rose-300">
                  {notice.title || 'Insufficient Funds'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Action Blocked
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium leading-relaxed max-w-xl">
                {notice.message ||
                  `Your available balance ($${notice.currentBalance.toFixed(2)}) is less than the required wager ($${notice.betAmount.toFixed(2)}). You cannot start a game session without sufficient funds.`}
              </p>
            </div>
          </div>

          {/* Right: Metrics & Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Stat comparison chip */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-right text-xs font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-sans">Required / Balance</div>
              <div className="font-bold flex items-center gap-1 text-slate-200 justify-end">
                <span className="text-rose-400">${notice.betAmount.toFixed(2)}</span>
                <span className="text-slate-500">/</span>
                <span className="text-emerald-400">${notice.currentBalance.toFixed(2)}</span>
              </div>
              {shortfall > 0 && (
                <div className="text-[10px] text-amber-400 font-semibold font-sans">
                  Short by ${shortfall.toFixed(2)}
                </div>
              )}
            </div>

            {/* Deposit CTA */}
            <button
              type="button"
              onClick={onDepositClick}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold tracking-wide shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all transform active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>Deposit Funds</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss Notification"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
