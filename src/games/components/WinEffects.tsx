import React, { useEffect, useState } from 'react';
import { Sparkles, Trophy, Star, PartyPopper } from 'lucide-react';
import { WinCelebration } from '../types.js';

interface WinEffectsProps {
  win: WinCelebration | null;
  onComplete?: () => void;
  enabled?: boolean;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1200 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startVal = 0;
    const endVal = value;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startVal + (endVal - startVal) * easeProgress);

      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        setDisplayValue(endVal);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value, duration]);

  return <span>${displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
};

export const WinEffects: React.FC<WinEffectsProps> = ({ win, onComplete, enabled = true }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!win || !enabled) return;

    setStage(1);
    const t1 = setTimeout(() => setStage(2), 500);
    const duration = win.multiplier >= 10 || win.profit >= 500 ? 3200 : 2000;
    const t2 = setTimeout(() => {
      setStage(3);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [win, enabled, onComplete]);

  if (!win || !enabled || stage === 0 || stage === 3) return null;

  const isJackpot = win.multiplier >= 10 || win.profit >= 500;
  const isBigWin = win.multiplier >= 5 || win.profit >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300" />

      {/* Floating Sparkles & Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: isJackpot ? 32 : 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${(i * 13) % 95}%`,
              top: `${(i * 17) % 85}%`,
              animationDuration: `${1 + (i % 3) * 0.5}s`,
              animationDelay: `${(i * 0.1)}s`
            }}
          >
            <Sparkles className={`w-6 h-6 ${i % 2 === 0 ? 'text-amber-400' : 'text-cyan-400'} opacity-70`} />
          </div>
        ))}
      </div>

      {/* Main Celebration Card */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 transform transition-all duration-500 scale-100">
        <div className="mb-4">
          {isJackpot ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          ) : isBigWin ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-pulse">
              <PartyPopper className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Star className="w-8 h-8 fill-emerald-400/30 text-emerald-400" />
            </div>
          )}
        </div>

        <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">
          {win.game}
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-tight mb-2">
          {isJackpot ? 'MEGA JACKPOT!' : isBigWin ? 'BIG WIN!' : 'NICE WIN!'}
        </h3>

        <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono my-2">
          +<AnimatedCounter value={win.profit} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-300 mt-2 font-mono">
          <span>Multiplier:</span>
          <span className="text-cyan-400">{win.multiplier.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
};

export default WinEffects;
