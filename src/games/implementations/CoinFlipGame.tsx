import { useCallback, useRef, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const MULTIPLIER = 1.96; // 2% house edge

export default function CoinFlipGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [choice, setChoice] = useState('heads');
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState(null);
  const [coinState, setCoinState] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState({ type: null, count: 0 });
  const animRef = useRef(null);

  // Admin cheats
  const coinflipCheats = state.adminSettings?.gameSettings?.coinflip || {};
  const godMode = state.adminSettings?.godMode;

  const flip = useCallback(async () => {
    if (flipping || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'coinflip');
    if (!confirmed) return;

    setFlipping(true);
    setResult(null);
    audio.playBet();

    // Admin cheat: always win
    let isHeads;
    if (coinflipCheats.alwaysWin || godMode) {
      isHeads = choice === 'heads';
    } else {
      isHeads = Math.random() > 0.5;
    }

    const won = (isHeads && choice === 'heads') || (!isHeads && choice === 'tails');
    const duration = state.settings.fastMode ? 1000 : 2000;
    const startTime = Date.now();

    // Target rotation: multiple full spins + landing position
    const baseSpins = 4;
    const targetRotateX = baseSpins * 360 + (isHeads ? 0 : 180);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Easing function for smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 4);

      // Calculate current rotation
      const currentRotateX = targetRotateX * ease;

      // Add wobble effect during spinning
      const wobble = progress < 0.8 ? Math.sin(elapsed / 50) * 20 * (1 - progress) : 0;

      // Scale bounce effect
      const scale = progress < 0.3
        ? 1 + Math.sin(progress * Math.PI * 3) * 0.1
        : progress > 0.9
          ? 1 + Math.sin((progress - 0.9) * 10 * Math.PI) * 0.05 * (1 - progress) * 10
          : 1;

      setCoinState({
        rotateX: currentRotateX,
        rotateY: wobble,
        scale
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Final state
        setCoinState({ rotateX: targetRotateX, rotateY: 0, scale: 1 });
        setFlipping(false);

        const outcome = isHeads ? 'heads' : 'tails';
        setHistory(h => [outcome, ...h.slice(0, 4)]);

        // Update streak
        setStreak(s => {
          if (s.type === outcome) return { type: outcome, count: s.count + 1 };
          return { type: outcome, count: 1 };
        });

        if (won) {
          const win = bet * MULTIPLIER;
          addWin(win, bet, 'coinflip', MULTIPLIER);
          setResult({ won: true, outcome, profit: win - bet });
          audio.playWin();
        } else {
          addWin(0, bet, 'coinflip', 0);
          setResult({ won: false, outcome, profit: -bet });
          audio.playLose();
        }
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [flipping, bet, state.balance, choice, state.settings.fastMode, placeBet, addWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  // Determine which face is showing
  const normalizedRotation = ((coinState.rotateX % 360) + 360) % 360;
  const showingHeads = normalizedRotation < 90 || normalizedRotation >= 270;

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a1a0a] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-500 rounded-full blur-[100px]" />
        </div>

        {/* Coin */}
        <div className="relative z-10" style={{ perspective: '1000px' }}>
          {/* Glow effect */}
          <div className={`absolute inset-0 w-52 h-52 rounded-full blur-2xl transition-colors duration-300 ${
            flipping ? 'bg-purple-500 opacity-50' :
            result ? (result.won ? 'bg-green-500 opacity-60' : 'bg-red-500 opacity-60') :
            showingHeads ? 'bg-yellow-500 opacity-30' : 'bg-gray-500 opacity-30'
          }`} />

          <div
            className="w-52 h-52 relative"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${coinState.rotateX}deg) rotateY(${coinState.rotateY}deg) scale(${coinState.scale})`,
            }}
          >
            {/* Heads */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.3), inset 0 8px 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,200,0,0.3)'
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-1">🪙</div>
                <div className="text-2xl font-black text-yellow-900/80">HEADS</div>
              </div>
              {/* Rim effect */}
              <div className="absolute inset-2 rounded-full border-4 border-yellow-300/30" />
            </div>

            {/* Tails */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.3), inset 0 8px 20px rgba(255,255,255,0.3), 0 0 40px rgba(150,150,150,0.3)'
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-1">🌟</div>
                <div className="text-2xl font-black text-gray-900/80">TAILS</div>
              </div>
              {/* Rim effect */}
              <div className="absolute inset-2 rounded-full border-4 border-gray-300/30" />
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-8 text-center py-4 px-10 rounded-2xl z-10 ${
            result.won
              ? 'bg-gradient-to-r from-green-900/70 to-emerald-900/70 border border-green-500/50'
              : 'bg-gradient-to-r from-red-900/70 to-rose-900/70 border border-red-500/50'
          }`}>
            <div className={`text-3xl font-black capitalize ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.outcome.toUpperCase()}!
            </div>
            <div className={`text-xl font-bold mt-1 ${result.won ? 'text-green-300' : 'text-red-300'}`}>
              {result.won ? `+$${result.profit.toFixed(2)}` : `-$${Math.abs(result.profit).toFixed(2)}`}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-lg transition-all ${
                  h === 'heads'
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900'
                    : 'bg-gradient-to-br from-gray-400 to-gray-600 text-gray-900'
                }`}
                style={{ opacity: 1 - i * 0.08 }}
              >
                {h === 'heads' ? 'H' : 'T'}
              </div>
            ))}
          </div>
        )}

        {/* Streak indicator */}
        {streak.count >= 3 && (
          <div className="absolute top-4 right-4 px-4 py-2 bg-purple-900/50 border border-purple-500/50 rounded-xl">
            <span className="text-purple-400 font-bold">
              {streak.count}x {streak.type?.toUpperCase()} Streak!
            </span>
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
          {/* Choice */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Pick Your Side</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => !flipping && setChoice('heads')}
                disabled={flipping}
                className={`py-5 rounded-xl font-black text-lg transition-all relative overflow-hidden ${
                  choice === 'heads'
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 ring-2 ring-yellow-300 shadow-lg shadow-yellow-500/30'
                    : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700'
                }`}
              >
                <span className="text-2xl block mb-1"></span>
                HEADS
              </button>
              <button
                onClick={() => !flipping && setChoice('tails')}
                disabled={flipping}
                className={`py-5 rounded-xl font-black text-lg transition-all relative overflow-hidden ${
                  choice === 'tails'
                    ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white ring-2 ring-gray-300 shadow-lg shadow-gray-500/30'
                    : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700'
                }`}
              >
                <span className="text-2xl block mb-1"></span>
                TAILS
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
                disabled={flipping}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={flipping} className="btn-secondary py-2 text-xs font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={flipping} className="btn-secondary py-2 text-xs font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={flipping} className="btn-secondary py-2 text-xs font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={flipping} className="btn-secondary py-2 text-xs font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-black/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Win Chance</span>
              <span className="text-cyan-400 font-bold">50%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Multiplier</span>
              <span className="text-purple-400 font-bold">{MULTIPLIER}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Profit on Win</span>
              <span className="text-green-400 font-bold">+${(bet * MULTIPLIER - bet).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Win</span>
              <span className="text-yellow-400 font-bold">${(bet * MULTIPLIER).toFixed(2)}</span>
            </div>
          </div>

          {/* Flip Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={flipping}
              balance={state.balance}
              betAmount={bet}
              onClick={flip}
              label="FLIP COIN"
              loadingText="FLIPPING..."
              className={`py-4 text-xl font-black ${
                choice === 'heads'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-yellow-900 shadow-yellow-500/30'
                  : 'bg-gradient-to-r from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500 text-gray-900 shadow-gray-500/30'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
