import { useCallback, useRef, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Create a full deck of 52 cards
const createDeck = () => {
  const deck = [];
  SUITS.forEach(suit => {
    VALUES.forEach((value, index) => {
      deck.push({
        suit,
        value,
        numValue: index + 1,
        id: `${suit}${value}`
      });
    });
  });
  return shuffleDeck(deck);
};

// Fisher-Yates shuffle
const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const BET_TYPES = {
  higher: { label: 'HIGHER ↑', calc: (curr, next) => next.numValue > curr.numValue, color: 'green' },
  lower: { label: 'LOWER ↓', calc: (curr, next) => next.numValue < curr.numValue, color: 'red' },
  same: { label: 'SAME =', calc: (curr, next) => next.numValue === curr.numValue, mult: 12, color: 'yellow' },
  red: { label: 'RED ♥♦', calc: (_, next) => next.suit === '♥' || next.suit === '♦', color: 'red' },
  black: { label: 'BLACK ♠♣', calc: (_, next) => next.suit === '♠' || next.suit === '♣', color: 'gray' },
  hearts: { label: '♥', calc: (_, next) => next.suit === '♥', mult: 4, color: 'red' },
  diamonds: { label: '♦', calc: (_, next) => next.suit === '♦', mult: 4, color: 'red' },
  spades: { label: '♠', calc: (_, next) => next.suit === '♠', mult: 4, color: 'gray' },
  clubs: { label: '♣', calc: (_, next) => next.suit === '♣', mult: 4, color: 'gray' },
  odd: { label: 'ODD', calc: (_, next) => next.numValue % 2 === 1, color: 'cyan' },
  even: { label: 'EVEN', calc: (_, next) => next.numValue % 2 === 0, color: 'purple' },
  face: { label: 'FACE', calc: (_, next) => next.numValue >= 11, mult: 4, color: 'orange' },
  ace: { label: 'ACE', calc: (_, next) => next.numValue === 1, mult: 13, color: 'pink' }
};

const Card = ({ card, size = 'large', flipped = false }) => {
  const isRed = card?.suit === '♥' || card?.suit === '♦';
  const sizeClasses = size === 'large' ? 'w-28 h-40' : size === 'medium' ? 'w-16 h-24' : 'w-12 h-16';
  const textSize = size === 'large' ? 'text-5xl' : size === 'medium' ? 'text-2xl' : 'text-lg';
  const suitSize = size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-xl' : 'text-sm';

  if (!card || flipped) {
    return (
      <div className={`${sizeClasses} rounded-xl bg-gradient-to-br from-blue-900 to-blue-950 flex items-center justify-center shadow-xl border-2 border-blue-700`}>
        <span className="text-blue-400 text-4xl">?</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-xl flex flex-col items-center justify-center shadow-xl transition-all hover:scale-105 ${
      isRed ? 'bg-gradient-to-br from-white to-gray-100 text-red-600' : 'bg-gradient-to-br from-white to-gray-100 text-gray-900'
    }`}>
      <span className={`font-black ${textSize}`}>{card.value}</span>
      <span className={suitSize}>{card.suit}</span>
    </div>
  );
};

export default function HiLoGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [deck, setDeck] = useState(() => createDeck());
  const [currentCard, setCurrentCard] = useState(null);
  const [nextCard, setNextCard] = useState(null);
  const [betType, setBetType] = useState('higher');
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Streak mode state
  const [inStreak, setInStreak] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [potentialWin, setPotentialWin] = useState(0);
  const initialBetRef = useRef(0);

  // Admin cheats
  const hiloCheats = state.adminSettings?.gameSettings?.hilo || {};
  const godMode = state.adminSettings?.godMode;

  // For showing next card cheat
  const [peekCard, setPeekCard] = useState(null);

  const getMultiplier = (type = betType, card = currentCard) => {
    if (!card) return 2;
    if (BET_TYPES[type].mult) return BET_TYPES[type].mult;
    if (type === 'higher') {
      const cardsAbove = 13 - card.numValue;
      return cardsAbove > 0 ? Math.max(1.05, (13 / cardsAbove * 0.97)) : 13;
    }
    if (type === 'lower') {
      const cardsBelow = card.numValue - 1;
      return cardsBelow > 0 ? Math.max(1.05, (13 / cardsBelow * 0.97)) : 13;
    }
    return 2;
  };

  const drawFromDeck = () => {
    let newDeck = [...deck];

    // If deck is running low, reshuffle
    if (newDeck.length < 10) {
      newDeck = createDeck();
    }

    const card = newDeck.pop();
    setDeck(newDeck);

    // Admin cheat: peek at next card
    if (hiloCheats.showNextCard || godMode) {
      setPeekCard(newDeck[newDeck.length - 1] || null);
    }

    return card;
  };

  // Start a new round
  const startGame = useCallback(async () => {
    if (playing || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'hilo');
    if (!confirmed) return;

    setPlaying(true);
    setResult(null);
    setNextCard(null);
    audio.playBet();

    // Draw first card
    const firstCard = drawFromDeck();

    setTimeout(() => {
      setCurrentCard(firstCard);
      setInStreak(true);
      setStreakCount(0);
      setCurrentMultiplier(1);
      setPotentialWin(bet);
      initialBetRef.current = bet;
      setPlaying(false);
    }, state.settings.fastMode ? 200 : 400);
  }, [playing, bet, state.balance, state.settings.fastMode, placeBet, deck]);

  // Make a prediction during streak
  const makePrediction = useCallback((predictionType) => {
    if (playing || !inStreak) return;

    setPlaying(true);
    setBetType(predictionType);
    audio.playBet();

    const newCard = drawFromDeck();
    const mult = getMultiplier(predictionType, currentCard);
    const won = BET_TYPES[predictionType].calc(currentCard, newCard);

    setTimeout(() => {
      setNextCard(newCard);

      if (won) {
        const newMultiplier = currentMultiplier * mult;
        const newPotentialWin = initialBetRef.current * newMultiplier;

        setCurrentMultiplier(newMultiplier);
        setPotentialWin(newPotentialWin);
        setStreakCount(s => s + 1);
        setResult({ won: true, mult: newMultiplier, profit: newPotentialWin - initialBetRef.current });
        setHistory(h => [{ card: newCard, won: true }, ...h.slice(0, 4)]);
        audio.playWin();

        // Move to next round
        setTimeout(() => {
          setCurrentCard(newCard);
          setNextCard(null);
          setPlaying(false);
        }, state.settings.fastMode ? 300 : 600);
      } else {
        // Lost - end streak
        setResult({ won: false, mult: 0, profit: -initialBetRef.current });
        setHistory(h => [{ card: newCard, won: false }, ...h.slice(0, 4)]);
        audio.playLose();
        addWin(0, initialBetRef.current, 'hilo', 0);

        setTimeout(() => {
          setInStreak(false);
          setCurrentCard(null);
          setNextCard(null);
          setStreakCount(0);
          setCurrentMultiplier(1);
          setPotentialWin(0);
          setPlaying(false);
        }, state.settings.fastMode ? 500 : 1000);
      }
    }, state.settings.fastMode ? 300 : 600);
  }, [playing, inStreak, currentCard, currentMultiplier, state.settings.fastMode, addWin, deck]);

  // Cashout current winnings
  const cashout = useCallback(() => {
    if (!inStreak || playing || streakCount === 0) return;

    const winAmount = potentialWin;
    addWin(winAmount, initialBetRef.current, 'hilo', currentMultiplier);
    audio.playWin();

    setResult({ won: true, mult: currentMultiplier, profit: winAmount - initialBetRef.current, cashout: true });
    setInStreak(false);
    setCurrentCard(null);
    setNextCard(null);
    setStreakCount(0);
    setCurrentMultiplier(1);
    setPotentialWin(0);
  }, [inStreak, playing, streakCount, potentialWin, currentMultiplier, addWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const isRed = (suit) => suit === '♥' || suit === '♦';

  const colorClasses = {
    green: 'bg-green-600 hover:bg-green-500',
    red: 'bg-red-600 hover:bg-red-500',
    yellow: 'bg-yellow-600 hover:bg-yellow-500 text-black',
    gray: 'bg-gray-700 hover:bg-gray-600',
    cyan: 'bg-cyan-600 hover:bg-cyan-500',
    purple: 'bg-purple-600 hover:bg-purple-500',
    orange: 'bg-orange-600 hover:bg-orange-500',
    pink: 'bg-pink-600 hover:bg-pink-500'
  };

  return (
    <div className="h-full flex gap-4">
      {/* Game Area - LEFT */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0a1a] rounded-2xl p-6 flex flex-col items-center justify-center relative">
        {/* Deck indicator */}
        <div className="absolute top-4 left-4 text-sm text-gray-500">
          Deck: {deck.length}/52
        </div>

        {/* Admin cheat: Peek next card */}
        {(hiloCheats.showNextCard || godMode) && peekCard && inStreak && (
          <div className="absolute top-16 left-4 bg-red-900/80 border border-red-500/50 rounded-xl p-2">
            <span className="text-xs text-red-400 block mb-1">NEXT CARD:</span>
            <span className={`text-lg font-bold ${peekCard.suit === '♥' || peekCard.suit === '♦' ? 'text-red-400' : 'text-white'}`}>
              {peekCard.value}{peekCard.suit} ({peekCard.numValue})
            </span>
          </div>
        )}

        {/* Streak indicator */}
        {inStreak && streakCount > 0 && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-4 py-2 rounded-full font-black text-lg animate-pulse">
            {streakCount} STREAK
          </div>
        )}

        {/* Current Multiplier & Potential Win */}
        {inStreak && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4">
            <div className="bg-black/60 px-4 py-2 rounded-xl border border-cyan-500/30">
              <span className="text-gray-400 text-sm">Multiplier: </span>
              <span className="text-cyan-400 font-black text-xl">{currentMultiplier.toFixed(2)}x</span>
            </div>
            <div className="bg-black/60 px-4 py-2 rounded-xl border border-green-500/30">
              <span className="text-gray-400 text-sm">Potential: </span>
              <span className="text-green-400 font-black text-xl">${potentialWin.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Cards Area */}
        <div className="flex gap-8 items-center mt-8">
          {/* Current Card */}
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-500 uppercase mb-3">Current Card</span>
            <Card card={currentCard} size="large" />
            {currentCard && (
              <span className="mt-2 text-gray-400 text-sm">
                Value: {currentCard.numValue}
              </span>
            )}
          </div>

          {inStreak && (
            <>
              <span className="text-5xl text-gray-600 font-black">→</span>

              {/* Next Card */}
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-500 uppercase mb-3">Next Card</span>
                <Card card={nextCard} size="large" />
              </div>
            </>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-6 text-center py-4 px-8 rounded-2xl ${
            result.won
              ? 'bg-green-900/60 border-2 border-green-500/50'
              : 'bg-red-900/60 border-2 border-red-500/50'
          }`}>
            <span className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won
                ? result.cashout
                  ? `CASHED OUT ${result.mult.toFixed(2)}x → +$${result.profit.toFixed(2)}`
                  : `WIN! Total ${result.mult.toFixed(2)}x`
                : `LOSE -$${initialBetRef.current.toFixed(2)}`
              }
            </span>
          </div>
        )}

        {/* Prediction Buttons (when in streak) */}
        {inStreak && !playing && currentCard && (
          <div className="mt-6 w-full max-w-xl">
            <div className="text-center text-gray-400 mb-3 text-sm uppercase">Make Your Prediction</div>

            {/* Main predictions */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {['higher', 'lower', 'same'].map(key => (
                <button
                  key={key}
                  onClick={() => makePrediction(key)}
                  className={`py-4 rounded-xl font-bold transition-all ${colorClasses[BET_TYPES[key].color]} text-white`}
                >
                  <div className="text-lg">{BET_TYPES[key].label}</div>
                  <div className="text-xs opacity-75">{getMultiplier(key, currentCard).toFixed(2)}x</div>
                </button>
              ))}
            </div>

            {/* Color predictions */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {['red', 'black'].map(key => (
                <button
                  key={key}
                  onClick={() => makePrediction(key)}
                  className={`py-3 rounded-xl font-bold transition-all ${colorClasses[BET_TYPES[key].color]} text-white`}
                >
                  {BET_TYPES[key].label} <span className="text-xs opacity-75">2x</span>
                </button>
              ))}
            </div>

            {/* Suit predictions */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['hearts', 'diamonds', 'spades', 'clubs'].map(key => (
                <button
                  key={key}
                  onClick={() => makePrediction(key)}
                  className={`py-3 rounded-xl text-2xl font-bold transition-all ${
                    key === 'hearts' || key === 'diamonds'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {BET_TYPES[key].label}
                </button>
              ))}
            </div>

            {/* Special predictions */}
            <div className="grid grid-cols-4 gap-2">
              {['odd', 'even', 'face', 'ace'].map(key => (
                <button
                  key={key}
                  onClick={() => makePrediction(key)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all ${colorClasses[BET_TYPES[key].color]} text-white`}
                >
                  {BET_TYPES[key].label}
                  <div className="text-xs opacity-75">{BET_TYPES[key].mult || 2}x</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {history.slice(0, 5).map((h, i) => (
              <div key={i} className={`w-10 h-14 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${
                isRed(h.card.suit) ? 'bg-white text-red-600' : 'bg-white text-gray-900'
              } ${h.won ? 'ring-2 ring-green-500' : 'ring-2 ring-red-500'}`}>
                <span className="font-black">{h.card.value}</span>
                <span className="text-[10px]">{h.card.suit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-5 border border-purple-500/20 shadow-lg shadow-purple-500/10">

          {/* Game Mode Indicator */}
          <div className={`text-center py-3 rounded-2xl font-bold ${
            inStreak
              ? 'bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border border-yellow-500/50'
              : 'bg-gray-800/50'
          }`}>
            {inStreak ? (
              <div>
                <div className="text-yellow-400 font-black text-lg">STREAK MODE</div>
                <div className="text-gray-400 text-sm">Pick or Cashout</div>
              </div>
            ) : (
              <div className="text-gray-400">Start a new round</div>
            )}
          </div>

          {/* Bet Amount (only when not in streak) */}
          {!inStreak && (
            <div className="space-y-3 animate-slide-in-down">
              <label className="text-sm text-green-400 uppercase font-bold tracking-wider">Bet Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 text-xl font-bold">$</span>
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => handleBetChange(Number(e.target.value))}
                  disabled={playing || inStreak}
                  className="w-full bg-black/60 border-2 border-green-500/30 rounded-xl py-4 pl-10 pr-4 text-white text-xl font-bold focus:border-green-400 focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handleBetChange(1)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">MIN</button>
                <button onClick={() => handleBetChange(bet / 2)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">½</button>
                <button onClick={() => handleBetChange(bet * 2)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">2x</button>
                <button onClick={() => handleBetChange(state.balance)} disabled={playing} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">MAX</button>
              </div>
            </div>
          )}

          {/* Streak Info */}
          {inStreak && (
            <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-gray-700/50 animate-slide-in-down" style={{ animationDelay: '0.05s' }}>
              <div className="flex justify-between">
                <span className="text-gray-400">Initial Bet</span>
                <span className="text-white font-bold text-lg">${initialBetRef.current.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700/50">
                <span className="text-gray-400">Streak</span>
                <span className="text-yellow-400 font-bold text-lg">{streakCount}W</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700/50">
                <span className="text-gray-400">Multiplier</span>
                <span className="text-cyan-400 font-bold text-lg">{currentMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-700/50">
                <span className="text-gray-400">Potential Win</span>
                <span className="text-green-400 font-black text-xl">${potentialWin.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-auto space-y-3">
            {inStreak && streakCount > 0 ? (
              <button
                onClick={cashout}
                disabled={playing}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-xl disabled:opacity-50 shadow-lg shadow-green-500/40 transition-all transform hover:scale-105 disabled:hover:scale-100 animate-pulse"
              >
                CASH OUT ${potentialWin.toFixed(2)}
              </button>
            ) : !inStreak ? (
              <BettingButton
                isBetting={playing}
                balance={state.balance}
                betAmount={bet}
                onClick={startGame}
                label="START ROUND"
                loadingText="DRAWING..."
                className="py-5 rounded-2xl text-xl font-black bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-pink-500/40"
              />
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                Make a prediction above
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
