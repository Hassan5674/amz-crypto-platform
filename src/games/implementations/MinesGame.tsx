import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

export default function MinesGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [mineCount, setMineCount] = useState(3);
  const [gridSize, setGridSize] = useState(5); // 3x3, 4x4, 5x5, 6x6
  const [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState([]);
  const [revealed, setRevealed] = useState(0);
  const [currentMult, setCurrentMult] = useState(1);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Admin cheats
  const minesCheats = state.adminSettings?.gameSettings?.mines || {};
  const godMode = state.adminSettings?.godMode;

  const totalTiles = gridSize * gridSize;
  const maxMines = totalTiles - 1;

  // Calculate multiplier based on probability of surviving each click
  // Formula: for each revealed safe tile, multiply by (remaining tiles / remaining safe tiles)
  // Then apply house edge (3%)
  const calculateMult = (safe, mines, total) => {
    if (safe === 0) return 1;

    let probability = 1;
    for (let i = 0; i < safe; i++) {
      const remainingTiles = total - i;
      const remainingSafe = total - mines - i;
      if (remainingSafe <= 0) break;
      probability *= remainingSafe / remainingTiles;
    }

    // Multiplier is inverse of probability with 3% house edge
    const rawMult = 1 / probability;
    return rawMult * 0.97;
  };

  // Get next multiplier (what you'll get if you reveal one more tile)
  const getNextMult = (safe, mines, total) => {
    return calculateMult(safe + 1, mines, total);
  };

  const startGame = useCallback(() => {
    if (playing || bet <= 0 || bet > state.balance) return;
    if (!placeBet(bet, 'mines')) return;

    const total = gridSize * gridSize;
    const newGrid = Array(total).fill(null).map(() => ({ revealed: false, mine: false }));

    // Admin cheat: no mines at all
    if (!minesCheats.noMines && !godMode) {
      const minePositions = new Set();
      while (minePositions.size < mineCount) {
        minePositions.add(Math.floor(Math.random() * total));
      }
      minePositions.forEach((pos: any) => newGrid[Number(pos)].mine = true);
    }

    setGrid(newGrid);
    setPlaying(true);
    setRevealed(0);
    setCurrentMult(1);
    setResult(null);
    audio.playBet();
  }, [playing, bet, state.balance, mineCount, gridSize, placeBet, minesCheats.noMines, godMode]);

  const revealTile = useCallback((idx) => {
    if (!playing || grid[idx].revealed) return;

    const newGrid = [...grid];
    newGrid[idx] = { ...newGrid[idx], revealed: true };
    setGrid(newGrid);

    // Admin cheat: treat mine as safe
    const isMine = newGrid[idx].mine && !minesCheats.noMines && !godMode;

    if (isMine) {
      setPlaying(false);
      const finalGrid = newGrid.map(t => t.mine ? { ...t, revealed: true } : t);
      setGrid(finalGrid);
      setResult({ won: false, mult: 0, profit: -bet });
      setHistory(h => [{ mult: 0, won: false }, ...h.slice(0, 4)]);
      addWin(0, bet, 'mines', 0);
      audio.playLose();
    } else {
      const newRevealed = revealed + 1;
      setRevealed(newRevealed);
      const newMult = calculateMult(newRevealed, mineCount, totalTiles);
      setCurrentMult(newMult);
      audio.playClick();

      if (newRevealed >= totalTiles - mineCount) {
        cashout(newMult);
      }
    }
  }, [playing, grid, revealed, mineCount, bet, addWin, totalTiles, minesCheats.noMines, godMode]);

  const cashout = useCallback((mult = currentMult) => {
    if (!playing) return;
    setPlaying(false);
    const winAmount = bet * mult;
    setResult({ won: true, mult, profit: winAmount - bet });
    setHistory(h => [{ mult, won: true }, ...h.slice(0, 4)]);
    addWin(winAmount, bet, 'mines', mult);
    audio.playWin();
  }, [playing, currentMult, bet, addWin]);

  const handleBetChange = (val: number) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const nextMult = revealed > 0 ? calculateMult(revealed + 1, mineCount, totalTiles) : calculateMult(1, mineCount, totalTiles);

  const tileSize = gridSize === 3 ? 'w-20 h-20' : gridSize === 4 ? 'w-16 h-16' : gridSize === 5 ? 'w-14 h-14' : 'w-12 h-12';
  const emojiSize = gridSize <= 4 ? 'text-3xl' : 'text-2xl';

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0a0f] rounded-2xl p-6 flex flex-col items-center justify-center">
        {/* Grid */}
        {!playing && grid.length === 0 ? (
          <div className="flex flex-col items-center justify-center opacity-40">
            <div className={`grid gap-2 mb-4`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {Array(gridSize * gridSize).fill(0).map((_, i) => (
                <div key={i} className={`${tileSize} rounded-xl bg-gray-800/50 border-2 border-dashed border-gray-700/50 flex items-center justify-center`}>
                  <span className="text-3xl text-gray-700">?</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <span className="text-gray-600 uppercase text-sm font-bold">Place bet to start</span>
              <div className="text-gray-700 text-xs mt-1">Find {gridSize * gridSize - mineCount} gems, avoid {mineCount} mines</div>
            </div>
          </div>
        ) : (
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
            {grid.map((tile, i) => {
              // Admin cheat: highlight safe tiles
              const showSafeHint = playing && !tile.revealed && (minesCheats.revealSafe || godMode) && !tile.mine;

              return (
                <button
                  key={i}
                  onClick={() => revealTile(i)}
                  disabled={!playing || tile.revealed}
                  className={`${tileSize} rounded-xl ${emojiSize} font-bold transition-all flex items-center justify-center shadow-lg ${
                    tile.revealed
                      ? tile.mine
                        ? 'bg-gradient-to-br from-red-500 to-red-700 text-white scale-95'
                        : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-95'
                      : showSafeHint
                        ? 'bg-gradient-to-br from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 hover:scale-105 border-2 border-green-500/50'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 hover:scale-105'
                  }`}
                >
                  {tile.revealed ? (tile.mine ? '💣' : '💎') : showSafeHint ? '✓' : ''}
                </button>
              );
            })}
          </div>
        )}

        {/* Current Multiplier */}
        {playing && revealed > 0 && (
          <div className="mt-6 text-center bg-black/50 px-8 py-4 rounded-2xl">
            <span className="text-4xl font-black text-green-400">{currentMult.toFixed(2)}x</span>
            <div className="text-gray-500 text-sm mt-1">Next: {nextMult.toFixed(2)}x</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mt-6 text-center py-4 px-8 rounded-2xl ${result.won ? 'bg-green-900/60 border-2 border-green-500/50' : 'bg-red-900/60 border-2 border-red-500/50'}`}>
            <span className={`text-3xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won ? `CASHED ${result.mult.toFixed(2)}x → +$${result.profit.toFixed(2)}` : 'BOOM!'}
            </span>
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-red-500/20 shadow-lg shadow-red-500/10">
          {/* Grid Size */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Grid Size</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[3, 4, 5, 6].map(size => (
                <button
                  key={size}
                  onClick={() => !playing && setGridSize(size)}
                  disabled={playing}
                  className={`py-3 rounded-xl font-bold transition-all ${
                    gridSize === size ? 'bg-cyan-600 text-white scale-105' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* Mines */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Mines: {mineCount}</label>
            <input
              type="range"
              min={1}
              max={Math.min(maxMines, 24)}
              value={Math.min(mineCount, maxMines)}
              onChange={(e) => !playing && setMineCount(Number(e.target.value))}
              disabled={playing}
              className="w-full mt-2 accent-red-500 h-3"
            />
            <div className="grid grid-cols-5 gap-2 mt-2">
              {[1, 3, 5, 10, 15].filter(v => v < totalTiles).map(v => (
                <button key={v} onClick={() => !playing && setMineCount(v)} disabled={playing}
                  className={`py-2 rounded-lg text-xs font-bold ${mineCount === v ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Bet */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Bet Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={playing}
                className="w-full bg-black/50 border-2 border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={playing} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={playing} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={playing} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={playing} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">MAX</button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-black/30 rounded-xl p-3 space-y-2">
            {playing ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Revealed</span>
                  <span className="text-cyan-400 font-black text-lg">{revealed}/{totalTiles - mineCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Mult</span>
                  <span className="text-green-400 font-black text-lg">{currentMult.toFixed(2)}x</span>
                </div>
                {revealed < totalTiles - mineCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Click</span>
                    <span className="text-yellow-400 font-black text-lg">{getNextMult(revealed, mineCount, totalTiles).toFixed(2)}x</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-500">Current Win</span>
                  <span className="text-green-400 font-black text-lg">${(bet * currentMult).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Safe Tiles</span>
                  <span className="text-cyan-400 font-black text-lg">{totalTiles - mineCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">First Click</span>
                  <span className="text-green-400 font-black text-lg">{calculateMult(1, mineCount, totalTiles).toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Win</span>
                  <span className="text-yellow-400 font-black text-lg">{calculateMult(totalTiles - mineCount, mineCount, totalTiles).toFixed(2)}x</span>
                </div>
              </>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="flex gap-2 justify-center">
              {history.map((h, i) => (
                <span key={i} className={`px-3 py-2 rounded-lg text-sm font-bold ${h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {h.won ? h.mult.toFixed(1) + 'x' : '💣'}
                </span>
              ))}
            </div>
          )}

          {/* Play/Cashout */}
          {playing ? (
            <button
              onClick={() => cashout()}
              disabled={revealed === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-xl disabled:opacity-50 mt-auto shadow-lg shadow-yellow-500/30"
            >
              CASHOUT ${(bet * currentMult).toFixed(2)}
            </button>
          ) : (
            <div className="mt-auto">
              <BettingButton
                balance={state.balance}
                betAmount={bet}
                onClick={startGame}
                label="START GAME"
                loadingText="STARTING..."
                className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/30"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
