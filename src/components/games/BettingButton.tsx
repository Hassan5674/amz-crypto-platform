import React from 'react';
import { Button } from '../ui/Button';
import { Loader2, Sparkles, Coins } from 'lucide-react';
import { useCasino } from '../../games/context/CasinoContext';

export interface BettingButtonProps {
  isBetting?: boolean;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  label: string;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  balance?: number;
  betAmount?: number;
  showDepositWarning?: boolean;
}

export const BettingButton: React.FC<BettingButtonProps> = ({
  isBetting = false,
  onClick,
  label,
  loadingText = 'Processing...',
  className = '',
  disabled = false,
  balance,
  betAmount,
}) => {
  const { openDepositModal } = useCasino();
  const isInsufficient = balance !== undefined && betAmount !== undefined && betAmount > balance;

  return (
    <div className="w-full flex flex-col gap-1.5">
      <Button
        variant="primary"
        size="lg"
        className={`w-full font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2 ${
          isBetting
            ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            : disabled && !isInsufficient
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : isInsufficient
            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40 border border-amber-500/50 cursor-pointer'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 cursor-pointer'
        } ${className}`}
        onClick={(e) => {
          if (isBetting) return;
          if (isInsufficient) {
            e.stopPropagation();
            openDepositModal();
            return;
          }
          if (!disabled) {
            onClick(e);
          }
        }}
        disabled={isBetting || (disabled && !isInsufficient)}
      >
        {isBetting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-200 shrink-0" />
            <span className="truncate">{loadingText}</span>
          </span>
        ) : isInsufficient ? (
          <span className="flex items-center justify-center gap-2 truncate">
            <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="truncate">Deposit to Play</span>
          </span>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </Button>

      {isInsufficient && (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Available: <strong className="text-amber-400">${(balance || 0).toFixed(2)}</strong></span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDepositModal();
            }}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 cursor-pointer transition-colors flex items-center gap-1"
          >
            Deposit Funds
          </button>
        </div>
      )}
    </div>
  );
};


