import { useCallback, useEffect, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

// Symbol definitions with emojis
const SYMBOL_STYLES: Record<string, any> = {
  // Classic
  'DIA': { label: '💎', color: 'text-cyan-400', bg: 'bg-cyan-900/50' },
  'STAR': { label: '⭐', color: 'text-yellow-400', bg: 'bg-yellow-900/50' },
  'CLUB': { label: '🍀', color: 'text-green-400', bg: 'bg-green-900/50' },
  'BELL': { label: '🔔', color: 'text-orange-400', bg: 'bg-orange-900/50' },
  'TARG': { label: '🎯', color: 'text-red-400', bg: 'bg-red-900/50' },
  'CHER': { label: '🍒', color: 'text-pink-400', bg: 'bg-pink-900/50' },
  // Lucky 7
  '7': { label: '7️⃣', color: 'text-purple-400', bg: 'bg-purple-900/50' },
  'COIN': { label: '🪙', color: 'text-yellow-300', bg: 'bg-yellow-900/50' },
  'SLOT': { label: '🎰', color: 'text-red-400', bg: 'bg-red-900/50' },
  'SUN': { label: '☀️', color: 'text-amber-400', bg: 'bg-amber-900/50' },
  'CASH': { label: '💵', color: 'text-green-400', bg: 'bg-green-900/50' },
  'DICE': { label: '🎲', color: 'text-white', bg: 'bg-gray-800' },
  // Emerald
  'EMER': { label: '💚', color: 'text-emerald-400', bg: 'bg-emerald-900/50' },
  'TREE': { label: '🌲', color: 'text-green-500', bg: 'bg-green-900/50' },
  'LEAF': { label: '🍃', color: 'text-green-300', bg: 'bg-green-800/50' },
  'KIWI': { label: '🥝', color: 'text-lime-400', bg: 'bg-lime-900/50' },
  'APPL': { label: '🍎', color: 'text-green-400', bg: 'bg-green-900/50' },
  'HERB': { label: '🌿', color: 'text-teal-400', bg: 'bg-teal-900/50' },
  // Diamond
  'DIAM': { label: '💠', color: 'text-blue-400', bg: 'bg-blue-900/50' },
  'CROWN': { label: '👑', color: 'text-yellow-400', bg: 'bg-yellow-900/50' },
  'RING': { label: '💍', color: 'text-pink-300', bg: 'bg-pink-900/50' },
  'CUP': { label: '🏆', color: 'text-amber-400', bg: 'bg-amber-900/50' },
  'SPARK': { label: '✨', color: 'text-cyan-300', bg: 'bg-cyan-900/50' },
  'MOON': { label: '🌙', color: 'text-indigo-300', bg: 'bg-indigo-900/50' },
  // Ruby
  'HEART': { label: '❤️', color: 'text-red-500', bg: 'bg-red-900/50' },
  'ROSE': { label: '🌹', color: 'text-rose-400', bg: 'bg-rose-900/50' },
  'RUBY': { label: '💎', color: 'text-red-400', bg: 'bg-red-900/50' },
  'BOW': { label: '🎀', color: 'text-pink-400', bg: 'bg-pink-900/50' },
  'DOT': { label: '🔴', color: 'text-red-600', bg: 'bg-red-950/50' },
  'WINE': { label: '🍷', color: 'text-rose-300', bg: 'bg-rose-900/50' },
  // Jackpot - more unique casino symbols
  'JACK': { label: '🤴', color: 'text-yellow-400', bg: 'bg-gradient-to-br from-yellow-900/50 to-amber-900/50' },
  'MEGA': { label: '💰', color: 'text-red-400', bg: 'bg-red-900/50' },
  'KING': { label: '🏆', color: 'text-purple-400', bg: 'bg-purple-900/50' },
  'FIRE': { label: '🔥', color: 'text-orange-500', bg: 'bg-orange-900/50' },
  'BOLT': { label: '⚡', color: 'text-yellow-300', bg: 'bg-yellow-900/50' },
  'NOVA': { label: '💫', color: 'text-pink-400', bg: 'bg-pink-900/50' },
};

// Card types - REALISTIC win chances (much lower!)
const CARD_TYPES = {
  classic: {
    name: 'Classic',
    price: 10,
    color: 'from-yellow-600 to-amber-700',
    symbols: ['DIA', 'STAR', 'CLUB', 'BELL', 'TARG', 'CHER'],
    prizes: {
      'DIA': 100,
      'STAR': 50,
      'CLUB': 25,
      'BELL': 15,
      'TARG': 10,
      'CHER': 5,
    },
    winChance: 0.25, // 25% any win
    jackpotChance: 0.02, // 2% for top prize
  },
  lucky7: {
    name: 'Lucky 7',
    price: 25,
    color: 'from-purple-600 to-indigo-700',
    symbols: ['7', 'COIN', 'SLOT', 'SUN', 'CASH', 'DICE'],
    prizes: {
      '7': 500,
      'COIN': 200,
      'SLOT': 100,
      'SUN': 50,
      'CASH': 25,
      'DICE': 10,
    },
    winChance: 0.20,
    jackpotChance: 0.01,
  },
  emerald: {
    name: 'Emerald',
    price: 35,
    color: 'from-emerald-500 to-green-700',
    symbols: ['EMER', 'TREE', 'LEAF', 'KIWI', 'APPL', 'HERB'],
    prizes: {
      'EMER': 700,
      'TREE': 350,
      'LEAF': 175,
      'KIWI': 70,
      'APPL': 35,
      'HERB': 15,
    },
    winChance: 0.18,
    jackpotChance: 0.008,
  },
  diamond: {
    name: 'Diamond',
    price: 50,
    color: 'from-cyan-500 to-blue-600',
    symbols: ['DIAM', 'CROWN', 'RING', 'CUP', 'SPARK', 'MOON'],
    prizes: {
      'DIAM': 2500,
      'CROWN': 1000,
      'RING': 500,
      'CUP': 200,
      'SPARK': 100,
      'MOON': 50,
    },
    winChance: 0.15,
    jackpotChance: 0.005,
  },
  ruby: {
    name: 'Ruby',
    price: 75,
    color: 'from-rose-500 to-red-700',
    symbols: ['HEART', 'ROSE', 'RUBY', 'BOW', 'DOT', 'WINE'],
    prizes: {
      'HEART': 5000,
      'ROSE': 2000,
      'RUBY': 1000,
      'BOW': 500,
      'DOT': 250,
      'WINE': 100,
    },
    winChance: 0.12,
    jackpotChance: 0.003,
  },
  jackpot: {
    name: 'Jackpot',
    price: 100,
    color: 'from-red-600 to-pink-700',
    symbols: ['JACK', 'MEGA', 'KING', 'FIRE', 'BOLT', 'NOVA'],
    prizes: {
      'JACK': 10000,
      'MEGA': 5000,
      'KING': 2500,
      'FIRE': 1000,
      'BOLT': 500,
      'NOVA': 250,
    },
    winChance: 0.08, // Only 8% chance to win ANYTHING
    jackpotChance: 0.001, // 0.1% for jackpot (1 in 1000)
  },
};

// Generate a scratch card grid (3x3)
const generateCard = (cardType, forceWin = false) => {
  const config = CARD_TYPES[cardType];
  const grid = [];

  // Check if we win at all
  const willWin = forceWin || Math.random() < config.winChance;

  if (willWin) {
    // Determine which prize tier we win
    const prizeSymbols = Object.keys(config.prizes);
    let selectedSymbol;

    // Check for jackpot first (top prize)
    if (Math.random() < (config.jackpotChance / config.winChance)) {
      selectedSymbol = prizeSymbols[0]; // Top prize
    } else {
      // Weight heavily towards lower prizes
      // Prizes are ordered high to low, so we want higher indices
      const weights = prizeSymbols.map((_, i) => Math.pow(3, i)); // Exponential towards lower prizes
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalWeight;

      selectedSymbol = prizeSymbols[prizeSymbols.length - 1]; // Default to lowest
      for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          selectedSymbol = prizeSymbols[i];
          break;
        }
      }
    }

    // Place 3 winning symbols randomly
    const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const winPositions = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * positions.length);
      winPositions.push(positions.splice(idx, 1)[0]);
    }

    // Fill the grid
    for (let i = 0; i < 9; i++) {
      if (winPositions.includes(i)) {
        grid.push({ symbol: selectedSymbol, revealed: false, isWin: true });
      } else {
        const otherSymbols = config.symbols.filter(s => s !== selectedSymbol);
        grid.push({
          symbol: otherSymbols[Math.floor(Math.random() * otherSymbols.length)],
          revealed: false,
          isWin: false
        });
      }
    }
  } else {
    // Generate a losing card (no 3 matching)
    const usedCounts = {};
    for (let i = 0; i < 9; i++) {
      let symbol;
      let attempts = 0;
      do {
        symbol = config.symbols[Math.floor(Math.random() * config.symbols.length)];
        attempts++;
      } while ((usedCounts[symbol] || 0) >= 2 && attempts < 20);

      usedCounts[symbol] = (usedCounts[symbol] || 0) + 1;
      grid.push({ symbol, revealed: false, isWin: false });
    }
  }

  return grid;
};

