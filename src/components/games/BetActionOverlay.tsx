import React, { useEffect } from 'react';
import { Loader2, AlertTriangle, Wallet, X, CheckCircle2 } from 'lucide-react';

export interface BetActionOverlayProps {
  isLoading?: boolean;
  loadingText?: string;
  error?: string | null;
  onClearError?: () => void;
  onDepositClick?: () => void;
  successMessage?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export const BetActionOverlay: React.FC<BetActionOverlayProps> = ({
  isLoading = false,
  loadingText = 'Processing Bet...',
  error = null,
  onClearError,
  onDepositClick,
  successMessage = null,
  className = '',
  children
}) => {
  const isInsufficientFunds = error ? error.toLowerCase().includes('insufficient') || error.toLowerCase().includes('deposit') : false;

  // Auto-dismiss standard errors after 7 seconds if not insufficient funds
  useEffect(() => {
    if (error && !isInsufficientFunds && onClearError) {
      const timer = setTimeout(() => {
        onClearError();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [error, isInsufficientFunds, onClearError]);

  return (
    <div className={`relative ${className}`}>
      {children}

      {/* Loading Processing Spinner Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn transition-all">
          <div className="relative flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
            {/* Inner icon */}
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin absolute" />
          </div>

          <p className="mt-4 text-sm font-semibold text-white tracking-wide uppercase font-mono">
            {loadingText}
          </p>
          <span className="mt-1 text-xs text-slate-400 font-sans">
            Verifying authoritative server ledger & outcome
          </span>
        </div>
      )}

      {/* Notification Toast / Error Overlay */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 rounded-xl bg-slate-900 border-2 border-rose-500/80 text-white shadow-2xl flex flex-col gap-3 animate-slideUp">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  {isInsufficientFunds ? 'Insufficient Balance' : 'Betting Error'}
                </h4>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-medium">
                  {error}
                </p>
              </div>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Deposit Shortcut CTA if insufficient funds */}
          {isInsufficientFunds && onDepositClick && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={onDepositClick}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5" />
                Deposit Funds Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success Notification Toast */}
      {successMessage && !error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 rounded-xl bg-slate-900 border border-emerald-500/80 text-white shadow-2xl flex items-center justify-between gap-3 animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-emerald-200">
              {successMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
