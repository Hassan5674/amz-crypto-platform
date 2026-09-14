import { useCallback, useEffect, useRef, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '7️⃣', '💎', '🔔', '🍀'];

// Base paytable - gets multiplied by volatility
const BASE_PAYTABLE = {
  '7️⃣': { 3: 50, 4: 200, 5: 1000 },
  '💎': { 3: 25, 4: 100, 5: 500 },
  '⭐': { 3: 15, 4: 60, 5: 300 },
  '🔔': { 3: 10, 4: 40, 5: 200 },
  '🍀': { 3: 10, 4: 40, 5: 200 },
  '🍇': { 3: 6, 4: 24, 5: 120 },
  '🍊': { 3: 4, 4: 16, 5: 80 },
  '🍋': { 3: 3, 4: 12, 5: 60 },
  '🍒': { 3: 2, 4: 8, 5: 40 },
};

// Volatility affects win frequency AND payout multiplier
const VOLATILITY = {
  low: {
    name: 'Low',
    // Frequent wins but tiny payouts
    weights: [30, 25, 22, 18, 3, 0.5, 0.8, 0.5, 0.2],
    payMultiplier: 0.3,
    winChance: 0.25,  // 25% chance to force a win
    description: 'Frequent small wins'
  },
  medium: {
    name: 'Medium',
    weights: [18, 17, 16, 15, 12, 6, 7, 6, 3],
    payMultiplier: 0.6,
    winChance: 0.15,  // 15% chance
    description: 'Balanced gameplay'
  },
  high: {
    name: 'High',
    // Rare wins but bigger payouts
    weights: [12, 12, 11, 10, 15, 12, 13, 10, 5],
    payMultiplier: 1.2,
    winChance: 0.08,  // 8% chance
    description: 'Rare big wins'
  },
  extreme: {
    name: 'Extreme',
    // Very rare wins, huge payouts
    weights: [6, 6, 6, 6, 18, 18, 18, 16, 6],
    payMultiplier: 2.5,
    winChance: 0.04,  // 4% chance
    description: 'Jackpot hunting'
  },
  jackpot: {
    name: 'Jackpot',
    // Almost no wins, massive payouts when hit
    weights: [3, 3, 3, 4, 20, 25, 22, 15, 5],
    payMultiplier: 5.0,
    winChance: 0.02,  // 2% chance
    description: 'Max risk max reward'
  },
};

// Generate dynamic paytable based on volatility
const getPaytable = (volatilityKey) => {
  const mult = VOLATILITY[volatilityKey].payMultiplier;
  const table = {};
  Object.keys(BASE_PAYTABLE).forEach(symbol => {
    table[symbol] = {};
    Object.keys(BASE_PAYTABLE[symbol]).forEach(count => {
      table[symbol][count] = Math.round(BASE_PAYTABLE[symbol][count] * mult);
    });
  });
  return table;
};

