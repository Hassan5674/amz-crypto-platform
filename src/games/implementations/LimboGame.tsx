import { useCallback, useRef, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

export default function LimboGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [target, setTarget] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState(null);
  const [displayMult, setDisplayMult] = useState(null);
  const [history, setHistory] = useState([]);
  const [animating, setAnimating] = useState(false);
  const animRef = useRef(null);

  // Admin cheats
  const limboCheats = state.adminSettings?.gameSettings?.limbo || {};
  const godMode = state.adminSettings?.godMode;

  // Win chance and house edge calculation
  const winChance = Math.min(99, (99 / target));
  const expectedPayout = target * (winChance / 100);

  const play = useCallback(async () => {
    if (playing || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'limbo');
    if (!confirmed) return;

    setPlaying(true);
    setAnimating(true);
    setResult(null);
    audio.playBet();

    // Generate outcome (house edge ~1%)
    let outcome;
    if (limboCheats.forceHit || godMode) {
      // Always generate a winning outcome (>= target)
      outcome = target + Math.random() * (target * 2);
    } else {
      const rand = Math.random();
      outcome = Math.max(1.00, 0.99 / rand);
    }
    const won = outcome >= target;

    // Animate the number rolling
    const duration = state.settings.fastMode ? 600 : 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress < 0.8) {
        // Random numbers while spinning
        setDisplayMult(Math.random() * 20 + 1);
        animRef.current = requestAnimationFrame(animate);
      } else if (progress < 1) {
        // Slow down and approach final value
        const easeProgress = (progress - 0.8) / 0.2;
        const variance = (1 - easeProgress) * 5;
        setDisplayMult(outcome + (Math.random() - 0.5) * variance);
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Final result
        setAnimating(false);
        setPlaying(false);
        setDisplayMult(outcome);

        const mult = won ? target : 0;
        const winAmount = bet * mult;
        setResult({ outcome, won, mult: target, profit: won ? winAmount - bet : -bet });
        setHistory(h => [{ mult: outcome, won, target }, ...h.slice(0, 4)]);

        if (won) {
          addWin(winAmount, bet, 'limbo', target);
          audio.playWin();
        } else {
          addWin(0, bet, 'limbo', 0);
          audio.playLose();
        }
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [playing, bet, state.balance, target, state.settings.fastMode, placeBet, addWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const handleTargetChange = (val) => {
    const v = Math.min(Math.max(1.01, val), 1000);
    setTarget(v);
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0f0a1a] rounded-2xl p-6 flex flex-col items-center justify-center relative">
        {/* Main Display */}
        <div className="relative">
          {/* Glow effect */}
          <div className={`absolute inset-0 blur-3xl opacity-50 transition-colors ${
            result ? (result.won ? 'bg-green-500' : 'bg-red-500') : 'bg-purple-500'
          }`} />

          {/* Multiplier */}
          <div className={`relative text-9xl font-black transition-all ${
            animating ? 'text-purple-400 animate-pulse' :
            result ? (result.won ? 'text-green-400' : 'text-red-400') : 'text-white'
          }`}>
            {displayMult ? displayMult.toFixed(2) : '?.??'}
            <span className="text-4xl">x</span>
          </div>
        </div>

        {/* Target indicator */}
        <div className="mt-8 flex items-center gap-4">
          <div className="text-gray-500">Target:</div>
          <div className={`text-3xl font-black px-6 py-2 rounded-xl ${
            result
              ? (result.won ? 'bg-green-900/50 text-green-400 border border-green-500/50' : 'bg-red-900/50 text-red-400 border border-red-500/50')
              : 'bg-purple-900/30 text-purple-400 border border-purple-500/50'
          }`}>
            {target.toFixed(2)}x
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div className={`mt-6 text-center py-4 px-10 rounded-2xl ${
            result.won
              ? 'bg-gradient-to-r from-green-900/60 to-emerald-900/60 border border-green-500/50'
              : 'bg-gradient-to-r from-red-900/60 to-rose-900/60 border border-red-500/50'
          }`}>
            <div className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won
                ? `HIT! ${result.mult.toFixed(2)}x → +$${result.profit.toFixed(2)}`
                : `MISS! Rolled ${result.outcome.toFixed(2)}x`}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {history.map((h, i) => (
              <div key={i} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
              }`}>
                {h.mult.toFixed(2)}x
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 border border-purple-500/20 shadow-lg shadow-purple-500/10 flex flex-col gap-4">
          {/* Target Multiplier */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Target Multiplier</label>
            <div className="relative mt-2">
              <input
                type="number"
                value={target}
                onChange={(e) => !playing && handleTargetChange(Number(e.target.value))}
                disabled={playing}
                step={0.1}
                min={1.01}
                max={1000}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white text-xl font-bold text-center"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">x</span>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[1.5, 2, 3, 5, 10].map(v => (
                <button
                  key={v}
                  onClick={() => !playing && setTarget(v)}
                  disabled={playing}
                  className={`py-2 rounded-lg text-xs font-bold ${
                    target === v ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 mt-2">
              {[20, 50, 100].map(v => (
                <button
                  key={v}
                  onClick={() => !playing && setTarget(v)}
                  disabled={playing}
                  className={`py-2 rounded-lg text-xs font-bold ${
                    target === v ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {v}x
                </button>
              ))}
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

          {/* Info */}
          <div className="bg-black/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Win Chance</span>
              <span className="text-purple-400 font-bold">{winChance.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Profit on Win</span>
              <span className="text-green-400 font-bold">+${(bet * target - bet).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Win</span>
              <span className="text-cyan-400 font-bold">${(bet * target).toFixed(2)}</span>
            </div>
          </div>

          {/* Play Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={playing}
              balance={state.balance}
              betAmount={bet}
              onClick={play}
              label="PLAY"
              loadingText="ROLLING..."
              className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
