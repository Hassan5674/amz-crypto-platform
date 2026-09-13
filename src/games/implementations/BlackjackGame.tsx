import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const OUTCOME_EXPLANATIONS = {
  'blackjack': 'Blackjack! First two cards are an Ace + a 10-value card',
  'win': 'You win! Your hand is higher than the dealer without exceeding 21',
  'push': 'Tie - both hands have the same value',
  'lose': 'You lose - dealer has a higher value or you busted over 21',
  'dealer_bust': 'You win! The dealer busted (exceeded 21)'
};

const getCard = () => ({
  suit: SUITS[Math.floor(Math.random() * 4)],
  value: VALUES[Math.floor(Math.random() * 13)],
  idx: Math.floor(Math.random() * 13)
});

// Get blackjack cards (Ace + 10-value card)
const getBlackjackCards = () => {
  const ace = { suit: SUITS[Math.floor(Math.random() * 4)], value: 'A', idx: 0 };
  const tenVal = ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)];
  const ten = { suit: SUITS[Math.floor(Math.random() * 4)], value: tenVal, idx: VALUES.indexOf(tenVal) };
  return Math.random() > 0.5 ? [ace, ten] : [ten, ace];
};

// Get bust cards for dealer (total > 21)
const getBustCards = () => {
  const tenVal1 = ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)];
  const tenVal2 = ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)];
  const card1 = { suit: SUITS[Math.floor(Math.random() * 4)], value: tenVal1, idx: VALUES.indexOf(tenVal1) };
  const card2 = { suit: SUITS[Math.floor(Math.random() * 4)], value: tenVal2, idx: VALUES.indexOf(tenVal2) };
  return [card1, card2];
};

const calcValue = (cards) => {
  if (!cards || cards.length === 0) return 0;
  let val = 0, aces = 0;
  cards.forEach(c => {
    if (!c) return;
    if (c.value === 'A') { val += 11; aces++; }
    else if (['K', 'Q', 'J'].includes(c.value)) val += 10;
    else val += parseInt(c.value);
  });
  while (val > 21 && aces > 0) { val -= 10; aces--; }
  return val;
};

const Card = ({ card, hidden = false }: { card?: { suit: string; value: string }; hidden?: boolean }) => {
  if (hidden) {
    return (
      <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-950 flex items-center justify-center shadow-2xl border-2 border-amber-400/40 relative overflow-hidden group">
        <div className="absolute inset-2 border border-dashed border-amber-400/30 rounded-lg sm:rounded-xl flex items-center justify-center bg-blue-950/40">
          <div className="w-8 h-8 rounded-full border border-amber-400/50 flex items-center justify-center">
            <span className="text-amber-300/80 font-black text-xs font-serif">AMZ</span>
          </div>
        </div>
      </div>
    );
  }
  const isRed = card?.suit === '♥' || card?.suit === '♦';
  return (
    <div className={`w-20 h-28 sm:w-24 sm:h-36 rounded-xl sm:rounded-2xl flex flex-col justify-between p-2 sm:p-2.5 shadow-2xl transition-all hover:scale-105 border border-slate-200/90 select-none bg-white ${
      isRed ? 'text-red-600' : 'text-slate-900'
    }`}>
      <div className="flex flex-col items-start leading-none">
        <span className="font-black text-base sm:text-lg font-serif">{card?.value}</span>
        <span className="text-xs sm:text-sm">{card?.suit}</span>
      </div>
      <div className="flex items-center justify-center">
        <span className="text-2xl sm:text-4xl font-serif">{card?.suit}</span>
      </div>
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="font-black text-base sm:text-lg font-serif">{card?.value}</span>
        <span className="text-xs sm:text-sm">{card?.suit}</span>
      </div>
    </div>
  );
};

