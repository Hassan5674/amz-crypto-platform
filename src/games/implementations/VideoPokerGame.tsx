import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getCard = () => {
  const idx = Math.floor(Math.random() * 13);
  return {
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: VALUES[idx],
    rank: idx + 2 // 2-14 (A=14)
  };
};

const HANDS = [
  { name: 'Royal Flush', mult: 250 },
  { name: 'Straight Flush', mult: 50 },
  { name: 'Four of a Kind', mult: 25 },
  { name: 'Full House', mult: 9 },
  { name: 'Flush', mult: 6 },
  { name: 'Straight', mult: 4 },
  { name: 'Three of a Kind', mult: 3 },
  { name: 'Two Pair', mult: 2 },
  { name: 'Jacks or Better', mult: 1 }
];

const HAND_EXPLANATIONS = {
  'Royal Flush': 'Five cards of the same suit in sequence from 10 to Ace (10-J-Q-K-A)',
  'Straight Flush': 'Five cards of the same suit in sequence (e.g., 5♠ 6♠ 7♠ 8♠ 9♠)',
  'Four of a Kind': 'Four cards of the same rank (e.g., K♠ K♥ K♦ K♣ 5♠)',
  'Full House': 'Three cards of one rank + two cards of another rank (e.g., Q♠ Q♥ Q♦ 3♠ 3♥)',
  'Flush': 'Five cards of the same suit (e.g., 2♠ 5♠ 9♠ J♠ K♠)',
  'Straight': 'Five cards in sequence of different suits (e.g., 4♠ 5♥ 6♦ 7♣ 8♠)',
  'Three of a Kind': 'Three cards of the same rank (e.g., 9♠ 9♥ 9♦ 3♠ 7♥)',
  'Two Pair': 'Two pairs of cards with the same rank (e.g., J♠ J♥ 5♦ 5♣ K♠)',
  'Jacks or Better': 'A pair of Jacks, Queens, Kings, or Aces (e.g., J♠ J♥ 3♦ 7♣ 9♠)',
  'No Win': 'No winning combination - bet is lost',
  'win': 'You win! You receive payment according to the payout table.',
  'lose': 'You lose. This combination does not win.'
};

const evaluateHand = (cards: any[]) => {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  const values = cards.map(c => c.value);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1) ||
    (ranks.join(',') === '2,3,4,5,14'); // A-2-3-4-5
  const isRoyal = ranks.join(',') === '10,11,12,13,14';

  const counts: Record<string, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countVals = Object.values(counts).sort((a, b) => b - a);

  if (isRoyal && isFlush) return { name: 'Royal Flush', mult: 250 };
  if (isStraight && isFlush) return { name: 'Straight Flush', mult: 50 };
  if (countVals[0] === 4) return { name: 'Four of a Kind', mult: 25 };
  if (countVals[0] === 3 && countVals[1] === 2) return { name: 'Full House', mult: 9 };
  if (isFlush) return { name: 'Flush', mult: 6 };
  if (isStraight) return { name: 'Straight', mult: 4 };
  if (countVals[0] === 3) return { name: 'Three of a Kind', mult: 3 };
  if (countVals[0] === 2 && countVals[1] === 2) return { name: 'Two Pair', mult: 2 };
  if (countVals[0] === 2) {
    const pair = Object.entries(counts).find(([_, c]) => c === 2)?.[0];
    if (['J', 'Q', 'K', 'A'].includes(pair)) return { name: 'Jacks or Better', mult: 1 };
  }
  return { name: 'No Win', mult: 0 };
};

