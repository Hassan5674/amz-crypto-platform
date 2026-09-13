import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

export default function DiceGame() {
  const { state, play, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState('under'); // under, over, exact, range
  const [rangeMin, setRangeMin] = useState(25);
  const [rangeMax, setRangeMax] = useState(75);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [displayRoll, setDisplayRoll] = useState(null);
  const [history, setHistory] = useState([]);

  // Admin cheats
  const diceCheats = state.adminSettings?.gameSettings?.dice || {};
  const godMode = state.adminSettings?.godMode;

  const calculateWinChance = () => {
    if (mode === 'under') return target;
    if (mode === 'over') return 100 - target;
    if (mode === 'exact') return 1;
    if (mode === 'range') return Math.max(0, rangeMax - rangeMin + 1);
    return 50;
  };

  const winChance = calculateWinChance();
  const multiplier = winChance > 0 ? (98 / winChance) : 0;

  const checkWin = (roll) => {
    if (mode === 'under') return roll < target;
    if (mode === 'over') return roll > target;
    if (mode === 'exact') return roll === target;
    if (mode === 'range') return roll >= rangeMin && roll <= rangeMax;
    return false;
  };

  // Generate roll with cheats
  const generateRoll = () => {
    if (diceCheats.forceWin || godMode) {
      // Force a winning roll
      if (mode === 'under') return Math.floor(Math.random() * (target - 1)) + 1;
      if (mode === 'over') return Math.floor(Math.random() * (100 - target)) + target + 1;
      if (mode === 'exact') return target;
      if (mode === 'range') return Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
    }
    return Math.floor(Math.random() * 100) + 1;
  };

  const rollDice = useCallback(async () => {
    if (rolling) return;

    // Gaming engine balance check: verifies currentBalance >= betAmount before session trigger or state update
    const confirmed = await play(bet, 'dice', async () => {
      setRolling(true);
      setResult(null);
      audio.playBet();

      const duration = state.settings.fastMode ? 600 : 1000;
      const startTime = Date.now();
      const finalRoll = generateRoll();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);

        if (progress < 0.85) {
          setDisplayRoll(Math.floor(Math.random() * 100) + 1);
          requestAnimationFrame(animate);
        } else if (progress < 1) {
          // Slow down approach to final value
          const ease = (progress - 0.85) / 0.15;
          const variance = Math.floor((1 - ease) * 20);
          setDisplayRoll(finalRoll + Math.floor((Math.random() - 0.5) * variance));
          requestAnimationFrame(animate);
        } else {
          setDisplayRoll(finalRoll);

          const won = checkWin(finalRoll);
          const winAmount = won ? bet * multiplier : 0;
          const payout = won ? multiplier : 0;

          setResult({ roll: finalRoll, won, winAmount, mult: multiplier });
          setHistory(h => [{ roll: finalRoll, won, mult: payout }, ...h.slice(0, 4)]);
          setRolling(false);

          addWin(winAmount, bet, 'dice', payout);
          won ? audio.playWin() : audio.playLose();
        }
      };

      requestAnimationFrame(animate);
    });

    if (!confirmed) return;
  }, [rolling, bet, play, state.settings.fastMode, target, mode, rangeMin, rangeMax, multiplier, addWin, generateRoll, checkWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const getModeLabel = () => {
    if (mode === 'under') return `Roll under ${target}`;
    if (mode === 'over') return `Roll over ${target}`;
    if (mode === 'exact') return `Roll exactly ${target}`;
    if (mode === 'range') return `Roll ${rangeMin}-${rangeMax}`;
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0a1a1a] rounded-2xl p-6 flex flex-col items-center justify-center relative">
        {/* Win/Lose indicator - TOP */}
        {result && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 text-center py-3 px-8 rounded-2xl z-10 ${
            result.won
              ? 'bg-gradient-to-r from-green-900/80 to-emerald-900/80 border border-green-500/50'
              : 'bg-gradient-to-r from-red-900/80 to-rose-900/80 border border-red-500/50'
          }`}>
            <span className={`text-xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won
                ? `WIN ${result.mult.toFixed(2)}x → +$${result.winAmount.toFixed(2)}`
                : `MISS @ ${result.roll}`}
            </span>
          </div>
        )}

        {/* Big Dice Display */}
        <div className="relative">
          <div className={`w-48 h-48 rounded-3xl bg-gradient-to-br from-gray-900 to-black border-4 flex items-center justify-center shadow-2xl ${
            result ? (result.won ? 'border-green-500 shadow-green-500/50' : 'border-red-500 shadow-red-500/50') : 'border-cyan-500/30'
          } ${rolling ? 'animate-pulse' : ''}`}>
            <span className={`text-7xl font-black ${
              result ? (result.won ? 'text-green-400' : 'text-red-400') : 'text-white'
            }`}>
              {displayRoll ?? '??'}
            </span>
          </div>
        </div>

        {/* Slider Visualization */}
        <div className="w-full max-w-xl mt-12 px-4">
          <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden">
            {mode === 'under' && (
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-600" style={{ width: `${target}%` }} />
            )}
            {mode === 'over' && (
              <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-green-500 to-green-600" style={{ width: `${100 - target}%` }} />
            )}
            {mode === 'exact' && (
              <div className="absolute inset-y-0 bg-gradient-to-r from-yellow-500 to-yellow-600" style={{ left: `${target - 1}%`, width: '2%' }} />
            )}
            {mode === 'range' && (
              <div className="absolute inset-y-0 bg-gradient-to-r from-green-500 to-green-600" style={{ left: `${rangeMin}%`, width: `${rangeMax - rangeMin + 1}%` }} />
            )}

            {/* Roll indicator */}
            {displayRoll && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-12 bg-white rounded-full shadow-lg transition-all"
                style={{ left: `calc(${displayRoll}% - 8px)` }}
              />
            )}
          </div>

          {/* Scale */}
          <div className="flex justify-between mt-2 text-gray-500 text-sm font-mono">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-2 mt-8 flex-wrap justify-center">
            {history.map((h, i) => (
              <span key={i} className={`px-4 py-2 rounded-xl font-bold ${h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {h.roll}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
          {/* Mode Selection */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Bet Type</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { value: 'under', label: 'Under' },
                { value: 'over', label: 'Over' },
                { value: 'exact', label: 'Exact' },
                { value: 'range', label: 'Range' }
              ].map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  disabled={rolling}
                  className={`py-3 rounded-xl font-bold transition-all ${
                    mode === m.value ? 'bg-cyan-600 text-white scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Control */}
          {(mode === 'under' || mode === 'over' || mode === 'exact') && (
            <div>
              <label className="text-sm text-gray-400 uppercase font-bold">Target: {target}</label>
              <input
                type="range"
                min={1}
                max={99}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                disabled={rolling}
                className="w-full mt-2 accent-cyan-500 h-3"
              />
              <div className="grid grid-cols-5 gap-2 mt-2">
                {[10, 25, 50, 75, 90].map(v => (
                  <button key={v} onClick={() => setTarget(v)} disabled={rolling}
                    className={`py-2 rounded-lg text-xs font-bold ${target === v ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Range Controls */}
          {mode === 'range' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 uppercase font-bold">Min: {rangeMin}</label>
                <input
                  type="range"
                  min={1}
                  max={rangeMax - 1}
                  value={rangeMin}
                  onChange={(e) => setRangeMin(Number(e.target.value))}
                  disabled={rolling}
                  className="w-full mt-2 accent-green-500 h-3"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase font-bold">Max: {rangeMax}</label>
                <input
                  type="range"
                  min={rangeMin + 1}
                  max={100}
                  value={rangeMax}
                  onChange={(e) => setRangeMax(Number(e.target.value))}
                  disabled={rolling}
                  className="w-full mt-2 accent-green-500 h-3"
                />
              </div>
            </div>
          )}

          {/* Bet Amount */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Bet Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={rolling}
                className="w-full bg-black/50 border-2 border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={rolling} className="btn-secondary py-2 text-sm font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={rolling} className="btn-secondary py-2 text-sm font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={rolling} className="btn-secondary py-2 text-sm font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={rolling} className="btn-secondary py-2 text-sm font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-black/30 rounded-xl p-3 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Win Chance</span>
              <span className="text-cyan-400 font-black text-lg">{winChance.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Multiplier</span>
              <span className="text-green-400 font-black text-lg">{multiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Profit on Win</span>
              <span className="text-yellow-400 font-black text-lg">+${((bet * multiplier) - bet).toFixed(2)}</span>
            </div>
          </div>

          {/* Roll Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={rolling}
              balance={state.balance}
              betAmount={bet}
              onClick={rollDice}
              label={getModeLabel()}
              loadingText="ROLLING..."
              className="py-4 text-xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