export default function BlackjackGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [splitHand, setSplitHand] = useState([]);
  const [activeHand, setActiveHand] = useState(0);
  const [gamePhase, setGamePhase] = useState('betting');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Admin cheats
  const blackjackCheats = state.adminSettings?.gameSettings?.blackjack || {};
  const godMode = state.adminSettings?.godMode;

  const canSplit = playerCards.length === 2 &&
    playerCards[0]?.value === playerCards[1]?.value &&
    splitHand.length === 0 &&
    bet <= state.balance;

  const canDouble = (gamePhase === 'playing' && playerCards.length === 2) ||
    (gamePhase === 'playing_split' && activeHand === 1 && splitHand.length === 2);

  const deal = useCallback(() => {
    if (bet <= 0 || bet > state.balance) return;
    if (!placeBet(bet, 'blackjack')) return;

    audio.playBet();
    setResult(null);
    setSplitHand([]);
    setActiveHand(0);

    // Admin cheats
    let pCards, dCards;
    if (blackjackCheats.alwaysBlackjack || godMode) {
      pCards = getBlackjackCards();
      dCards = [getCard(), getCard()];
    } else if (blackjackCheats.dealerBust) {
      pCards = [getCard(), getCard()];
      dCards = getBustCards();
    } else {
      pCards = [getCard(), getCard()];
      dCards = [getCard(), getCard()];
    }

    setPlayerCards(pCards);
    setDealerCards(dCards);

    const pVal = calcValue(pCards);
    if (pVal === 21) {
      const dVal = calcValue(dCards);
      if (dVal === 21) {
        // Both have blackjack - push
        endGame({ outcome: 'push', mult: 1 }, null, dCards);
      } else {
        // Player blackjack wins 2.5x
        endGame({ outcome: 'blackjack', mult: 2.5 }, null, dCards);
      }
    } else {
      setGamePhase('playing');
    }
  }, [bet, state.balance, placeBet]);

  const hit = useCallback(() => {
    if (gamePhase !== 'playing' && gamePhase !== 'playing_split') return;

    const newCard = getCard();

    if (gamePhase === 'playing_split' && activeHand === 1) {
      const newSplit = [...splitHand, newCard];
      setSplitHand(newSplit);
      const newSplitVal = calcValue(newSplit);
      if (newSplitVal >= 21) {
        setActiveHand(0);
        setGamePhase('playing');
      }
    } else {
      const newCards = [...playerCards, newCard];
      setPlayerCards(newCards);
      audio.playClick();

      const newVal = calcValue(newCards);
      if (newVal > 21) {
        if (splitHand.length > 0 && activeHand === 0) {
          playDealer(newCards, splitHand);
        } else {
          endGame({ outcome: 'bust', mult: 0 }, null, dealerCards, newCards, splitHand);
        }
      } else if (newVal === 21) {
        // Auto-stand on 21
        if (splitHand.length > 0 && activeHand === 0) {
          playDealer(newCards, splitHand);
        } else {
          playDealer(newCards, splitHand);
        }
      }
    }
  }, [gamePhase, playerCards, dealerCards, splitHand, activeHand]);

  const stand = useCallback(() => {
    if (gamePhase !== 'playing' && gamePhase !== 'playing_split') return;

    if (gamePhase === 'playing_split' && activeHand === 1) {
      setActiveHand(0);
      setGamePhase('playing');
      // Check if main hand also has 21, if so auto-stand
      if (calcValue(playerCards) === 21) {
        setTimeout(() => playDealer(playerCards, splitHand), 100);
      }
    } else {
      playDealer(playerCards, splitHand);
    }
  }, [gamePhase, activeHand, playerCards, splitHand]);

  const double = useCallback(() => {
    if (!canDouble || bet > state.balance) return;
    if (!placeBet(bet, 'blackjack')) return;

    const newCard = getCard();
    audio.playBet();

    // Handle double on split hand
    if (gamePhase === 'playing_split' && activeHand === 1) {
      const newSplit = [...splitHand, newCard];
      setSplitHand(newSplit);
      // Move to main hand after doubling on split
      setActiveHand(0);
      setGamePhase('playing');
    } else {
      const newCards = [...playerCards, newCard];
      setPlayerCards(newCards);
      setBet(bet * 2);

      if (calcValue(newCards) > 21) {
        if (splitHand.length > 0) {
          // If we have split, still need to evaluate both hands
          playDealer(newCards, splitHand);
        } else {
          endGame({ outcome: 'bust', mult: 0 }, null, dealerCards, newCards, splitHand);
        }
      } else {
        playDealer(newCards, splitHand);
      }
    }
  }, [canDouble, gamePhase, playerCards, splitHand, dealerCards, activeHand, bet, state.balance, placeBet]);

  const split = useCallback(() => {
    if (!canSplit) return;
    if (!placeBet(bet, 'blackjack')) return;

    const card1 = playerCards[0];
    const card2 = playerCards[1];

    const newHand1 = [card1, getCard()];
    const newHand2 = [card2, getCard()];

    setPlayerCards(newHand1);
    setSplitHand(newHand2);

    // Check if either hand has 21
    const val1 = calcValue(newHand1);
    const val2 = calcValue(newHand2);

    if (val1 === 21 && val2 === 21) {
      // Both have 21, auto-stand
      playDealer(newHand1, newHand2);
    } else if (val2 === 21) {
      // Hand 2 has 21, move to hand 1
      setActiveHand(0);
      setGamePhase('playing');
    } else {
      // Normal split flow - start with hand 2
      setActiveHand(1);
      setGamePhase('playing_split');
    }

    audio.playBet();
  }, [canSplit, playerCards, bet, placeBet]);

  const playDealer = (pCards = playerCards, sCards = splitHand) => {
    setGamePhase('dealer');
    let dCards = [...dealerCards];

    const play = () => {
      if (calcValue(dCards) < 17) {
        dCards = [...dCards, getCard()];
        setDealerCards([...dCards]);
        setTimeout(play, state.settings.fastMode ? 200 : 400);
      } else {
        evaluateResults(dCards, pCards, sCards);
      }
    };
    setTimeout(play, state.settings.fastMode ? 200 : 400);
  };

  const evaluateResults = (dCards, pCards = playerCards, sCards = splitHand) => {
    const dVal = calcValue(dCards);

    // Calculate results for main hand
    const pVal = calcValue(pCards);
    let hand1Result = { outcome: 'lose', mult: 0 };

    if (pVal > 21) {
      hand1Result = { outcome: 'lose', mult: 0 };
    } else if (dVal > 21) {
      hand1Result = { outcome: 'win', mult: 2 };
    } else if (pVal > dVal) {
      hand1Result = { outcome: 'win', mult: 2 };
    } else if (pVal === dVal) {
      hand1Result = { outcome: 'push', mult: 1 };
    } else {
      hand1Result = { outcome: 'lose', mult: 0 };
    }

    // Calculate results for split hand if exists
    let hand2Result = null;
    if (sCards.length > 0) {
      const sVal = calcValue(sCards);

      if (sVal > 21) {
        hand2Result = { outcome: 'lose', mult: 0 };
      } else if (dVal > 21) {
        hand2Result = { outcome: 'win', mult: 2 };
      } else if (sVal > dVal) {
        hand2Result = { outcome: 'win', mult: 2 };
      } else if (sVal === dVal) {
        hand2Result = { outcome: 'push', mult: 1 };
      } else {
        hand2Result = { outcome: 'lose', mult: 0 };
      }
    }

    endGame(hand1Result, hand2Result, dCards, pCards, sCards);
  };

  const endGame = (hand1Result, hand2Result, dCards, pCards = playerCards, sCards = splitHand) => {
    setGamePhase('ended');

    let totalMult = hand1Result.mult;
    let totalBet = bet;

    if (hand2Result) {
      totalMult += hand2Result.mult;
      totalBet = bet * 2; // Split doubles the bet
    }

    const winAmount = bet * totalMult;
    const profit = winAmount - totalBet;

    // Determine overall outcome for display
    let overallOutcome;
    if (hand2Result) {
      const wins = (hand1Result.mult > 1 ? 1 : 0) + (hand2Result.mult > 1 ? 1 : 0);
      const pushes = (hand1Result.mult === 1 ? 1 : 0) + (hand2Result.mult === 1 ? 1 : 0);
      if (wins === 2) overallOutcome = 'win';
      else if (wins === 1 && pushes === 1) overallOutcome = 'win';
      else if (wins === 1) overallOutcome = 'partial';
      else if (pushes === 2) overallOutcome = 'push';
      else if (pushes === 1) overallOutcome = 'partial';
      else overallOutcome = 'lose';
    } else {
      overallOutcome = hand1Result.outcome;
    }

    setResult({
      outcome: overallOutcome,
      mult: totalMult,
      profit,
      pVal: calcValue(pCards),
      dVal: calcValue(dCards),
      hand1: hand1Result,
      hand2: hand2Result
    });
    setHistory(h => [{ outcome: overallOutcome, mult: totalMult.toFixed(1) }, ...h.slice(0, 3)]);

    if (profit > 0) {
      addWin(winAmount, totalBet, 'blackjack', totalMult / (hand2Result ? 2 : 1));
      audio.playWin();
    } else if (profit === 0) {
      addWin(winAmount, totalBet, 'blackjack', 1);
      audio.playBet();
    } else {
      addWin(winAmount, totalBet, 'blackjack', totalMult / (hand2Result ? 2 : 1));
      audio.playLose();
    }
  };

  const newGame = () => {
    setPlayerCards([]);
    setDealerCards([]);
    setSplitHand([]);
    setActiveHand(0);
    setGamePhase('betting');
    setResult(null);
    setBet(state.globalBet || bet);
  };

  const handleBetChange = (val: number) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const pVal = calcValue(playerCards);
  const sVal = calcValue(splitHand);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Game Table Area - LEFT */}
      <div className="flex-1 bg-[radial-gradient(ellipse_at_center,_#0f3d26_0%,_#092617_60%,_#04120b_100%)] rounded-3xl p-4 sm:p-6 flex flex-col justify-between border-4 border-amber-900/60 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_10px_40px_rgba(0,0,0,0.9)] relative overflow-hidden min-h-[460px]">
        {/* Golden felt arc decorative lines */}
        <div className="absolute inset-x-8 top-16 h-72 border-b-2 border-amber-400/20 rounded-[100%] pointer-events-none" />
        <div className="absolute inset-x-14 top-20 h-64 border-b border-dashed border-amber-400/15 rounded-[100%] pointer-events-none" />

        {/* Casino Table Branding */}
        <div className="text-center select-none pointer-events-none z-0 mt-1">
          <p className="text-[10px] sm:text-xs tracking-[0.25em] font-black uppercase text-amber-300/60 font-serif">
            AMZ DISTRIBUTORS CASINO ROYALE
          </p>
          <p className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-amber-200/40 font-semibold mt-0.5">
            BLACKJACK PAYS 3 TO 2 • DEALER STANDS ON 17 • INSURANCE PAYS 2 TO 1
          </p>
        </div>

        {/* Dealer Zone */}
        <div className="flex flex-col items-center justify-center my-auto z-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs sm:text-sm text-amber-200/70 uppercase tracking-widest font-black">Dealer</span>
            {(gamePhase === 'ended' || gamePhase === 'dealer') && (
              <span className="bg-black/70 border border-amber-400/30 px-3 py-1 rounded-full text-base sm:text-xl font-black text-amber-300 shadow-md">
                {calcValue(dealerCards)}
              </span>
            )}
          </div>
          {gamePhase === 'betting' ? (
            <div className="flex flex-col items-center justify-center opacity-60">
              <div className="flex gap-3 mb-2">
                <div className="w-20 h-28 sm:w-24 sm:h-36 border-2 border-dashed border-emerald-400/30 rounded-2xl flex items-center justify-center bg-emerald-950/20">
                  <span className="text-3xl text-emerald-400/40 font-serif">🂠</span>
                </div>
                <div className="w-20 h-28 sm:w-24 sm:h-36 border-2 border-dashed border-emerald-400/30 rounded-2xl flex items-center justify-center bg-emerald-950/20">
                  <span className="text-3xl text-emerald-400/40 font-serif">🂠</span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-300/70 tracking-wider uppercase font-semibold">Place bet to deal hand</span>
            </div>
          ) : (
            <div className="flex gap-3 animate-fade-in">
              {dealerCards.map((c, i) => (
                <Card key={i} card={c} hidden={i === 1 && gamePhase === 'playing'} />
              ))}
            </div>
          )}
        </div>

        {/* Result Overlay Banner */}
        {result && (
          <div className={`text-center py-3 px-6 rounded-2xl my-2 mx-auto z-20 border-2 shadow-2xl backdrop-blur-md animate-slide-up ${
            result.outcome === 'blackjack' ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-500/20' :
            result.outcome === 'win' || result.profit > 0 ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-emerald-500/20' :
            result.outcome === 'push' || result.profit === 0 ? 'bg-slate-900/90 border-slate-500 text-slate-200' :
            result.outcome === 'partial' ? 'bg-amber-950/90 border-amber-500 text-amber-300' :
            'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-500/20'
          }`}>
            <span className="text-xl sm:text-2xl font-black tracking-wide">
              {result.outcome === 'blackjack' ? `★ BLACKJACK! +$${result.profit.toFixed(2)} ★` :
               result.profit > 0 ? `YOU WIN +$${result.profit.toFixed(2)}` :
               result.profit === 0 ? 'PUSH (BET RETURNED)' :
               result.outcome === 'partial' ? `PARTIAL -$${Math.abs(result.profit).toFixed(2)}` :
               result.outcome === 'bust' ? `BUST! OVER 21 (-$${Math.abs(result.profit).toFixed(2)})` :
               `DEALER WINS (-$${Math.abs(result.profit).toFixed(2)})`}
            </span>
            {result.hand2 && (
              <div className="flex justify-center gap-4 mt-1 text-xs font-semibold">
                <span className={result.hand1.mult > 1 ? 'text-emerald-400' : result.hand1.mult === 1 ? 'text-slate-400' : 'text-rose-400'}>
                  Hand 1: {result.hand1.outcome.toUpperCase()}
                </span>
                <span className={result.hand2.mult > 1 ? 'text-emerald-400' : result.hand2.mult === 1 ? 'text-slate-400' : 'text-rose-400'}>
                  Hand 2: {result.hand2.outcome.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Player Zone */}
        <div className="flex flex-col items-center justify-center my-auto z-10">
          {gamePhase === 'betting' ? (
            <div className="flex flex-col items-center justify-center opacity-60">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-400/40 flex flex-col items-center justify-center bg-amber-950/20 mb-2">
                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Bet Spot</span>
                <span className="text-lg font-black text-white font-mono">${bet}</span>
              </div>
              <span className="text-[11px] text-emerald-300/70 uppercase tracking-wider font-semibold">Select bet & press deal</span>
            </div>
          ) : (
            <div className="flex gap-6 sm:gap-8">
              {/* Main Hand */}
              <div className={`flex flex-col items-center ${activeHand === 0 && gamePhase.includes('playing') ? 'ring-2 ring-amber-400/80 rounded-2xl p-2 bg-emerald-950/40' : ''}`}>
                <div className="flex gap-2 sm:gap-3">
                  {playerCards.map((c, i) => <Card key={i} card={c} />)}
                </div>
                <div className="flex items-center gap-2.5 mt-2">
                  <span className="text-xs sm:text-sm text-amber-200/80 uppercase tracking-widest font-black">
                    {splitHand.length > 0 ? 'Hand 1' : 'Your Hand'}
                  </span>
                  {pVal > 0 && (
                    <span className={`bg-black/70 border border-amber-400/30 px-3 py-0.5 rounded-full text-base sm:text-lg font-black ${pVal > 21 ? 'text-rose-400' : 'text-amber-300'}`}>
                      {pVal}
                    </span>
                  )}
                </div>
              </div>

              {/* Split Hand */}
              {splitHand.length > 0 && (
                <div className={`flex flex-col items-center ${activeHand === 1 ? 'ring-2 ring-amber-400/80 rounded-2xl p-2 bg-emerald-950/40' : ''}`}>
                  <div className="flex gap-2 sm:gap-3">
                    {splitHand.map((c, i) => <Card key={i} card={c} />)}
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="text-xs sm:text-sm text-amber-200/80 uppercase tracking-widest font-black">Hand 2</span>
                    <span className={`bg-black/70 border border-amber-400/30 px-3 py-0.5 rounded-full text-base sm:text-lg font-black ${sVal > 21 ? 'text-rose-400' : 'text-amber-300'}`}>
                      {sVal}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-3">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-4 border border-red-500/20 shadow-lg shadow-red-500/10">
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
              <button onClick={() => handleBetChange(1)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={gamePhase !== 'betting'} className="btn-secondary py-2.5 text-sm font-bold rounded-xl">MAX</button>
            </div>
          </div>

          {/* Quick Bets Chip Rack */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Select Casino Chips</span>
              <span className="text-[11px] text-amber-400 font-mono font-bold">${bet}</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[5, 10, 25, 50, 100, 500].map(v => (
                <button
                  key={v}
                  onClick={() => handleBetChange(v)}
                  disabled={gamePhase !== 'betting'}
                  className={`py-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center border-2 ${
                    bet === v
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-105 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 leading-none">$</span>
                  <span className="leading-none mt-0.5">{v}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payouts */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Natural Blackjack</span>
              <span className="text-amber-400 font-bold font-mono">3:2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Standard Win</span>
              <span className="text-emerald-400 font-bold font-mono">1:1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Double Down</span>
              <span className="text-indigo-400 font-bold font-mono">2x Wager</span>
            </div>
          </div>

          {/* Actions */}
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
          ) : gamePhase === 'playing' || gamePhase === 'playing_split' ? (
            <div className="flex flex-col gap-3 mt-auto">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={hit} className="py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl">
                  HIT
                </button>
                <button onClick={stand} className="py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xl">
                  STAND
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {canDouble && (
                  <button onClick={double} className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black">
                    DOUBLE
                  </button>
                )}
                {canSplit && (
                  <button onClick={split} className="py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black">
                    SPLIT
                  </button>
                )}
              </div>
            </div>
          ) : gamePhase === 'dealer' ? (
            <button disabled className="w-full py-4 rounded-xl bg-gray-700 text-gray-400 font-black text-xl mt-auto">
              DEALER DRAWING...
            </button>
          ) : (
            <button onClick={newGame} className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-xl mt-auto shadow-lg shadow-pink-500/30">
              NEW GAME
            </button>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="flex justify-center gap-2">
              {history.map((h, i) => (
                <div key={i} className={`px-3 py-2 rounded-lg text-sm font-bold group relative cursor-help transition-all hover:scale-105 ${
                  h.outcome === 'blackjack' || h.outcome === 'win' ? 'bg-green-900/50 text-green-400' :
                  h.outcome === 'push' ? 'bg-gray-700/50 text-gray-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {h.mult}x
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 w-48 z-10 text-center whitespace-normal font-normal">
                    {OUTCOME_EXPLANATIONS[h.outcome] || h.outcome}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
