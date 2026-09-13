import React from 'react';
import { X, ShieldCheck, BookOpen, Lightbulb, History, HelpCircle } from 'lucide-react';
import { getGameDefinition } from '../adapters/GameRegistry.js';

interface GameInfoModalProps {
  gameSlug: string;
  onClose: () => void;
}

export const GameInfoModal: React.FC<GameInfoModalProps> = ({ gameSlug, onClose }) => {
  const game = getGameDefinition(gameSlug);

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-7 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-indigo-500/10 z-10 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{game.displayName}</h2>
              <span className="text-xs text-slate-400 font-medium">{game.category} • Version {game.version}.0</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed mb-5">{game.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase">House Edge</div>
            <div className="text-sm sm:text-base font-bold text-indigo-400 mt-0.5">{game.houseEdge}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Configured RTP</div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">{game.configuredRtp.toFixed(2)}%</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Min / Max Bet</div>
            <div className="text-sm sm:text-base font-bold text-slate-200 mt-0.5">${game.minBet} - ${game.maxBet}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Max Multiplier</div>
            <div className="text-sm sm:text-base font-bold text-amber-400 mt-0.5">{game.maxMultiplier}</div>
          </div>
        </div>

        {/* Rules */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Game Rules & Payout Structure
          </h3>
          <ul className="space-y-2 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
            {game.rules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Strategy Tips */}
        <div className="mb-6 bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-indigo-300 mb-1.5 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            Strategy & Odds Advice
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{game.strategy}</p>
        </div>

        {/* History */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Origin & Background
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{game.history}</p>
        </div>
      </div>
    </div>
  );
};

export default GameInfoModal;
