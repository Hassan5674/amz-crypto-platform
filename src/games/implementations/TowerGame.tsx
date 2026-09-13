import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const DIFFICULTIES: Record<string, any> = {
  easy: { cols: 4, safes: 3, label: 'Easy', color: 'green' },
  medium: { cols: 3, safes: 2, label: 'Medium', color: 'yellow' },
  hard: { cols: 3, safes: 1, label: 'Hard', color: 'orange' },
  extreme: { cols: 4, safes: 1, label: 'Extreme', color: 'red' }
};

const ROWS = 9;

export default function TowerGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [difficulty, setDifficulty] = useState('medium');
  const [playing, setPlaying] = useState(false);
  const [tower, setTower] = useState([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Admin cheats
  const towerCheats = state.adminSettings?.gameSettings?.tower || {};
  const godMode = state.adminSettings?.godMode;

  const { cols, safes } = DIFFICULTIES[difficulty];

  // Calculate multiplier based on difficulty and row
  const getMultiplier = (row) => {
    const risk = cols - safes; // Number of dangerous tiles
    const baseOdds = cols / safes; // True odds per tile
    const houseEdge = 0.98; // 2% house edge
    return Math.pow(baseOdds * houseEdge, row);
  };

  const currentMult = getMultiplier(currentRow);
  const nextMult = getMultiplier(currentRow + 1);

  const startGame = useCallback(async () => {
    if (playing || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'tower');
    if (!confirmed) return;

    // Generate tower - safes determined by difficulty
    const newTower = Array(ROWS).fill(null).map(() => {
      const row = Array(cols).fill(false);

      // Admin cheat: all tiles safe
      if (towerCheats.noTraps || godMode) {
        return row.map(() => ({ safe: true, revealed: false, selected: false }));
      }

      const safeIndices = new Set();
      while (safeIndices.size < safes) {
        safeIndices.add(Math.floor(Math.random() * cols));
      }
      safeIndices.forEach((i: any) => row[Number(i)] = true);
      return row.map(safe => ({ safe, revealed: false, selected: false }));
    });

    setTower(newTower);
    setPlaying(true);
    setCurrentRow(0);
    setResult(null);
    audio.playBet();
  }, [playing, bet, state.balance, cols, safes, placeBet, towerCheats.noTraps, godMode]);

  const selectTile = useCallback((col) => {
    if (!playing || currentRow >= ROWS) return;

    const newTower = [...tower];
    const tile = newTower[currentRow][col];

    // Reveal the selected tile
    newTower[currentRow] = newTower[currentRow].map((t, i) => ({
      ...t,
      revealed: i === col ? true : t.revealed,
      selected: i === col
    }));
    setTower(newTower);

    if (tile.safe) {
      // Safe - go up
      audio.playClick();
      const nextRow = currentRow + 1;
      setCurrentRow(nextRow);

      if (nextRow >= ROWS) {
        // Reached top - auto cashout
        cashout(getMultiplier(ROWS));
      }
    } else {
      // Hit trap - LOSE
      setPlaying(false);
      // Reveal all tiles
      const finalTower = newTower.map(row => row.map(t => ({ ...t, revealed: true })));
      setTower(finalTower);
      setResult({ won: false, mult: 0, profit: -bet });
      setHistory(h => [{ won: false, rows: currentRow }, ...h.slice(0, 4)]);
      addWin(0, bet, 'tower', 0);
      audio.playLose();
    }
  }, [playing, tower, currentRow, bet, addWin]);

  const cashout = useCallback((mult = currentMult) => {
    if (!playing || currentRow === 0) return;
    setPlaying(false);
    const winAmount = bet * mult;
    setResult({ won: true, mult, profit: winAmount - bet });
    setHistory(h => [{ won: true, rows: currentRow, mult }, ...h.slice(0, 4)]);
    addWin(winAmount, bet, 'tower', mult);
    audio.playWin();
  }, [playing, currentRow, currentMult, bet, addWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const diffColors = {
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0a1a1a] rounded-2xl p-4 flex flex-col items-center justify-center relative">
        {/* Current Multiplier */}
        {playing && currentRow > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4">
            <div className="bg-black/60 px-5 py-2 rounded-xl border border-green-500/30">
              <span className="text-gray-400 text-sm">Current: </span>
              <span className="text-green-400 font-black text-xl">{currentMult.toFixed(2)}x</span>
            </div>
            <div className="bg-black/60 px-5 py-2 rounded-xl border border-cyan-500/30">
              <span className="text-gray-400 text-sm">Next: </span>
              <span className="text-cyan-400 font-black text-xl">{nextMult.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {/* Tower */}
        <div className="flex flex-col-reverse gap-1.5">
          {Array(ROWS).fill(null).map((_, row) => (
            <div
              key={row}
              className={`flex gap-1.5 transition-all ${
                row < currentRow ? 'opacity-40 scale-95' :
                row === currentRow && playing ? 'scale-105' : ''
              }`}
            >
              {(tower[row] || Array(cols).fill({ safe: false, revealed: false, selected: false })).map((tile, col) => (
                <button
                  key={col}
                  onClick={() => row === currentRow && selectTile(col)}
                  disabled={!playing || row !== currentRow || tile.revealed}
                  className={`w-14 h-12 rounded-lg text-lg font-bold transition-all flex items-center justify-center ${
                    tile.revealed
                      ? tile.safe
                        ? tile.selected
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/50 scale-105'
                          : 'bg-gradient-to-br from-green-700 to-green-800 text-green-300'
                        : tile.selected
                          ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/50 animate-pulse'
                          : 'bg-gradient-to-br from-red-900 to-red-950 text-red-400'
                      : row === currentRow && playing
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 cursor-pointer shadow-lg shadow-cyan-500/30 hover:scale-105'
                        : 'bg-gray-800 text-gray-600'
                  }`}
                >
                  {tile.revealed ? (tile.safe ? '💎' : '💀') : row === currentRow && playing ? '?' : ''}
                </button>
              ))}

              {/* Row multiplier indicator */}
              <div className="w-16 flex items-center justify-center text-xs font-bold text-gray-500">
                {getMultiplier(row + 1).toFixed(2)}x
              </div>
            </div>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-center py-3 px-8 rounded-xl ${
            result.won
              ? 'bg-gradient-to-r from-green-900/80 to-emerald-900/80 border border-green-500/50'
              : 'bg-gradient-to-r from-red-900/80 to-rose-900/80 border border-red-500/50'
          }`}>
            <span className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won ? `${result.mult.toFixed(2)}x → +$${result.profit.toFixed(2)}` : 'TRAP!'}
            </span>
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
          {/* Difficulty */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Difficulty</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(DIFFICULTIES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => !playing && setDifficulty(key)}
                  disabled={playing}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    difficulty === key
                      ? `bg-gradient-to-r ${diffColors[val.color]} text-white shadow-lg scale-105`
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <div>{val.label}</div>
                  <div className="text-xs opacity-75">{val.safes}/{val.cols} safe</div>
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
              <button onClick={() => handleBetChange(1)} disabled={playing} className="btn-secondary py-2 text-xs font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={playing} className="btn-secondary py-2 text-xs font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={playing} className="btn-secondary py-2 text-xs font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={playing} className="btn-secondary py-2 text-xs font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-black/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current Level</span>
              <span className="text-white font-bold">{currentRow}/{ROWS}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Potential Win</span>
              <span className="text-green-400 font-bold">${(bet * currentMult).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Max Win (Level 9)</span>
              <span className="text-cyan-400 font-bold">${(bet * getMultiplier(ROWS)).toFixed(2)}</span>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="flex gap-2 justify-center">
              {history.map((h, i) => (
                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {h.won ? `${h.mult.toFixed(1)}x` : `L${h.rows}`}
                </span>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-auto space-y-3">
            {playing && currentRow > 0 ? (
              <button
                onClick={() => cashout()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-xl shadow-lg shadow-green-500/30 animate-pulse"
              >
                CASHOUT ${(bet * currentMult).toFixed(2)}
              </button>
            ) : !playing ? (
              <BettingButton
                balance={state.balance}
                betAmount={bet}
                onClick={startGame}
                label="START CLIMB"
                loadingText="STARTING..."
                className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30"
              />
            ) : (
              <div className="text-center text-cyan-400 py-4 font-bold">
                Pick a tile above
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
