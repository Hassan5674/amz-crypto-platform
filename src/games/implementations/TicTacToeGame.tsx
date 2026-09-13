import { useCallback, useEffect, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

// Multipliers based on difficulty
const DIFFICULTY_MULTIPLIERS = {
  easy: 1.5,
  medium: 3.5,
  hard: 5.0
};

const TIE_MULTIPLIER = 0; // Tie returns nothing (lose)

const WINNING_LINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal
  [2, 4, 6]  // Anti-diagonal
];

export default function TicTacToeGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, playing, ended
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [winLine, setWinLine] = useState(null);
  const [difficulty, setDifficulty] = useState('medium'); // easy, medium, hard

  const godMode = state.adminSettings?.godMode;

  const checkWinner = (squares) => {
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line };
      }
    }
    return null;
  };

  const isBoardFull = (squares) => squares.every(s => s !== null);

  // Minimax algorithm for perfect AI play
  const minimax = useCallback((squares, isMaximizing, alpha, beta) => {
    const winner = checkWinner(squares);
    if (winner?.winner === 'O') return 10;
    if (winner?.winner === 'X') return -10;
    if (squares.every(s => s !== null)) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          const evalScore = minimax(squares, false, alpha, beta);
          squares[i] = null;
          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          const evalScore = minimax(squares, true, alpha, beta);
          squares[i] = null;
          minEval = Math.min(minEval, evalScore);
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  }, []);

  const getBestMove = useCallback((squares) => {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        const score = minimax(squares, false, -Infinity, Infinity);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }, [minimax]);

  const getAIMove = useCallback((squares, aiDifficulty) => {
    const emptySquares = squares.map((s, i) => s === null ? i : null).filter(i => i !== null);

    if (emptySquares.length === 0) return null;

    // In god mode or admin cheat, AI makes stupid moves
    if (godMode || state.adminSettings?.gameSettings?.tictactoe?.aiMakesStupidMoves) {
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }

    // Easy: 70% random, 30% smart
    if (aiDifficulty === 'easy') {
      if (Math.random() < 0.7) {
        return emptySquares[Math.floor(Math.random() * emptySquares.length)];
      }
    }

    // Check for winning move (all difficulties)
    for (const idx of emptySquares) {
      const testBoard = [...squares];
      testBoard[idx] = 'O';
      if (checkWinner(testBoard)?.winner === 'O') {
        return idx;
      }
    }

    // Check for blocking move (all difficulties)
    for (const idx of emptySquares) {
      const testBoard = [...squares];
      testBoard[idx] = 'X';
      if (checkWinner(testBoard)?.winner === 'X') {
        return idx;
      }
    }

    // Easy: Random after blocking
    if (aiDifficulty === 'easy') {
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }

    // Medium: 50% random, 50% strategic
    if (aiDifficulty === 'medium') {
      if (Math.random() < 0.5) {
        return emptySquares[Math.floor(Math.random() * emptySquares.length)];
      }
      // Take center or corner
      if (squares[4] === null) return 4;
      const corners = [0, 2, 6, 8].filter(i => squares[i] === null);
      if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
      }
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }

    // Hard: Perfect minimax play (unbeatable)
    return getBestMove([...squares]);
  }, [godMode, state.adminSettings?.gameSettings?.tictactoe?.aiMakesStupidMoves, getBestMove]);

  const startGame = useCallback(async () => {
    if (gamePhase !== 'betting' || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'tictactoe');
    if (!confirmed) return;

    audio.playBet();
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setResult(null);
    setWinLine(null);
    setGamePhase('playing');
  }, [gamePhase, bet, state.balance, placeBet]);

  const makeMove = useCallback((index) => {
    if (gamePhase !== 'playing' || !isPlayerTurn || board[index] !== null) return;

    audio.playClick();
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    // Check for win/tie
    const winResult = checkWinner(newBoard);
    if (winResult) {
      setWinLine(winResult.line);
      endGame('win', newBoard);
      return;
    }

    if (isBoardFull(newBoard)) {
      endGame('tie', newBoard);
      return;
    }

    setIsPlayerTurn(false);
  }, [gamePhase, isPlayerTurn, board]);

  // AI makes move
  useEffect(() => {
    if (gamePhase !== 'playing' || isPlayerTurn) return;

    const timeout = setTimeout(() => {
      const aiMove = getAIMove(board, difficulty);
      if (aiMove === null) return;

      audio.playClick();
      const newBoard = [...board];
      newBoard[aiMove] = 'O';
      setBoard(newBoard);

      // Check for win/tie
      const winResult = checkWinner(newBoard);
      if (winResult) {
        setWinLine(winResult.line);
        endGame('lose', newBoard);
        return;
      }

      if (isBoardFull(newBoard)) {
        endGame('tie', newBoard);
        return;
      }

      setIsPlayerTurn(true);
    }, state.settings.fastMode ? 300 : 700);

    return () => clearTimeout(timeout);
  }, [isPlayerTurn, gamePhase, board, difficulty, getAIMove, state.settings.fastMode]);

  const endGame = (outcome, finalBoard) => {
    setGamePhase('ended');
    setHistory(h => [{ outcome, board: finalBoard }, ...h.slice(0, 3)]);

    const winMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] + 1;

    if (outcome === 'win') {
      const winAmount = bet * winMultiplier;
      addWin(winAmount, bet, 'tictactoe', winMultiplier);
      setResult({ won: true, outcome: 'win', profit: winAmount - bet });
      audio.playWin();
    } else if (outcome === 'lose') {
      addWin(0, bet, 'tictactoe', 0);
      setResult({ won: false, outcome: 'lose', profit: -bet });
      audio.playLose();
    } else {
      // Tie - player loses bet
      addWin(0, bet, 'tictactoe', 0);
      setResult({ won: false, outcome: 'tie', profit: -bet });
      audio.playLose();
    }
  };

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0a0a1a] rounded-2xl p-4 flex flex-col items-center justify-center">
        {/* Game Status */}
        <div className="mb-6">
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
            gamePhase === 'betting' ? 'bg-cyan-600/30 text-cyan-400' :
            gamePhase === 'playing' && isPlayerTurn ? 'bg-green-600/30 text-green-400' :
            gamePhase === 'playing' ? 'bg-yellow-600/30 text-yellow-400' :
            result?.won ? 'bg-green-600/30 text-green-400' :
            'bg-red-600/30 text-red-400'
          }`}>
            {gamePhase === 'betting' && 'Place your bet to start'}
            {gamePhase === 'playing' && isPlayerTurn && 'Your turn (X)'}
            {gamePhase === 'playing' && !isPlayerTurn && 'AI thinking...'}
            {gamePhase === 'ended' && result?.outcome === 'win' && 'You win!'}
            {gamePhase === 'ended' && result?.outcome === 'lose' && 'AI wins!'}
            {gamePhase === 'ended' && result?.outcome === 'tie' && 'It\'s a tie!'}
          </span>
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-black/30 rounded-2xl">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => makeMove(index)}
              disabled={gamePhase !== 'playing' || !isPlayerTurn || cell !== null}
              className={`w-24 h-24 rounded-xl text-5xl font-black transition-all ${
                cell === null && gamePhase === 'playing' && isPlayerTurn
                  ? 'bg-gray-800 hover:bg-gray-700 cursor-pointer'
                  : 'bg-gray-800/50 cursor-default'
              } ${winLine?.includes(index) ? 'ring-4 ring-yellow-400' : ''}`}
            >
              {cell === 'X' && <span className="text-cyan-400">X</span>}
              {cell === 'O' && <span className="text-red-400">O</span>}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-6 px-8 py-4 rounded-xl ${
            result.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            <div className="text-center">
              <span className="text-2xl font-bold">
                {result.won ? `+$${result.profit.toFixed(2)}` : `-$${Math.abs(result.profit).toFixed(2)}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-5 border border-blue-500/20 shadow-lg shadow-blue-500/10 overflow-y-auto">
          {/* Bet Amount */}
          <div className="space-y-3 animate-slide-in-down">
            <label className="text-sm text-green-400 uppercase font-bold tracking-wider">Bet Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 text-xl font-bold">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={gamePhase !== 'betting'}
                className="w-full bg-black/60 border-2 border-green-500/30 rounded-xl py-4 pl-10 pr-4 text-white text-xl font-bold focus:border-green-400 focus:outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleBetChange(1)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">MAX</button>
            </div>
          </div>

          {/* Difficulty */}
          <div className="animate-slide-in-down" style={{ animationDelay: '0.05s' }}>
            <label className="text-sm text-purple-400 uppercase font-bold tracking-wider mb-3 block">AI Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {['easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={gamePhase !== 'betting'}
                  className={`py-2 rounded-lg font-bold text-sm transition-all ${
                    difficulty === d
                      ? d === 'easy' ? 'bg-green-600 text-white' :
                        d === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Payout Info */}
          <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-gray-700/50 animate-slide-in-down" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Win Payout:</span>
              <span className="text-green-400 font-bold text-lg">{(DIFFICULTY_MULTIPLIERS[difficulty] + 1).toFixed(1)}x</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-700/50">
              <span className="text-gray-400 text-sm">Tie:</span>
              <span className="text-red-400 font-bold text-lg">Lose bet</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Beat the AI to win! Ties count as a loss.
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase font-bold mb-2">History</div>
              <div className="space-y-1">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className={`flex justify-between px-3 py-2 rounded-lg text-sm ${
                      h.outcome === 'win' ? 'bg-green-900/30 text-green-400' :
                      h.outcome === 'tie' ? 'bg-gray-700/30 text-gray-400' :
                      'bg-red-900/30 text-red-400'
                    }`}
                  >
                    <span className="text-xs uppercase">{h.outcome}</span>
                    <span className="font-bold">{h.outcome === 'win' ? 'WIN' : 'LOSE'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start/New Game Button */}
          <div className="mt-auto">
            {gamePhase === 'betting' ? (
              <BettingButton
                balance={state.balance}
                betAmount={bet}
                onClick={startGame}
                label="START GAME"
                loadingText="STARTING..."
                className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/40"
              />
            ) : gamePhase === 'playing' ? (
              <button
                disabled
                className="w-full py-5 rounded-2xl font-black text-lg bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600"
              >
                PLAYING...
              </button>
            ) : (
              <button
                onClick={() => setGamePhase('betting')}
                className="w-full py-5 rounded-2xl font-black text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/40"
              >
                NEW GAME
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
