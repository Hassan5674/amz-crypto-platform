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
    rank: idx + 2
  };
};

const evaluateHand = (cards: any[]) => {
  const ranks = cards.map((c: any) => Number(c.rank)).sort((a: number, b: number) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) ||
    (ranks.join(',') === '14,3,2'); // A-2-3

  const counts: Record<string, number> = {};
  cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
  const countVals = (Object.values(counts) as number[]).sort((a, b) => b - a);

  if (isStraight && isFlush) return { name: 'Straight Flush', rank: 8 };
  if (countVals[0] === 3) return { name: 'Three of a Kind', rank: 7 };
  if (isStraight) return { name: 'Straight', rank: 6 };
  if (isFlush) return { name: 'Flush', rank: 5 };
  if (countVals[0] === 2) return { name: 'Pair', rank: 4 };
  return { name: 'High Card', rank: 3, high: Math.max(...ranks) };
};

const compareHands = (player, dealer) => {
  const pHand = evaluateHand(player);
  const dHand = evaluateHand(dealer);

  if (pHand.rank > dHand.rank) return 1;
  if (pHand.rank < dHand.rank) return -1;

  // Same rank - compare high cards
  const pRanks = player.map(c => c.rank).sort((a, b) => b - a);
  const dRanks = dealer.map(c => c.rank).sort((a, b) => b - a);

  for (let i = 0; i < 3; i++) {
    if (pRanks[i] > dRanks[i]) return 1;
    if (pRanks[i] < dRanks[i]) return -1;
  }
  return 0;
};

// Payouts for Pair Plus side bet
const PAIR_PLUS_PAYOUTS = {
  'Straight Flush': 40,
  'Three of a Kind': 30,
  'Straight': 6,
  'Flush': 3,
  'Pair': 1
};

// Wyjaśnienia kombinacji
const HAND_EXPLANATIONS = {
  'Straight Flush': 'Three cards of the same suit in sequence (e.g., 5♠ 6♠ 7♠)',
  'Three of a Kind': 'Three cards of the same rank (e.g., K♠ K♥ K♦)',
  'Straight': 'Three cards in sequence of different suits (e.g., 5♠ 6♥ 7♦)',
  'Flush': 'Three cards of the same suit (e.g., 3♠ 9♠ K♠)',
  'Pair': 'Two cards of the same rank (e.g., Q♥ Q♦ 5♠)',
  'High Card': 'None of the above combinations - outcome depends on highest card',
  'dealer_dnq': 'Dealer did not qualify (must have at least a Queen)',
  'win': 'You win! Your hand is better',
  'lose': 'You lose. Dealer had a better hand',
  'tie': 'Tie! Both hands are equal',
  'fold': 'You fold. The ante bet is lost'
};

const Card = ({ card, hidden = false }: { card: any; hidden?: boolean }) => {
  if (hidden) {
    return (
      <div className="w-20 h-28 rounded-xl bg-gradient-to-br from-purple-900 to-purple-950 flex items-center justify-center shadow-xl border-2 border-purple-700">
        <span className="text-4xl text-purple-400">?</span>
      </div>
    );
  }
  const isRed = card?.suit === '♥' || card?.suit === '♦';
  return (
    <div className={`w-20 h-28 rounded-xl flex flex-col items-center justify-center shadow-xl ${
      isRed ? 'bg-white text-red-600' : 'bg-white text-gray-900'
    }`}>
      <span className="font-black text-3xl">{card?.value}</span>
      <span className="text-xl">{card?.suit}</span>
    </div>
  );
};

