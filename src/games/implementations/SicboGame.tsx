import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

// Organized bet categories
const BET_CATEGORIES: Record<string, any> = {
  basic: {
    label: 'Basic Bets',
    bets: {
      small: { label: 'SMALL', desc: '4-10', mult: 2 },
      big: { label: 'BIG', desc: '11-17', mult: 2 },
      odd: { label: 'ODD', desc: 'Odd Total', mult: 2 },
      even: { label: 'EVEN', desc: 'Even Total', mult: 2 },
    }
  },
  special: {
    label: 'Special Bets',
    bets: {
      triple: { label: 'ANY TRIPLE', desc: '111-666', mult: 30 },
      double: { label: 'ANY DOUBLE', desc: 'Pair', mult: 10 },
    }
  },
  totals: {
    label: 'Total Bets',
    bets: {
      specific4: { label: '4', desc: 'Total = 4', mult: 60 },
      specific17: { label: '17', desc: 'Total = 17', mult: 60 },
      specific5: { label: '5', desc: 'Total = 5', mult: 30 },
      specific16: { label: '16', desc: 'Total = 16', mult: 30 },
      specific6: { label: '6', desc: 'Total = 6', mult: 18 },
      specific15: { label: '15', desc: 'Total = 15', mult: 18 },
      specific7: { label: '7', desc: 'Total = 7', mult: 12 },
      specific14: { label: '14', desc: 'Total = 14', mult: 12 },
      specific8: { label: '8', desc: 'Total = 8', mult: 8 },
      specific13: { label: '13', desc: 'Total = 13', mult: 8 },
      specific9: { label: '9', desc: 'Total = 9', mult: 7 },
      specific12: { label: '12', desc: 'Total = 12', mult: 7 },
      specific10: { label: '10', desc: 'Total = 10', mult: 6 },
      specific11: { label: '11', desc: 'Total = 11', mult: 6 },
    }
  }
};

// Flatten for easy access
const BET_TYPES = {};
Object.values(BET_CATEGORIES).forEach(cat => {
  Object.entries(cat.bets).forEach(([key, val]) => {
    BET_TYPES[key] = val;
  });
});

// Check functions
const isTriple = (d) => d[0] === d[1] && d[1] === d[2];
const hasDouble = (d) => d[0] === d[1] || d[1] === d[2] || d[0] === d[2];
const getTotal = (d) => d.reduce((a, b) => a + b, 0);

const checkBet = (betType, dice) => {
  const total = getTotal(dice);
  switch (betType) {
    case 'small': return total >= 4 && total <= 10 && !isTriple(dice);
    case 'big': return total >= 11 && total <= 17 && !isTriple(dice);
    case 'odd': return total % 2 === 1;
    case 'even': return total % 2 === 0;
    case 'triple': return isTriple(dice);
    case 'double': return hasDouble(dice);
    case 'specific4': return total === 4;
    case 'specific5': return total === 5;
    case 'specific6': return total === 6;
    case 'specific7': return total === 7;
    case 'specific8': return total === 8;
    case 'specific9': return total === 9;
    case 'specific10': return total === 10;
    case 'specific11': return total === 11;
    case 'specific12': return total === 12;
    case 'specific13': return total === 13;
    case 'specific14': return total === 14;
    case 'specific15': return total === 15;
    case 'specific16': return total === 16;
    case 'specific17': return total === 17;
    default: return false;
  }
};

