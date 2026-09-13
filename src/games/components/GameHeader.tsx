import React, { useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, HelpCircle, Wallet, PlusCircle } from 'lucide-react';
import { useCasino } from '../context/CasinoContext.js';
import { GameInfoModal } from './GameInfoModal.js';
import { AmzLogo } from '../../components/common/AmzLogo.js';

interface GameHeaderProps {
  gameSlug: string;
  gameTitle: string;
  category?: string;
  onBack: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameSlug,
  gameTitle,
  category,
  onBack
}) => {
  const { state, toggleSound } = useCasino();
  const [showInfo, setShowInfo] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleDepositClick = () => {
    window.dispatchEvent(new CustomEvent('navigate_dashboard_view', { detail: 'wallet' }));
  };

  return (
    <>
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sm:px-6 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 text-slate-200">
        {/* Left: Brand Logo + Back + Title */}
        <div className="flex items-center gap-3">
          <AmzLogo size="sm" variant="compact" invert />
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">{gameTitle}</h1>
            {category && (
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">{category}</span>
            )}
          </div>
        </div>

        {/* Center/Right: Live Balance and Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Authoritative Live Balance */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            state.balance <= 0
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              : 'bg-slate-950/80 border-slate-800 text-slate-200'
          }`}>
            <Wallet className={`w-3.5 h-3.5 ${state.balance <= 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
            <div className="text-left leading-none">
              <div className="text-[10px] text-slate-400">Balance</div>
              <div className={`text-xs sm:text-sm font-mono font-bold ${state.balance <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            {state.balance <= 0 && (
              <button
                onClick={handleDepositClick}
                className="ml-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                title="Deposit Funds to Play"
              >
                <PlusCircle className="w-3 h-3" />
                Deposit
              </button>
            )}
          </div>

          {/* Sound Controls with Popover */}
          <div className="relative">
            <button
              onClick={toggleSound}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowVolumeSlider(!showVolumeSlider);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                state.settings.soundEnabled
                  ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60'
                  : 'text-slate-500 bg-slate-800 border-slate-700'
              }`}
              title={state.settings.soundEnabled ? 'Mute Game Sound' : 'Unmute Sound'}
            >
              {state.settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Rules & Help Modal Trigger */}
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-700 transition-colors"
            title="Rules & Paytable"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showInfo && (
        <GameInfoModal gameSlug={gameSlug} onClose={() => setShowInfo(false)} />
      )}
    </>
  );
};

export default GameHeader;