export default function ThreeCardPokerGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [anteBet, setAnteBet] = useState(state.globalBet || 10);
  const [pairPlusBet, setPairPlusBet] = useState(0);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, decision, ended
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const deal = useCallback(() => {
    const totalBet = anteBet + pairPlusBet;
    if (totalBet <= 0 || totalBet > state.balance) return;
    if (!placeBet(totalBet, 'threecardpoker')) return;

    audio.playBet();
    setResult(null);

    const pCards = [getCard(), getCard(), getCard()];
    const dCards = [getCard(), getCard(), getCard()];

    setPlayerCards(pCards);
    setDealerCards(dCards);
    setGamePhase('decision');
  }, [anteBet, pairPlusBet, state.balance, placeBet]);

  const play = useCallback(() => {
    if (gamePhase !== 'decision') return;
    if (!placeBet(anteBet, 'threecardpoker')) return; // Play bet = ante

    evaluateGame(true);
  }, [gamePhase, anteBet, placeBet]);

  const fold = useCallback(() => {
    if (gamePhase !== 'decision') return;

    // Check Pair Plus before folding
    let totalWin = 0;
    const pHand = evaluateHand(playerCards);

    if (pairPlusBet > 0 && PAIR_PLUS_PAYOUTS[pHand.name]) {
      totalWin = pairPlusBet * (PAIR_PLUS_PAYOUTS[pHand.name] + 1);
    }

    const totalBet = anteBet + pairPlusBet;
    const result = {
      outcome: 'fold',
      pHand,
      dHand: null,
      anteWin: 0,
      playWin: 0,
      pairPlusWin: totalWin,
      totalWin,
      profit: totalWin - totalBet
    };

    setResult(result);
    setHistory(h => [{ outcome: 'fold', won: totalWin > totalBet }, ...h.slice(0, 4)]);
    setGamePhase('ended');

    if (totalWin > 0) {
      addWin(totalWin, totalBet, 'threecardpoker', totalWin / totalBet);
      audio.playWin();
    } else {
      addWin(0, totalBet, 'threecardpoker', 0);
      audio.playLose();
    }
  }, [gamePhase, playerCards, anteBet, pairPlusBet, addWin]);

  const evaluateGame = (played) => {
    const pHand = evaluateHand(playerCards);
    const dHand = evaluateHand(dealerCards);

    let totalWin = 0;
    let outcome = '';

    // Pair Plus payout (always pays regardless of dealer)
    if (pairPlusBet > 0 && PAIR_PLUS_PAYOUTS[pHand.name]) {
      totalWin += pairPlusBet * (PAIR_PLUS_PAYOUTS[pHand.name] + 1);
    }

    // Check if dealer qualifies (Q high or better)
    const dealerQualifies = dHand.rank >= 4 || (dHand.rank === 3 && dHand.high >= 12);

    if (!dealerQualifies) {
      // Dealer doesn't qualify - ante pays 1:1, play pushes
      outcome = 'dealer_dnq';
      totalWin += anteBet * 2; // Return ante + win
    } else {
      // Compare hands
      const comparison = compareHands(playerCards, dealerCards);

      if (comparison > 0) {
        // Player wins
        outcome = 'win';
        totalWin += anteBet * 2; // Ante pays 1:1
        totalWin += anteBet * 2; // Play pays 1:1
      } else if (comparison < 0) {
        // Dealer wins
        outcome = 'lose';
      } else {
        // Tie - push
        outcome = 'tie';
        totalWin += anteBet * 2; // Return both bets
      }
    }

    const result = {
      outcome,
      pHand,
      dHand,
      dealerQualifies,
      totalWin,
      profit: totalWin - (anteBet * 2 + pairPlusBet)
    };

    setResult(result);
    setHistory(h => [{ outcome, won: totalWin > anteBet * 2 + pairPlusBet }, ...h.slice(0, 4)]);
    setGamePhase('ended');

    if (totalWin > 0) {
      addWin(totalWin, anteBet * 2 + pairPlusBet, 'threecardpoker', totalWin / (anteBet * 2 + pairPlusBet));
      if (totalWin > anteBet * 2 + pairPlusBet) audio.playWin(); else audio.playLose();
    } else {
      addWin(0, anteBet * 2 + pairPlusBet, 'threecardpoker', 0);
      audio.playLose();
    }
  };

  const newGame = () => {
    setPlayerCards([]);
    setDealerCards([]);
    setGamePhase('betting');
    setResult(null);
  };

  const handleAnteBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setAnteBet(v);
    setGlobalBet(v);
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#0f0a1a] rounded-2xl p-5 flex flex-col">
        {/* Dealer Cards */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-sm text-gray-500 uppercase mb-3 font-bold">
            Dealer {result && `(${result.dHand?.name || 'Hidden'})`}
          </span>
          <div className="flex gap-3">
            {dealerCards.length > 0 ? (
              dealerCards.map((c, i) => (
                <Card key={i} card={c} hidden={gamePhase === 'decision'} />
              ))
            ) : (
              Array(3).fill(null).map((_, i) => (
                <div key={i} className="w-20 h-28 rounded-xl border-2 border-dashed border-gray-700" />
              ))
            )}
          </div>
          {result?.dealerQualifies === false && (
            <div className="mt-2 text-yellow-400 text-sm font-bold">DEALER DOES NOT QUALIFY</div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`text-center py-3 rounded-xl mb-4 ${
            result.profit > 0 ? 'bg-green-900/50' : result.profit === 0 ? 'bg-gray-700/50' : 'bg-red-900/50'
          }`}>
            <span className={`text-xl font-black ${
              result.profit > 0 ? 'text-green-400' : result.profit === 0 ? 'text-gray-300' : 'text-red-400'
            }`}>
              {result.outcome === 'win' ? 'YOU WIN!' :
               result.outcome === 'lose' ? 'DEALER WINS' :
               result.outcome === 'tie' ? 'TIE' :
               result.outcome === 'dealer_dnq' ? 'DEALER DNQ - ANTE PAYS' :
               'FOLDED'}
              {result.profit !== 0 ? ` ${result.profit > 0 ? '+' : ''}$${result.profit.toFixed(2)}` : ''}
            </span>
          </div>
        )}

        {/* Player Cards */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex gap-3">
            {playerCards.length > 0 ? (
              playerCards.map((c, i) => <Card key={i} card={c} />)
            ) : (
              Array(3).fill(null).map((_, i) => (
                <div key={i} className="w-20 h-28 rounded-xl border-2 border-dashed border-gray-700" />
              ))
            )}
          </div>
          <span className="text-sm text-gray-500 uppercase mt-3 font-bold">
            You {playerCards.length > 0 && `(${evaluateHand(playerCards).name})`}
          </span>
        </div>
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 border border-purple-500/20 shadow-lg shadow-purple-500/10 flex flex-col gap-3">
          {/* Ante Bet */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Ante Bet (Required)</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={anteBet}
                onChange={(e) => handleAnteBetChange(Number(e.target.value))}
                disabled={gamePhase !== 'betting'}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button onClick={() => handleAnteBetChange(1)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">MIN</button>
              <button onClick={() => handleAnteBetChange(anteBet / 2)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">½</button>
              <button onClick={() => handleAnteBetChange(anteBet * 2)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">2x</button>
              <button onClick={() => handleAnteBetChange(state.balance / 3)} disabled={gamePhase !== 'betting'} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 rounded-xl transition-all transform hover:scale-105 text-sm font-bold">MAX</button>
            </div>
          </div>

          {/* Pair Plus Bet */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">Pair Plus (Optional)</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[0, 5, 10, 25].map(v => (
                <button
                  key={v}
                  onClick={() => setPairPlusBet(v)}
                  disabled={gamePhase !== 'betting'}
                  className={`py-2 rounded-lg text-sm font-bold ${
                    pairPlusBet === v ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {v === 0 ? 'OFF' : `$${v}`}
                </button>
              ))}
            </div>
          </div>

          {/* Pair Plus Paytable */}
          <div className="bg-black/30 rounded-xl p-2 text-xs">
            <div className="text-gray-500 uppercase mb-1 font-bold">Pair Plus Pays</div>
            {Object.entries(PAIR_PLUS_PAYOUTS).map(([hand, mult]) => (
              <div key={hand} className="flex justify-between text-gray-400 group relative cursor-help">
                <span className="hover:text-gray-300 transition-colors">{hand}</span>
                <span className="text-green-400">{mult}:1</span>
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 w-48 z-10">
                  {HAND_EXPLANATIONS[hand]}
                </div>
              </div>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {history.map((h, i) => (
                <div key={i} className="group relative">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-help block ${
                    h.won ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {h.outcome}
                  </span>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 w-40 z-10 whitespace-normal">
                    {HAND_EXPLANATIONS[h.outcome] || h.outcome}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {gamePhase === 'betting' ? (
            <div className="mt-auto">
              <BettingButton
                balance={state.balance}
                betAmount={anteBet + pairPlusBet}
                onClick={deal}
                label="DEAL"
                loadingText="DEALING..."
                className="py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg"
              />
            </div>
          ) : gamePhase === 'decision' ? (
            <div className="flex gap-2 mt-auto">
              <button
                onClick={fold}
                className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xl"
              >
                FOLD
              </button>
              <button
                onClick={play}
                disabled={anteBet > state.balance}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl disabled:opacity-50"
              >
                PLAY +${anteBet}
              </button>
            </div>
          ) : (
            <button
              onClick={newGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-xl mt-auto shadow-lg"
            >
              NEW GAME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