export default function SicboGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [betType, setBetType] = useState('big');
  const [dice, setDice] = useState([1, 1, 1]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeCategory, setActiveCategory] = useState('basic');

  // Admin cheats
  const sicboCheats = state.adminSettings?.gameSettings?.sicbo || {};
  const godMode = state.adminSettings?.godMode;

  const roll = useCallback(async () => {
    if (rolling || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'sicbo');
    if (!confirmed) return;

    setRolling(true);
    setResult(null);
    audio.playBet();

    let finalDice;

    // Admin cheat: force triple
    if (sicboCheats.forceTriple || godMode) {
      const num = Math.floor(Math.random() * 6) + 1;
      finalDice = [num, num, num];
    } else {
      finalDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
    }

    const duration = state.settings.fastMode ? 800 : 1500;
    let frame = 0;
    const maxFrames = 30;

    const animate = () => {
      if (frame < maxFrames) {
        setDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ]);
        frame++;
        setTimeout(animate, duration / maxFrames);
      } else {
        setDice(finalDice);
        setRolling(false);

        const total = getTotal(finalDice);
        const won = checkBet(betType, finalDice);
        const mult = won ? BET_TYPES[betType].mult : 0;
        const winAmount = bet * mult;

        setResult({ dice: finalDice, total, won, mult, profit: winAmount - bet });
        setHistory(h => [{ total, won }, ...h.slice(0, 4)]);

        if (won) {
          addWin(winAmount, bet, 'sicbo', mult);
          audio.playWin();
        } else {
          addWin(0, bet, 'sicbo', 0);
          audio.playLose();
        }
      }
    };
    animate();
  }, [rolling, bet, state.balance, betType, state.settings.fastMode, placeBet, addWin, sicboCheats.forceTriple, godMode]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const DICE_DOTS = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
  };

  const Die = ({ value }) => (
    <div className={`w-20 h-20 bg-white rounded-xl shadow-xl relative ${rolling ? 'animate-bounce' : ''}`}>
      {DICE_DOTS[value]?.map((pos, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 bg-gray-900 rounded-full"
          style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  );

  const total = dice.reduce((a, b) => a + b, 0);

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0f0a] rounded-2xl p-6 flex flex-col">
        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-3xl font-black bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">
            SIC BO
          </h2>
          <p className="text-xs text-gray-500 mt-1">Three Dice Fortune</p>
        </div>

        {/* Dice Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="flex gap-4">
            {dice.map((d, i) => <Die key={i} value={d} />)}
          </div>

          {/* Total */}
          <div className="bg-black/50 px-8 py-3 rounded-2xl">
            <span className="text-gray-500 text-sm">TOTAL: </span>
            <span className="text-4xl font-black text-white">{total}</span>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`text-center py-3 rounded-xl ${result.won ? 'bg-green-900/50 border border-green-500/30' : 'bg-red-900/50 border border-red-500/30'}`}>
            <span className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won ? `${result.mult}x WIN! +$${result.profit.toFixed(2)}` : `LOSE -$${bet.toFixed(2)}`}
            </span>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {history.map((h, i) => (
              <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${
                h.won ? 'bg-green-600 text-white' : h.total <= 10 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {h.total}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 border border-orange-500/20 shadow-lg shadow-orange-500/10 flex flex-col gap-3 overflow-hidden">
          {/* Category Tabs */}
          <div className="flex gap-1">
            {Object.entries(BET_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === key
                    ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Bet Options */}
          <div className="flex-1 overflow-y-auto">
            <div className={`grid gap-2 ${activeCategory === 'totals' ? 'grid-cols-4' : 'grid-cols-2'}`}>
              {Object.entries(BET_CATEGORIES[activeCategory].bets).map(([key, type]: [string, any]) => (
                <button
                  key={key}
                  onClick={() => !rolling && setBetType(key)}
                  disabled={rolling}
                  className={`py-3 px-2 rounded-xl font-bold transition-all ${
                    betType === key
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white shadow-lg ring-2 ring-cyan-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <div className={activeCategory === 'totals' ? 'text-lg' : 'text-sm'}>{type.label}</div>
                  {activeCategory !== 'totals' && <div className="text-[10px] text-gray-500">{type.desc}</div>}
                  <div className="text-green-400 text-sm mt-0.5">{type.mult}x</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Bet Info */}
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500">Selected Bet</div>
                <div className="text-lg font-black text-white">{BET_TYPES[betType].label}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Multiplier</div>
                <div className="text-2xl font-black text-green-400">{BET_TYPES[betType].mult}x</div>
              </div>
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Bet Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={rolling}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={rolling} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={rolling} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={rolling} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={rolling} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Potential Win */}
          <div className="bg-black/30 rounded-xl p-3">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Potential Win</span>
              <span className="text-green-400 font-black text-xl">${(bet * BET_TYPES[betType].mult).toFixed(2)}</span>
            </div>
          </div>

          {/* Roll Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={rolling}
              balance={state.balance}
              betAmount={bet}
              onClick={roll}
              label="ROLL DICE"
              loadingText="ROLLING..."
              className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white shadow-red-500/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
