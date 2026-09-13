import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const OUTCOME_EXPLANATIONS = {
  'player': 'Player wins - their hand had a higher value than the banker',
  'banker': 'Banker wins - their hand had a higher value than the player',
  'tie': 'Tie - both hands had the same value (baccarat)',
  'playerPair': 'Player wins with bonus payout for a pair',
  'bankerPair': 'Banker wins with bonus payout for a pair'
};

const getCard = () => ({
  suit: SUITS[Math.floor(Math.random() * 4)],
  value: VALUES[Math.floor(Math.random() * 13)],
  idx: Math.floor(Math.random() * 13)
});

const cardValue = (card) => {
  if (!card) return 0;
  if (['10', 'J', 'Q', 'K'].includes(card.value)) return 0;
  if (card.value === 'A') return 1;
  return parseInt(card.value);
};

const handValue = (cards) => {
  if (!cards || cards.length === 0) return 0;
  return cards.reduce((sum, c) => sum + cardValue(c), 0) % 10;
};

const Card = ({ card }) => {
  if (!card) return null;
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div className={`w-20 h-28 rounded-xl flex flex-col items-center justify-center shadow-2xl transition-all hover:scale-105 ${
      isRed ? 'bg-gradient-to-br from-white to-gray-100 text-red-600' : 'bg-gradient-to-br from-white to-gray-100 text-gray-900'
    }`}>
      <span className="font-black text-3xl">{card.value}</span>
      <span className="text-xl">{card.suit}</span>
    </div>
  );
};