export default function SlotsGame() {
  const { state, placeBet, addWin, setGlobalBet, shouldGameWin } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [reelCount, setReelCount] = useState(5);
  const [rowCount, setRowCount] = useState(3);
  const [volatility, setVolatility] = useState('medium');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [autoSpin, setAutoSpin] = useState(false);
  const autoSpinRef = useRef(false);

  // Admin cheats
  const slotsCheats = state.adminSettings?.gameSettings?.slots || {};
  const godMode = state.adminSettings?.godMode;

  useEffect(() => {
    initReels();
  }, [reelCount, rowCount]);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  const initReels = () => {
    const newReels = [];
    for (let r = 0; r < reelCount; r++) {
      const col = [];
      for (let row = 0; row < rowCount; row++) {
        col.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
      newReels.push(col);
    }
    setReels(newReels);
  };

  const weightedRandom = () => {
    const weights = VOLATILITY[volatility].weights;
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
  };

  const checkWins = (grid, volKey) => {
    let totalMult = 0;
    const winLines = [];
    const PAYTABLE = getPaytable(volKey);

    // Check ALL rows for matching symbols
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const line = grid.map(col => col[rowIdx]);

      // Count consecutive matches from left
      let matchSymbol = line[0];
      let matchCount = 1;
      for (let i = 1; i < line.length; i++) {
        if (line[i] === matchSymbol) {
          matchCount++;
        } else break;
      }

      // Middle row pays full, other rows pay 75%
      const payMultiplier = rowIdx === Math.floor(rowCount / 2) ? 1 : 0.75;

      if (matchCount >= 3 && PAYTABLE[matchSymbol] && PAYTABLE[matchSymbol][matchCount]) {
        const mult = PAYTABLE[matchSymbol][matchCount] * payMultiplier;
        totalMult += mult;
        winLines.push({ symbol: matchSymbol, count: matchCount, mult, row: rowIdx });
      }
    }

    // Scatter bonus: count clover symbols anywhere - scaled by volatility
    let scatterCount = 0;
    grid.forEach(col => col.forEach(s => { if (s === '🍀') scatterCount++; }));
    if (scatterCount >= 3) {
      const baseMult = scatterCount === 3 ? 5 : scatterCount === 4 ? 15 : 50;
      const scatterMult = Math.round(baseMult * VOLATILITY[volKey].payMultiplier);
      totalMult += scatterMult;
      winLines.push({ symbol: '🍀', count: scatterCount, mult: scatterMult, scatter: true });
    }

    return { totalMult, winLines };
  };

  // Generate final reels with volatility-based win chance and admin RTP control
  const generateFinalReels = () => {
    const isWinAllowed = shouldGameWin ? shouldGameWin('slots') : true;

    if (!isWinAllowed) {
      // Force non-matching losing symbols across reels
      const symbolsNoMatch = ['🍒', '🍋', '🍊', '🍇', '💎'];
      const newReels = [];
      for (let r = 0; r < reelCount; r++) {
        const col = [];
        for (let row = 0; row < rowCount; row++) {
          col.push(symbolsNoMatch[(r + row) % symbolsNoMatch.length]);
        }
        newReels.push(col);
      }
      return newReels;
    }

    const winChance = VOLATILITY[volatility].winChance;

    // Only force a win based on actual win chance (much lower now)
    if (Math.random() < winChance) {
      // Force some matching on middle row - but only 3 matches most of the time
      const targetSymbol = weightedRandom();
      const matchLength = Math.random() < 0.15 ? 4 : 3; // Only 15% chance for 4-match

      const newReels = [];
      for (let r = 0; r < reelCount; r++) {
        const col = [];
        for (let row = 0; row < rowCount; row++) {
          if (row === Math.floor(rowCount / 2) && r < matchLength) {
            col.push(targetSymbol);
          } else {
            col.push(weightedRandom());
          }
        }
        newReels.push(col);
      }
      return newReels;
    }

    // Most of the time - completely random (natural wins are rare)
    const newReels = [];
    for (let r = 0; r < reelCount; r++) {
      const col = [];
      for (let row = 0; row < rowCount; row++) {
        col.push(weightedRandom());
      }
      newReels.push(col);
    }
    return newReels;
  };

  const spin = useCallback(async () => {
    if (spinning || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'slots');
    if (!confirmed) return;

    setSpinning(true);
    setResult(null);
    audio.playBet();

    let tick = 0;
    const maxTicks = 20;
    const interval = setInterval(() => {
      setReels(prev => prev.map(() => {
        const col = [];
        for (let row = 0; row < rowCount; row++) {
          col.push(weightedRandom());
        }
        return col;
      }));
      tick++;

      if (tick >= maxTicks) {
        clearInterval(interval);

        let finalReels;

        // Admin cheat: force jackpot (all 7s)
        if (slotsCheats.forceJackpot || godMode) {
          finalReels = [];
          for (let r = 0; r < reelCount; r++) {
            const col = [];
            for (let row = 0; row < rowCount; row++) {
              col.push('7️⃣');
            }
            finalReels.push(col);
          }
        } else {
          finalReels = generateFinalReels();
        }

        setReels(finalReels);

        const { totalMult, winLines } = checkWins(finalReels, volatility);
        const winAmount = bet * totalMult;
        const won = totalMult > 0;

        setResult({ won, totalMult, winAmount, winLines });
        setHistory(h => [{ won, mult: totalMult }, ...h.slice(0, 4)]);
        setSpinning(false);

        addWin(winAmount, bet, 'slots', totalMult);
        if (won) audio.playWin();
        else audio.playLose();

        // Auto spin
        if (autoSpinRef.current && state.balance > bet) {
          setTimeout(() => spin(), 800);
        }
      }
    }, 60);
  }, [spinning, bet, state.balance, reelCount, rowCount, volatility, placeBet, addWin, slotsCheats.forceJackpot, godMode]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const symbolSize = reelCount <= 3 ? 'text-6xl' : reelCount === 4 ? 'text-5xl' : 'text-4xl';
  const cellSize = reelCount <= 3 ? 'w-24 h-24' : reelCount === 4 ? 'w-20 h-20' : 'w-16 h-16';

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0f0a] rounded-2xl p-6 flex flex-col items-center justify-center">
        {/* Slot Machine Frame */}
        <div className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-3xl border-4 border-yellow-600/50 shadow-2xl shadow-yellow-500/20">
          {/* Reels */}
          <div className="flex gap-2">
            {reels.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-2">
                {col.map((symbol, rowIdx) => (
                  <div
                    key={rowIdx}
                    className={`${cellSize} bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center border-2 ${
                      rowIdx === Math.floor(rowCount / 2) ? 'border-yellow-500/50' : 'border-gray-700'
                    } ${spinning ? 'animate-pulse' : ''}`}
                  >
                    <span className={`${symbolSize}`}>{symbol}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Win indicator */}
          {result && result.won && (
            <div className="mt-4 text-center bg-gradient-to-r from-yellow-500 to-orange-500 py-3 px-6 rounded-xl">
              <div className="text-2xl font-black text-black">WIN! {result.totalMult.toFixed(1)}x</div>
              <div className="text-xl font-bold text-black">+${result.winAmount.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Paytable Preview - Dynamic based on volatility */}
        <div className="mt-6 bg-black/50 rounded-xl p-4">
          <div className="text-xs text-gray-500 text-center mb-2 uppercase">{VOLATILITY[volatility].description}</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {['7️⃣', '💎', '⭐'].map(sym => {
              const paytable = getPaytable(volatility);
              return (
                <div key={sym} className="text-sm">
                  <span className="text-2xl">{sym}</span>
                  <div className="text-gray-400">3x: <span className="text-yellow-400">{paytable[sym][3]}x</span></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {history.map((h, i) => (
              <span key={i} className={`px-4 py-2 rounded-xl font-bold ${h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {h.won ? `${h.mult.toFixed(1)}x` : '✗'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
          {/* Grid Size */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Reels × Rows</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { r: 3, rows: 3, label: '3×3' },
                { r: 4, rows: 3, label: '4×3' },
                { r: 5, rows: 3, label: '5×3' },
              ].map(cfg => (
                <button
                  key={cfg.label}
                  onClick={() => { setReelCount(cfg.r); setRowCount(cfg.rows); }}
                  disabled={spinning}
                  className={`py-3 rounded-xl font-bold transition-all ${
                    reelCount === cfg.r && rowCount === cfg.rows ? 'bg-yellow-600 text-black scale-105' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volatility */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Volatility</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(VOLATILITY).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setVolatility(key)}
                  disabled={spinning}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-xs ${
                    volatility === key ? 'bg-purple-600 text-white scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  title={val.description}
                >
                  <div>{val.name}</div>
                  <div className={`text-[10px] ${volatility === key ? 'text-purple-200' : 'text-gray-500'}`}>
                    {val.payMultiplier}x pay
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Bet Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={spinning}
                className="w-full bg-black/50 border-2 border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={spinning} className="btn-secondary py-2 text-sm font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={spinning} className="btn-secondary py-2 text-sm font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={spinning} className="btn-secondary py-2 text-sm font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={spinning} className="btn-secondary py-2 text-sm font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Quick Bets */}
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map(v => (
              <button key={v} onClick={() => handleBetChange(v)} disabled={spinning}
                className={`py-2 rounded-lg text-sm font-bold ${bet === v ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-400'}`}>
                ${v}
              </button>
            ))}
          </div>

          {/* Auto Spin Toggle */}
          <button
            onClick={() => setAutoSpin(!autoSpin)}
            disabled={spinning}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              autoSpin ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {autoSpin ? 'AUTO SPIN ON' : 'AUTO SPIN OFF'}
          </button>

          {/* Spin Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={spinning}
              balance={state.balance}
              betAmount={bet}
              onClick={spin}
              label="SPIN"
              loadingText="SPINNING..."
              className="py-4 text-xl font-black bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-yellow-500/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
