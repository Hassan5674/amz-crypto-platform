import React from 'react';
import { ActiveBet, RED_POCKET_NUMBERS } from '../../context/RouletteContext';

interface ProfessionalRouletteTableProps {
  phase: string;
  selectedBet: string;
  activeBets: ActiveBet[];
  chipValue: number;
  onBetClick: (selection: string) => void;
  onClearBets: () => void;
  winningNumber: number | null;
}

const DOZENS = [
  { id: '1st12', label: '1st 12 (3x)', numbers: Array.from({ length: 12 }, (_, i) => i + 1) },
  { id: '2nd12', label: '2nd 12 (3x)', numbers: Array.from({ length: 12 }, (_, i) => i + 13) },
  { id: '3rd12', label: '3rd 12 (3x)', numbers: Array.from({ length: 12 }, (_, i) => i + 25) }
];

const COLUMNS = [
  { id: 'col1', label: '2 to 1', numbers: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] },
  { id: 'col2', label: '2 to 1', numbers: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] },
  { id: 'col3', label: '2 to 1', numbers: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36] }
];

const OUTSIDE_BETS_GRID = [
  { id: '1to18', label: '1 to 18 (2x)' },
  { id: 'even', label: 'EVEN (2x)' },
  { id: 'red', label: '🔴 RED (2x)' },
  { id: 'black', label: '⚫ BLACK (2x)' },
  { id: 'odd', label: 'ODD (2x)' },
  { id: '19to36', label: '19 to 36 (2x)' }
];

export const ProfessionalRouletteTable: React.FC<ProfessionalRouletteTableProps> = ({
  phase,
  selectedBet,
  activeBets,
  chipValue,
  onBetClick,
  onClearBets,
  winningNumber
}) => {
  const isBettingDisabled = phase !== 'BETTING';

  // Helper to get total active stake on a specific selection
  const getStakeOnSelection = (sel: string): number => {
    return activeBets.filter(b => b.selection === sel).reduce((sum, b) => sum + b.stake, 0);
  };

  // Helper to render stacked 3D chip badge on a tile
  const renderChipStack = (sel: string) => {
    const stake = getStakeOnSelection(sel);
    if (stake <= 0) return null;

    let chipBg = 'bg-blue-600 text-white border-blue-300';
    if (stake >= 500) chipBg = 'bg-amber-500 text-slate-950 border-amber-200';
    else if (stake >= 100) chipBg = 'bg-slate-900 text-amber-300 border-amber-400';
    else if (stake >= 50) chipBg = 'bg-emerald-600 text-white border-emerald-300';
    else if (stake >= 20) chipBg = 'bg-rose-600 text-white border-rose-300';

    return (
      <div className="absolute top-1 right-1 z-20 pointer-events-none animate-bounce-subtle">
        <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black border shadow-lg ${chipBg} flex items-center gap-0.5`}>
          <span>$</span>
          <span>{stake}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Felt Green Master Table Container */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 rounded-2xl border-4 border-amber-600/40 shadow-[0_15px_40px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(255,255,255,0.1)] text-white select-none">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-amber-300">
              European Felt Grid (0 - 36)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-300/80">Straight Up Pays 35:1 (36x)</span>
        </div>

        {/* Main Grid: Zero + 1-36 Numbers Grid */}
        <div className="grid grid-cols-12 gap-1 relative">
          {/* Single Zero (Spanning top or left) */}
          <button
            type="button"
            onClick={() => onBetClick('0')}
            disabled={isBettingDisabled}
            className={`col-span-12 py-3 rounded-xl font-black text-xs border-2 transition-all relative shadow-md flex items-center justify-center gap-2 ${
              winningNumber === 0
                ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300 scale-105 z-30 shadow-2xl'
                : selectedBet === '0' || getStakeOnSelection('0') > 0
                ? 'bg-emerald-500 text-white border-amber-400 ring-2 ring-amber-300'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
            } ${isBettingDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
          >
            <span className="text-sm font-extrabold">0 - SINGLE ZERO</span>
            <span className="text-[10px] opacity-80">(35:1)</span>
            {renderChipStack('0')}
          </button>

          {/* Numbers 1 to 36 */}
          {Array.from({ length: 36 }, (_, i) => i + 1).map(num => {
            const numStr = num.toString();
            const isRed = RED_POCKET_NUMBERS.includes(num);
            const isWinning = winningNumber === num;
            const hasStake = getStakeOnSelection(numStr) > 0;
            const isSelected = selectedBet === numStr;

            return (
              <button
                key={num}
                type="button"
                onClick={() => onBetClick(numStr)}
                disabled={isBettingDisabled}
                className={`col-span-3 sm:col-span-2 md:col-span-1 py-3.5 rounded-lg font-black font-mono text-xs border-2 transition-all relative flex flex-col items-center justify-center ${
                  isWinning
                    ? 'bg-amber-300 text-slate-950 border-white ring-4 ring-amber-400 scale-110 z-30 shadow-2xl animate-pulse'
                    : isSelected || hasStake
                    ? 'ring-2 ring-amber-300 scale-105 z-10 ' + (isRed ? 'bg-rose-500 text-white border-amber-300' : 'bg-slate-900 text-white border-amber-300')
                    : isRed
                    ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-500/80 shadow'
                    : 'bg-slate-950 hover:bg-slate-900 text-white border-slate-700 shadow'
                } ${isBettingDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span>{num}</span>
                {renderChipStack(numStr)}
              </button>
            );
          })}
        </div>

        {/* Dozen Bets (1st 12, 2nd 12, 3rd 12) */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-800/80">
          {DOZENS.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => onBetClick(d.id)}
              disabled={isBettingDisabled}
              className={`py-2.5 rounded-xl font-black text-xs uppercase border-2 transition-all relative ${
                selectedBet === d.id || getStakeOnSelection(d.id) > 0
                  ? 'bg-amber-500 text-slate-950 border-white shadow-lg'
                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border-emerald-700'
              } ${isBettingDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {d.label}
              {renderChipStack(d.id)}
            </button>
          ))}
        </div>

        {/* Outside Bets Grid (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
          {OUTSIDE_BETS_GRID.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => onBetClick(b.id)}
              disabled={isBettingDisabled}
              className={`py-2.5 rounded-xl font-extrabold text-xs uppercase border-2 transition-all relative ${
                selectedBet === b.id || getStakeOnSelection(b.id) > 0
                  ? 'bg-amber-500 text-slate-950 border-white shadow-lg'
                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border-emerald-700'
              } ${isBettingDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {b.label}
              {renderChipStack(b.id)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