// Check for wins
const checkWin = (grid, cardType) => {
  const config = CARD_TYPES[cardType];
  const symbolCounts = {};

  grid.forEach(cell => {
    symbolCounts[cell.symbol] = (symbolCounts[cell.symbol] || 0) + 1;
  });

  for (const [symbol, prize] of Object.entries(config.prizes)) {
    if (symbolCounts[symbol] >= 3) {
      const numericPrize = Number(prize);
      return { won: true, symbol, prize: numericPrize, multiplier: numericPrize / config.price };
    }
  }

  return { won: false, prize: 0, multiplier: 0 };
};

export default function ScratchCardsGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [cardType, setCardType] = useState('classic');
  const [grid, setGrid] = useState(null);
  const [scratching, setScratching] = useState(false);
  const [result, setResult] = useState(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [autoReveal, setAutoReveal] = useState(false);

  // Admin cheats
  const scratchCheats = state.adminSettings?.gameSettings?.scratchcards || {};
  const godMode = state.adminSettings?.godMode;

  const buyCard = useCallback(async () => {
    const price = CARD_TYPES[cardType].price;
    if (price > state.balance) return;

    const confirmed = await placeBet(price, 'scratchcards');
    if (!confirmed) return;

    audio.playBet();

    const forceWin = scratchCheats.alwaysWin || godMode;
    const newGrid = generateCard(cardType, forceWin);

    setGrid(newGrid);
    setResult(null);
    setRevealedCount(0);
    setScratching(true);
  }, [cardType, state.balance, placeBet, scratchCheats.alwaysWin, godMode]);

  const revealCell = useCallback((index) => {
    if (!grid || grid[index].revealed || result) return;

    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[index] = { ...newGrid[index], revealed: true };
      return newGrid;
    });

    setRevealedCount(prev => prev + 1);
    if ((audio as any).playClick) {
      (audio as any).playClick();
    } else {
      audio.playBet();
    }
  }, [grid, result]);

  // Handle win/lose logic when all cells are revealed
  useEffect(() => {
    if (revealedCount === 9 && grid && !result) {
      const winResult = checkWin(grid, cardType);
      setResult(winResult);
      setScratching(false);

      if (winResult.won) {
        addWin(Number(winResult.prize), CARD_TYPES[cardType].price, 'scratchcards', Number(winResult.multiplier));
        audio.playWin();
        setHistory(h => [{ won: true, prize: winResult.prize }, ...h.slice(0, 4)]);
      } else {
        addWin(0, CARD_TYPES[cardType].price, 'scratchcards', 0);
        audio.playLose();
        setHistory(h => [{ won: false }, ...h.slice(0, 4)]);
      }
    }
  }, [revealedCount, grid, result, cardType, addWin]);

  const revealAll = useCallback(() => {
    if (!grid || result) return;

    let delay = 0;
    grid.forEach((cell, idx) => {
      if (!cell.revealed) {
        setTimeout(() => revealCell(idx), delay);
        delay += 100;
      }
    });
  }, [grid, result, revealCell]);

  const currentPrice = CARD_TYPES[cardType].price;
  const config = CARD_TYPES[cardType];

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0f0a] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[100px]" />
        </div>

        {!grid ? (
          // No card - show preview
          <div className="text-center z-10">
            <div className={`w-72 h-80 rounded-3xl bg-gradient-to-br ${config.color} p-1 shadow-2xl`}>
              <div className="w-full h-full bg-black/20 rounded-3xl flex flex-col items-center justify-center">
                <div className="text-6xl mb-4 font-black text-white/80">$</div>
                <div className="text-3xl font-black text-white">{config.name}</div>
                <div className="text-xl text-white/70 mt-2">${config.price}</div>
                <div className="mt-4 text-sm text-white/50">
                  Win up to ${Math.max(...(Object.values(config.prizes) as number[]))}
                </div>
                <div className="mt-2 text-xs text-white/40">
                  {(config.winChance * 100).toFixed(0)}% win chance
                </div>
              </div>
            </div>
            <p className="mt-6 text-gray-400 text-lg">Buy a card to start scratching!</p>
          </div>
        ) : (
          // Active card
          <div className="z-10">
            <div className={`w-80 rounded-3xl bg-gradient-to-br ${config.color} p-1 shadow-2xl`}>
              <div className="w-full bg-black/30 rounded-3xl p-4">
                {/* Card header */}
                <div className="text-center mb-4">
                  <div className="text-xl font-black text-white">{config.name}</div>
                  <div className="text-sm text-white/60">Match 3 to win!</div>
                </div>

                {/* Scratch grid */}
                <div className="grid grid-cols-3 gap-2">
                  {grid.map((cell, idx) => {
                    const symbolStyle = SYMBOL_STYLES[cell.symbol] || { label: '?', color: 'text-white', bg: 'bg-gray-800' };
                    return (
                      <button
                        key={idx}
                        onClick={() => revealCell(idx)}
                        disabled={cell.revealed || result}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
                          cell.revealed
                            ? cell.isWin
                              ? `${symbolStyle.bg} ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/50`
                              : `${symbolStyle.bg}`
                            : 'bg-gradient-to-br from-gray-400 to-gray-600 hover:brightness-110 cursor-pointer'
                        }`}
                        style={{
                          boxShadow: !cell.revealed ? 'inset 0 4px 8px rgba(0,0,0,0.3)' : undefined
                        }}
                      >
                        {cell.revealed ? (
                          <span className={`text-4xl font-black ${symbolStyle.color}`}>
                            {symbolStyle.label}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-2xl font-bold">?</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Reveal all button */}
                {scratching && revealedCount < 9 && (
                  <button
                    onClick={revealAll}
                    className="w-full mt-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold transition-all"
                  >
                    Reveal All
                  </button>
                )}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={`mt-6 text-center py-4 px-8 rounded-2xl ${
                result.won
                  ? 'bg-gradient-to-r from-green-900/70 to-emerald-900/70 border border-green-500/50'
                  : 'bg-gradient-to-r from-red-900/70 to-rose-900/70 border border-red-500/50'
              }`}>
                {result.won ? (
                  <>
                    <div className="text-3xl font-black text-green-400">WINNER!</div>
                    <div className="text-4xl mt-2 flex justify-center gap-2">
                    </div>
                    <div className="text-2xl font-bold text-green-300 mt-2">+${result.prize.toFixed(2)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-black text-red-400">No Match</div>
                    <div className="text-lg text-red-300 mt-1">Try again!</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg font-bold text-sm ${
                  h.won
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
                }`}
                style={{ opacity: 1 - i * 0.15 }}
              >
                {h.won ? `+$${h.prize}` : '✗'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-orange-500/20 shadow-lg shadow-orange-500/10">
          {/* Card Type Selection */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Select Card</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {Object.entries(CARD_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => !scratching && setCardType(key)}
                  disabled={scratching}
                  className={`py-2 px-1 rounded-xl font-bold text-xs transition-all ${
                    cardType === key
                      ? `bg-gradient-to-r ${val.color} text-white ring-2 ring-white/30`
                      : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700'
                  }`}
                >
                  <div className="truncate">{val.name}</div>
                  <div className="text-[10px] opacity-70">${val.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prize Table */}
          <div className="bg-black/40 rounded-xl p-3">
            <div className="text-xs text-gray-500 uppercase font-bold mb-2">Prizes (Match 3)</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.entries(config.prizes).map(([symbol, prize]) => {
                const style = SYMBOL_STYLES[symbol];
                return (
                  <div key={symbol} className="flex justify-between items-center text-sm">
                    <span className={`flex gap-1 text-lg font-bold ${style?.color || 'text-white'}`}>
                      <span>{style?.label}</span>
                      <span>{style?.label}</span>
                      <span>{style?.label}</span>
                    </span>
                    <span className="text-yellow-400 font-bold">${String(prize)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="bg-black/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Card Price</span>
              <span className="text-cyan-400 font-bold">${currentPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Win Chance</span>
              <span className="text-orange-400 font-bold">{(config.winChance * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Max Win</span>
              <span className="text-green-400 font-bold">${Math.max(...(Object.values(config.prizes) as number[]))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Max Multiplier</span>
              <span className="text-purple-400 font-bold">{(Math.max(...(Object.values(config.prizes) as number[])) / currentPrice).toFixed(0)}x</span>
            </div>
          </div>

          {/* Buy Card Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={scratching}
              balance={state.balance}
              betAmount={currentPrice}
              onClick={buyCard}
              label={result ? `BUY NEW CARD - $${currentPrice}` : `BUY CARD - $${currentPrice}`}
              loadingText="SCRATCHING..."
              className={`py-4 rounded-xl text-xl font-black transition-all bg-gradient-to-r ${config.color} hover:brightness-110 text-white`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