const Card = ({ card, held, onToggle, canHold }) => {
  const isRed = card?.suit === '♥' || card?.suit === '♦';
  return (
    <button
      onClick={canHold ? onToggle : undefined}
      className={`relative transition-all ${canHold ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className={`w-20 h-28 rounded-xl flex flex-col items-center justify-center shadow-xl transition-all ${
        isRed ? 'bg-white text-red-600' : 'bg-white text-gray-900'
      } ${held ? 'ring-4 ring-yellow-400 -translate-y-2' : ''}`}>
        <span className="font-black text-3xl">{card?.value}</span>
        <span className="text-xl">{card?.suit}</span>
      </div>
      {held && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded">
          HELD
        </div>
      )}
    </button>
  );
};

export default function VideoPokerGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [cards, setCards] = useState([]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, holding, ended
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const deal = useCallback(() => {
    if (bet <= 0 || bet > state.balance) return;
    if (!placeBet(bet, 'videopoker')) return;

    audio.playBet();
    setResult(null);
    setHeld([false, false, false, false, false]);

    const newCards = [getCard(), getCard(), getCard(), getCard(), getCard()];
    setCards(newCards);
    setGamePhase('holding');
  }, [bet, state.balance, placeBet]);

  const draw = useCallback(() => {
    if (gamePhase !== 'holding') return;

    const newCards = cards.map((c, i) => held[i] ? c : getCard());
    setCards(newCards);

    const hand = evaluateHand(newCards);
    const winAmount = bet * hand.mult;

    setResult(hand);
    setHistory(h => [{ name: hand.name, won: hand.mult > 0 }, ...h.slice(0, 4)]);
    setGamePhase('ended');

    if (hand.mult > 0) {
      addWin(winAmount, bet, 'videopoker', hand.mult);
      audio.playWin();
    } else {
      addWin(0, bet, 'videopoker', 0);
      audio.playLose();
    }
  }, [gamePhase, cards, held, bet, addWin]);

  const toggleHold = (idx) => {
    if (gamePhase !== 'holding') return;
    const newHeld = [...held];
    newHeld[idx] = !newHeld[idx];
    setHeld(newHeld);
  };

  const newGame = () => {
    setCards([]);
    setHeld([false, false, false, false, false]);
    setGamePhase('betting');
    setResult(null);
  };

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0a1a1a] rounded-2xl p-5 flex flex-col">
        {/* Paytable */}
        <div className="bg-black/40 rounded-xl p-3 mb-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
            {HANDS.map(h => (
              <div key={h.name} className={`flex justify-between group relative cursor-help ${result?.name === h.name ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                <span className="hover:text-gray-300 transition-colors">{h.name}</span>
                <span className="text-green-400">{h.mult}x</span>
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 w-48 z-10">
                  {HAND_EXPLANATIONS[h.name]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-3">
            {cards.length > 0 ? (
              cards.map((card, i) => (
                <Card
                  key={i}
                  card={card}
                  held={held[i]}
                  onToggle={() => toggleHold(i)}
                  canHold={gamePhase === 'holding'}
                />
              ))
            ) : (
              Array(5).fill(null).map((_, i) => (
                <div key={i} className="w-20 h-28 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50" />
              ))
            )}
          </div>
        </div>

        {/* Instruction */}
        {gamePhase === 'holding' && (
          <div className="text-center text-yellow-400 text-sm font-bold mb-2">
            Click cards to HOLD, then DRAW
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`text-center py-3 rounded-xl ${result.mult > 0 ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
            <span className={`text-2xl font-black ${result.mult > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.name} {result.mult > 0 ? `→ +$${(bet * result.mult - bet).toFixed(2)}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 flex flex-col gap-4">
          {/* Bet Amount */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Bet Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                disabled={gamePhase !== 'betting'}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleBetChange(1)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">MAX</button>
            </div>
          </div>

          {/* Quick Bet */}
          <div className="grid grid-cols-3 gap-2">
            {[10, 25, 50, 100, 250, 500].map(v => (
              <button
                key={v}
                onClick={() => handleBetChange(v)}
                disabled={gamePhase !== 'betting'}
                className={`py-2 rounded-lg text-sm font-bold ${bet === v ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                ${v}
              </button>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1">
              {history.slice(0, 4).map((h, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded group relative cursor-help ${h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {h.name}
                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 w-40 z-10">
                    {h.won ? HAND_EXPLANATIONS['win'] : HAND_EXPLANATIONS['lose']}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {gamePhase === 'betting' ? (
            <div className="mt-auto">
              <BettingButton
                balance={state.balance}
                betAmount={bet}
                onClick={deal}
                label="DEAL"
                loadingText="DEALING..."
                className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-green-500/30"
              />
            </div>
          ) : gamePhase === 'holding' ? (
            <button
              onClick={draw}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-xl mt-auto shadow-lg shadow-yellow-500/30 animate-pulse"
            >
              DRAW
            </button>
          ) : (
            <button
              onClick={newGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black text-xl mt-auto shadow-lg shadow-cyan-500/30"
            >
              NEW GAME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