export default function BaccaratGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [betType, setBetType] = useState('player');
  const [playerCards, setPlayerCards] = useState([]);
  const [bankerCards, setBankerCards] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Admin cheats
  const baccaratCheats = state.adminSettings?.gameSettings?.baccarat || {};
  const godMode = state.adminSettings?.godMode;

  const MULTIPLIERS = { player: 2, banker: 1.95, tie: 9, playerPair: 12, bankerPair: 12 };

  // Generate cards that will win for a specific outcome
  const getWinningCards = (outcome) => {
    if (outcome === 'player') {
      // Player wins with 9 vs 0
      return {
        pCards: [
          { suit: '♠', value: '9', idx: 8 },
          { suit: '♥', value: '10', idx: 9 }
        ],
        bCards: [
          { suit: '♦', value: '10', idx: 9 },
          { suit: '♣', value: '10', idx: 9 }
        ]
      };
    } else {
      // Banker wins with 9 vs 0
      return {
        pCards: [
          { suit: '♠', value: '10', idx: 9 },
          { suit: '♥', value: '10', idx: 9 }
        ],
        bCards: [
          { suit: '♦', value: '9', idx: 8 },
          { suit: '♣', value: '10', idx: 9 }
        ]
      };
    }
  };

  const play = useCallback(() => {
    if (bet <= 0 || bet > state.balance || gamePhase !== 'betting') return;
    if (!placeBet(bet, 'baccarat')) return;

    setResult(null);
    setGamePhase('dealing');
    audio.playBet();

    let pCards, bCards;

    // Admin cheat: force win
    if (godMode || baccaratCheats.forcePlayerWin || baccaratCheats.forceBankerWin) {
      const forceWinner = godMode
        ? (betType === 'player' ? 'player' : 'banker')
        : baccaratCheats.forcePlayerWin ? 'player' : 'banker';
      const rigged = getWinningCards(forceWinner);
      pCards = rigged.pCards;
      bCards = rigged.bCards;
    } else {
      pCards = [getCard(), getCard()];
      bCards = [getCard(), getCard()];
    }

    setPlayerCards(pCards);
    setBankerCards(bCards);

    const delay = state.settings.fastMode ? 300 : 600;

    setTimeout(() => {
      let finalP = [...pCards];
      let finalB = [...bCards];
      const pVal = handValue(pCards);
      const bVal = handValue(bCards);

      // Natural - no more cards
      if (pVal >= 8 || bVal >= 8) {
        determineWinner(finalP, finalB);
        return;
      }

      // Player third card rules
      let playerThird = null;
      if (pVal <= 5) {
        playerThird = getCard();
        finalP = [...finalP, playerThird];
        setPlayerCards(finalP);
      }

      setTimeout(() => {
        // Banker third card rules
        if (playerThird === null) {
          if (bVal <= 5) {
            const bankerThird = getCard();
            finalB = [...finalB, bankerThird];
            setBankerCards(finalB);
          }
        } else {
          const pThirdVal = cardValue(playerThird);
          let bankerDraws = false;

          if (bVal <= 2) bankerDraws = true;
          else if (bVal === 3 && pThirdVal !== 8) bankerDraws = true;
          else if (bVal === 4 && [2, 3, 4, 5, 6, 7].includes(pThirdVal)) bankerDraws = true;
          else if (bVal === 5 && [4, 5, 6, 7].includes(pThirdVal)) bankerDraws = true;
          else if (bVal === 6 && [6, 7].includes(pThirdVal)) bankerDraws = true;

          if (bankerDraws) {
            const bankerThird = getCard();
            finalB = [...finalB, bankerThird];
            setBankerCards(finalB);
          }
        }

        setTimeout(() => determineWinner(finalP, finalB), delay);
      }, delay);
    }, delay);
  }, [bet, state.balance, gamePhase, betType, state.settings.fastMode, placeBet]);

  const determineWinner = (pCards, bCards) => {
    const pVal = handValue(pCards);
    const bVal = handValue(bCards);

    let outcome, mult;
    if (pVal > bVal) {
      outcome = 'player';
      mult = betType === 'player' ? MULTIPLIERS.player : 0;
    } else if (bVal > pVal) {
      outcome = 'banker';
      mult = betType === 'banker' ? MULTIPLIERS.banker : 0;
    } else {
      outcome = 'tie';
      mult = betType === 'tie' ? MULTIPLIERS.tie : 0;
    }

    // Check pairs
    if (betType === 'playerPair' && pCards[0]?.value === pCards[1]?.value) {
      mult = MULTIPLIERS.playerPair;
    }
    if (betType === 'bankerPair' && bCards[0]?.value === bCards[1]?.value) {
      mult = MULTIPLIERS.bankerPair;
    }

    const won = mult > 0;
    const winAmount = won ? bet * mult : 0;
    const profit = winAmount - bet;

    setResult({ outcome, won, mult: won ? mult : 0, profit, pVal, bVal });
    setHistory(h => [{ outcome, won, betType }, ...h.slice(0, 4)]);
    setGamePhase('ended');

    if (won) {
      addWin(winAmount, bet, 'baccarat', mult);
      audio.playWin();
    } else {
      addWin(0, bet, 'baccarat', 0);
      audio.playLose();
    }
  };

  const newGame = () => {
    setPlayerCards([]);
    setBankerCards([]);
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
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0f0a1a] rounded-2xl p-6 flex flex-col">
        {/* Title */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-black bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
            BACCARAT
          </h2>
        </div>

        {/* Banker */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg text-red-400 uppercase font-bold">Banker</span>
            {bankerCards.length > 0 && (
              <span className="bg-red-900/50 px-4 py-2 rounded-full text-2xl font-black text-red-400">{handValue(bankerCards)}</span>
            )}
          </div>
          <div className="flex gap-3">
            {bankerCards.length > 0 ? (
              bankerCards.map((c, i) => <Card key={i} card={c} />)
            ) : (
              <div className="w-20 h-28 border-2 border-dashed border-red-900/50 rounded-xl" />
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`text-center py-4 rounded-2xl my-3 ${
            result.won ? 'bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-2 border-green-500/50' :
            'bg-gradient-to-r from-red-900/60 to-rose-900/60 border-2 border-red-500/50'
          }`}>
            <span className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.outcome.toUpperCase()} WINS! ({result.pVal} vs {result.bVal})
              {result.won ? ` +$${result.profit.toFixed(2)}` : ` -$${bet.toFixed(2)}`}
            </span>
          </div>
        )}

        {/* Player */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex gap-3">
            {playerCards.length > 0 ? (
              playerCards.map((c, i) => <Card key={i} card={c} />)
            ) : (
              <div className="w-20 h-28 border-2 border-dashed border-blue-900/50 rounded-xl" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-lg text-blue-400 uppercase font-bold">Player</span>
            {playerCards.length > 0 && (
              <span className="bg-blue-900/50 px-4 py-2 rounded-full text-2xl font-black text-blue-400">{handValue(playerCards)}</span>
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="flex justify-center gap-2 mt-3">
            {history.map((h, i) => (
              <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black group relative cursor-help transition-all hover:scale-110 ${
                h.outcome === 'player' ? 'bg-blue-600 text-white' :
                h.outcome === 'banker' ? 'bg-red-600 text-white' :
                'bg-green-600 text-white'
              }`}>
                {h.outcome[0].toUpperCase()}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 w-48 z-10 text-center whitespace-normal font-normal">
                  {OUTCOME_EXPLANATIONS[h.outcome] || h.outcome}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-purple-500/20 shadow-lg shadow-purple-500/10">
          {/* Main Bets */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Main Bet</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <button
                onClick={() => gamePhase === 'betting' && setBetType('player')}
                disabled={gamePhase !== 'betting'}
                className={`py-4 rounded-xl font-black transition-all ${
                  betType === 'player'
                    ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'bg-gray-800 text-blue-400 hover:bg-gray-700'
                }`}
              >
                PLAYER
                <div className="text-xs opacity-70 mt-1">2x</div>
              </button>
              <button
                onClick={() => gamePhase === 'betting' && setBetType('tie')}
                disabled={gamePhase !== 'betting'}
                className={`py-4 rounded-xl font-black transition-all ${
                  betType === 'tie'
                    ? 'bg-gradient-to-b from-green-500 to-green-700 text-white shadow-lg shadow-green-500/30 scale-105'
                    : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                }`}
              >
                TIE
                <div className="text-xs opacity-70 mt-1">9x</div>
              </button>
              <button
                onClick={() => gamePhase === 'betting' && setBetType('banker')}
                disabled={gamePhase !== 'betting'}
                className={`py-4 rounded-xl font-black transition-all ${
                  betType === 'banker'
                    ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg shadow-red-500/30 scale-105'
                    : 'bg-gray-800 text-red-400 hover:bg-gray-700'
                }`}
              >
                BANKER
                <div className="text-xs opacity-70 mt-1">1.95x</div>
              </button>
            </div>
          </div>

          {/* Side Bets */}
          <div>
            <label className="text-sm text-gray-400 uppercase font-bold">Side Bets</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => gamePhase === 'betting' && setBetType('playerPair')}
                disabled={gamePhase !== 'betting'}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  betType === 'playerPair'
                    ? 'bg-gradient-to-b from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Player Pair
                <div className="text-xs text-green-400 mt-1">12x</div>
              </button>
              <button
                onClick={() => gamePhase === 'betting' && setBetType('bankerPair')}
                disabled={gamePhase !== 'betting'}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  betType === 'bankerPair'
                    ? 'bg-gradient-to-b from-red-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Banker Pair
                <div className="text-xs text-green-400 mt-1">12x</div>
              </button>
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
                disabled={gamePhase !== 'betting'}
                className="w-full bg-black/50 border-2 border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <button onClick={() => handleBetChange(1)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2 text-sm font-bold rounded-lg">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2 text-sm font-bold rounded-lg">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2 text-sm font-bold rounded-lg">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2 text-sm font-bold rounded-lg">MAX</button>
            </div>
          </div>

          {/* Potential Win */}
          <div className="bg-black/30 rounded-xl p-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Potential Win</span>
              <span className="text-green-400 font-black text-2xl">${(bet * MULTIPLIERS[betType]).toFixed(2)}</span>
            </div>
          </div>

          {/* Play Button */}
          {gamePhase === 'betting' ? (
            <div className="mt-auto">
              <BettingButton
                balance={state.balance}
                betAmount={bet}
                onClick={play}
                label="DEAL CARDS"
                loadingText="DEALING..."
                className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-purple-500/30"
              />
            </div>
          ) : gamePhase === 'dealing' ? (
            <button disabled className="w-full py-4 rounded-xl bg-gray-700 text-gray-400 font-black text-lg mt-auto">
              DEALING...
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
