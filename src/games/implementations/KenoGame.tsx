import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

// More generous payout table
const PAYOUT_TABLE = {
  1: [0, 3.8],
  2: [0, 1.5, 9],
  3: [0, 1, 2.5, 26],
  4: [0, 0.5, 1.5, 6, 50],
  5: [0, 0.3, 1, 3, 15, 100],
  6: [0, 0, 0.5, 2, 6, 40, 250],
  7: [0, 0, 0.3, 1.5, 4, 15, 80, 500],
  8: [0, 0, 0, 1, 2, 8, 30, 150, 1000],
  9: [0, 0, 0, 0.5, 1.5, 5, 15, 60, 300, 2000],
  10: [0, 0, 0, 0, 1, 3, 10, 30, 100, 500, 5000]
};

const RISK_MODES = {
  classic: { name: 'Classic', color: 'cyan', multipliers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  low: { name: 'Low Risk', color: 'green', multipliers: [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4] },
  medium: { name: 'Medium', color: 'yellow', multipliers: [0.3, 0.4, 0.5, 0.7, 1, 1.5, 2, 2.5, 3, 4] },
  high: { name: 'High Risk', color: 'red', multipliers: [0.1, 0.2, 0.3, 0.5, 0.8, 1.5, 3, 5, 8, 12] }
};

export default function KenoGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [selected, setSelected] = useState(new Set());
  const [drawn, setDrawn] = useState(new Set());
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [risk, setRisk] = useState('classic');
  const [autoSelect, setAutoSelect] = useState(5);

  // Admin cheats
  const kenoCheats = state.adminSettings?.gameSettings?.keno || {};
  const godMode = state.adminSettings?.godMode;

  const toggleNumber = (n) => {
    if (playing) return;
    const newSet = new Set(selected);
    if (newSet.has(n)) {
      newSet.delete(n);
    } else if (newSet.size < 10) {
      newSet.add(n);
    }
    setSelected(newSet);
  };

  const selectRandom = () => {
    if (playing) return;
    const nums = new Set();
    while (nums.size < autoSelect) {
      nums.add(Math.floor(Math.random() * 40) + 1);
    }
    setSelected(nums);
  };

  const clearSelection = () => {
    if (playing) return;
    setSelected(new Set());
    setResult(null);
    setDrawn(new Set());
  };

  const getMultiplier = (picks, hits) => {
    const baseMult = PAYOUT_TABLE[picks]?.[hits] || 0;
    return baseMult * RISK_MODES[risk].multipliers[hits] || 0;
  };

  const play = useCallback(async () => {
    if (playing || bet <= 0 || bet > state.balance || selected.size === 0) return;

    const confirmed = await placeBet(bet, 'keno');
    if (!confirmed) return;

    setPlaying(true);
    setDrawn(new Set());
    setResult(null);
    audio.playBet();

    // Draw 10 numbers - with cheat support
    const drawnNums = new Set();
    const extraMatches = kenoCheats.extraMatches || 0;

    // Admin cheat: first add selected numbers to increase hits
    if ((extraMatches > 0 || godMode) && selected.size > 0) {
      const selectedArr = Array.from(selected);
      const matchCount = godMode ? selected.size : Math.min(extraMatches, selected.size);
      for (let i = 0; i < matchCount && drawnNums.size < 10; i++) {
        drawnNums.add(selectedArr[i]);
      }
    }

    // Fill rest with random numbers
    while (drawnNums.size < 10) {
      drawnNums.add(Math.floor(Math.random() * 40) + 1);
    }

    // Animate drawing
    const drawnArr = Array.from(drawnNums);
    let idx = 0;
    const drawNext = () => {
      if (idx < drawnArr.length) {
        setDrawn(new Set(drawnArr.slice(0, idx + 1)));
        idx++;
        setTimeout(drawNext, state.settings.fastMode ? 80 : 150);
      } else {
        // Calculate result
        const hits = Array.from(selected).filter(n => drawnNums.has(n)).length;
        const picks = selected.size;
        const mult = getMultiplier(picks, hits);
        const winAmount = bet * mult;

        setPlaying(false);
        setResult({ hits, picks, mult, profit: winAmount - bet });
        setHistory(h => [{ hits, picks, won: mult > 0 }, ...h.slice(0, 4)]);

        if (mult > 0) {
          addWin(winAmount, bet, 'keno', mult);
          audio.playWin();
        } else {
          addWin(0, bet, 'keno', 0);
          audio.playLose();
        }
      }
    };
    drawNext();
  }, [playing, bet, state.balance, selected, state.settings.fastMode, placeBet, addWin, risk]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0f0a] rounded-2xl p-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm">
            <span className="text-gray-500">Selected: </span>
            <span className="text-cyan-400 font-black text-lg">{selected.size}/10</span>
          </div>
          {drawn.size > 0 && (
            <div className="text-sm">
              <span className="text-gray-500">Hits: </span>
              <span className="text-green-400 font-black text-lg">
                {Array.from(selected).filter(n => drawn.has(n)).length}/{selected.size}
              </span>
            </div>
          )}
        </div>

        {/* Grid */}
        {!playing && selected.size === 0 && drawn.size === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
            <div className="grid grid-cols-8 gap-1.5 w-full">
              {Array.from({ length: 40 }, (_, i) => i + 1).map(n => (
                <div
                  key={n}
                  className="aspect-square rounded-lg bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 font-bold"
                >
                  ?
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Select 1-10 numbers and place bet</div>
              <div className="text-xs text-gray-500">Match drawn numbers to win prizes</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1.5 flex-1 max-h-[360px]">
            {Array.from({ length: 40 }, (_, i) => i + 1).map(n => {
              const isSelected = selected.has(n);
              const isDrawn = drawn.has(n);
              const isHit = isSelected && isDrawn;
              const isMiss = isSelected && drawn.size === 10 && !isDrawn;

              return (
                <button
                  key={n}
                  onClick={() => toggleNumber(n)}
                  disabled={playing}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
                    isHit
                      ? 'bg-gradient-to-br from-green-400 to-green-600 text-white ring-2 ring-green-300 scale-110 shadow-lg shadow-green-500/50'
                      : isMiss
                        ? 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-400 ring-2 ring-red-500/50'
                        : isDrawn
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black'
                          : isSelected
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white ring-2 ring-cyan-300'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  } ${playing && !isDrawn && !isSelected ? 'opacity-50' : ''}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mt-3 text-center py-4 rounded-xl border-2 font-black transition-all ${
            result.mult > 0
              ? 'bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-500/60 shadow-lg shadow-green-500/20'
              : 'bg-gradient-to-r from-red-900/80 to-rose-900/80 border-red-500/60 shadow-lg shadow-red-500/20'
          }`}>
            <div className={`text-2xl font-black ${result.mult > 0 ? 'text-green-300' : 'text-red-300'}`}>
              {result.hits}/{result.picks} HITS
            </div>
            {result.mult > 0 ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg text-green-400">
                  {result.mult.toFixed(2)}x Multiplier
                </div>
                <div className="text-2xl font-black text-green-300">
                  +${result.profit.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="text-lg text-red-400 mt-2">NO WIN</div>
            )}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 border border-orange-500/20 shadow-lg shadow-orange-500/10 flex flex-col gap-3">
          {/* Risk Mode */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Risk Mode</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(RISK_MODES).map(([key, mode]) => (
                <button
                  key={key}
                  onClick={() => setRisk(key)}
                  disabled={playing}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    risk === key
                      ? `bg-${mode.color}-600 text-white scale-105`
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  style={risk === key ? {
                    backgroundColor: mode.color === 'cyan' ? '#0891b2' :
                                    mode.color === 'green' ? '#16a34a' :
                                    mode.color === 'yellow' ? '#ca8a04' : '#dc2626'
                  } : {}}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Pick */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Auto Select: {autoSelect}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={autoSelect}
              onChange={(e) => setAutoSelect(Number(e.target.value))}
              disabled={playing}
              className="w-full mt-2 accent-cyan-500"
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={selectRandom} disabled={playing}
                className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold rounded-lg">
                RANDOM
              </button>
              <button onClick={clearSelection} disabled={playing}
                className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold rounded-lg">
                ✕ CLEAR
              </button>
            </div>
          </div>

          {/* Bet */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Bet Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={playing}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-xs font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-xs font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-xs font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-xs font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Paytable */}
          {selected.size > 0 && (
            <div className="bg-black/40 rounded-xl p-3 max-h-28 overflow-y-auto">
              <div className="text-xs text-gray-500 uppercase mb-2">Payouts ({selected.size} picks)</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Array.from({ length: selected.size + 1 }, (_, i) => {
                  const mult = getMultiplier(selected.size, i);
                  if (mult <= 0) return null;
                  return (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">{i} hits:</span>
                      <span className="text-green-400 font-bold">{mult.toFixed(2)}x</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Play Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={playing}
              balance={state.balance}
              betAmount={bet}
              disabled={selected.size === 0}
              onClick={play}
              label={selected.size === 0 ? 'SELECT NUMBERS' : 'PLAY KENO'}
              loadingText="DRAWING..."
              className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30"
            />
          </div>

          {/* History */}
          {history.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold mb-2">Recent Plays</div>
              <div className="flex gap-2 flex-wrap">
                {history.slice(0, 4).map((h, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    h.won
                      ? 'bg-green-900/40 text-green-300 border-green-500/50'
                      : 'bg-red-900/40 text-red-300 border-red-500/50'
                  }`}>
                    {h.won ? '✓' : '✗'} {h.hits}/{h.picks}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
