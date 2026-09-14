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

        {/* Center/Right: Sound and Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

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
