import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = { '♠': 'text-gray-200', '♥': 'text-red-500', '♦': 'text-red-500', '♣': 'text-gray-200' };
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

const WIN_MULTIPLIER = 1.95;
const WAR_MULTIPLIER = 3.8;

export default function WarGame() {
  const { state, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [playing, setPlaying] = useState(false);
  const [playerCard, setPlayerCard] = useState(null);
  const [dealerCard, setDealerCard] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [warMode, setWarMode] = useState(false);
  const [warCards, setWarCards] = useState({ player: [], dealer: [] });

  const godMode = state.adminSettings?.godMode || state.adminSettings?.gameSettings?.war?.alwaysWin;

  const drawCard = useCallback((excludeCards = []) => {
    let card;
    do {
      const suit = SUITS[Math.floor(Math.random() * 4)];
      const rank = RANKS[Math.floor(Math.random() * 13)];
      card = { suit, rank, value: RANK_VALUES[rank] };
    } while (excludeCards.some(c => c.suit === card.suit && c.rank === card.rank));
    return card;
  }, []);

  const drawRiggedCard = useCallback((targetValue, higher, excludeCards = []) => {
    const validRanks = RANKS.filter(r =>
      higher ? RANK_VALUES[r] > targetValue : RANK_VALUES[r] < targetValue
    );
    if (validRanks.length === 0) return drawCard(excludeCards);

    const rank = validRanks[Math.floor(Math.random() * validRanks.length)];
    const suit = SUITS[Math.floor(Math.random() * 4)];
    return { suit, rank, value: RANK_VALUES[rank] };
  }, [drawCard]);

  const play = useCallback(async () => {
    if (playing || bet <= 0 || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'war');
    if (!confirmed) return;

    setPlaying(true);
    setResult(null);
    setWarMode(false);
    setWarCards({ player: [], dealer: [] });
    audio.playBet();

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 200 : 400));

    const pCard = drawCard();
    setPlayerCard(pCard);

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 200 : 400));

    let dCard;
    if (godMode) {
      dCard = drawRiggedCard(pCard.value, false, [pCard]);
    } else {
      dCard = drawCard([pCard]);
    }
    setDealerCard(dCard);

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 300 : 600));

    if (pCard.value > dCard.value) {
      const winAmount = bet * WIN_MULTIPLIER;
      setResult({ outcome: 'win', winAmount, mult: WIN_MULTIPLIER });
      setHistory(h => [{ outcome: 'win', pCard, dCard }, ...h.slice(0, 5)]);
      addWin(winAmount, bet, 'war', WIN_MULTIPLIER);
      audio.playWin();
    } else if (pCard.value < dCard.value) {
      setResult({ outcome: 'lose', winAmount: 0, mult: 0 });
      setHistory(h => [{ outcome: 'lose', pCard, dCard }, ...h.slice(0, 5)]);
      addWin(0, bet, 'war', 0);
      audio.playLose();
    } else {
      setWarMode(true);
      setResult({ outcome: 'war', winAmount: 0, mult: 0 });
    }

    setPlaying(false);
  }, [playing, bet, state.balance, state.settings.fastMode, placeBet, drawCard, drawRiggedCard, godMode, addWin]);

  const goToWar = useCallback(async () => {
    if (playing || bet > state.balance) return;

    const confirmed = await placeBet(bet, 'war');
    if (!confirmed) return;

    setPlaying(true);
    audio.playBet();

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 200 : 400));

    const burnCards = { player: [], dealer: [] };
    for (let i = 0; i < 3; i++) {
      burnCards.player.push(drawCard());
      burnCards.dealer.push(drawCard());
    }
    setWarCards(burnCards);

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 300 : 600));

    const pCard = drawCard();
    setPlayerCard(pCard);

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 200 : 400));

    let dCard;
    if (godMode) {
      dCard = drawRiggedCard(pCard.value, false, [pCard, ...burnCards.player, ...burnCards.dealer]);
    } else {
      dCard = drawCard([pCard, ...burnCards.player, ...burnCards.dealer]);
    }
    setDealerCard(dCard);

    await new Promise(r => setTimeout(r, state.settings.fastMode ? 300 : 600));

    const totalBet = bet * 2;

    if (pCard.value >= dCard.value) {
      const winAmount = totalBet * WAR_MULTIPLIER;
      setResult({ outcome: 'warWin', winAmount, mult: WAR_MULTIPLIER });
      setHistory(h => [{ outcome: 'warWin', pCard, dCard }, ...h.slice(0, 5)]);
      addWin(winAmount, totalBet, 'war', WAR_MULTIPLIER);
      audio.playWin();
    } else {
      setResult({ outcome: 'warLose', winAmount: 0, mult: 0 });
      setHistory(h => [{ outcome: 'warLose', pCard, dCard }, ...h.slice(0, 5)]);
      addWin(0, totalBet, 'war', 0);
      audio.playLose();
    }

    setWarMode(false);
    setPlaying(false);
  }, [playing, bet, state.balance, state.settings.fastMode, placeBet, drawCard, drawRiggedCard, godMode, addWin]);

  const surrender = useCallback(() => {
    const returnAmount = bet * 0.5;
    setResult({ outcome: 'surrender', winAmount: returnAmount, mult: 0.5 });
    setHistory(h => [{ outcome: 'surrender', pCard: playerCard, dCard: dealerCard }, ...h.slice(0, 5)]);
    addWin(returnAmount, bet, 'war', 0.5);
    setWarMode(false);
    audio.playLose();
  }, [bet, playerCard, dealerCard, addWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  const CardDisplay = ({ card, label, faceDown = false }) => (
    <div className="flex flex-col items-center">
      <span className="text-gray-400 text-sm mb-3 font-semibold">{label}</span>
      <div className={`w-24 h-36 rounded-xl flex items-center justify-center text-5xl font-black shadow-2xl transition-all duration-300 ${
        faceDown
          ? 'bg-gradient-to-br from-blue-800 to-blue-950 border-2 border-blue-600'
          : card
          ? 'bg-gradient-to-br from-white to-gray-200 border-2 border-gray-600 shadow-lg'
          : 'bg-gradient-to-br from-gray-600 to-gray-800 border-2 border-gray-500'
      }`}>
        {faceDown ? (
          <span className="text-blue-400 text-3xl">?</span>
        ) : card ? (
          <div className="flex flex-col items-center">
            <span className="text-black drop-shadow-md">
              {card.suit}
            </span>
            <span className="text-black leading-none drop-shadow-md">
              {card.rank}
            </span>
          </div>
        ) : (
          <span className="text-gray-600 text-4xl font-black">-</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex gap-4">
      {/* Game Area */}
      <div className="flex-1 bg-gradient-to-b from-[#0a0a12] to-[#1a0f0a] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500 rounded-full blur-[80px]" />
        </div>

        {/* War Banner */}
        {warMode && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-orange-600 px-8 py-3 rounded-full animate-pulse">
            <span className="text-white font-black text-2xl">WAR!</span>
          </div>
        )}

        {/* Cards Area */}
        <div className="relative z-10 flex items-center gap-16">
          <CardDisplay card={playerCard} label="YOUR CARD" />

          <div className="text-4xl font-black text-gray-600">VS</div>

          <CardDisplay card={dealerCard} label="DEALER" />
        </div>

        {/* War Burn Cards */}
        {warCards.player.length > 0 && (
          <div className="mt-8 flex gap-16">
            <div className="flex gap-1">
              {warCards.player.map((_, i) => (
                <div key={i} className="w-12 h-18 rounded bg-gradient-to-br from-blue-800 to-blue-950 border border-blue-600" />
              ))}
            </div>
            <div className="flex gap-1">
              {warCards.dealer.map((_, i) => (
                <div key={i} className="w-12 h-18 rounded bg-gradient-to-br from-blue-800 to-blue-950 border border-blue-600" />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mt-8 px-8 py-4 rounded-2xl text-center ${
            result.outcome === 'win' || result.outcome === 'warWin'
              ? 'bg-green-500/20 border border-green-500/50'
              : result.outcome === 'war'
              ? 'bg-yellow-500/20 border border-yellow-500/50'
              : 'bg-red-500/20 border border-red-500/50'
          }`}>
            <div className={`text-2xl font-black ${
              result.outcome === 'win' || result.outcome === 'warWin' ? 'text-green-400' :
              result.outcome === 'war' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {result.outcome === 'win' && 'YOU WIN!'}
              {result.outcome === 'lose' && 'YOU LOSE'}
              {result.outcome === 'war' && 'IT\'S WAR!'}
              {result.outcome === 'warWin' && 'WAR WON!'}
              {result.outcome === 'warLose' && 'WAR LOST'}
              {result.outcome === 'surrender' && 'SURRENDERED'}
            </div>
            {result.winAmount > 0 && (
              <div className="text-xl text-white mt-2">
                +${result.winAmount.toFixed(2)} <span className="text-gray-400">({result.mult}x)</span>
              </div>
            )}
          </div>
        )}

        {/* War Options */}
        {warMode && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={goToWar}
              disabled={playing || bet > state.balance}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-bold text-white hover:scale-105 transition-all disabled:opacity-50"
            >
              GO TO WAR (${bet})
            </button>
            <button
              onClick={surrender}
              disabled={playing}
              className="px-8 py-3 bg-gray-700 rounded-xl font-bold text-gray-300 hover:bg-gray-600 transition-all disabled:opacity-50"
            >
              Surrender (Get ${(bet * 0.5).toFixed(0)} back)
            </button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                  h.outcome === 'win' || h.outcome === 'warWin' ? 'bg-green-500/30 text-green-400' :
                  h.outcome === 'surrender' ? 'bg-yellow-500/30 text-yellow-400' :
                  'bg-red-500/30 text-red-400'
                }`}
              >
                {h.outcome === 'win' ? 'W' : h.outcome === 'warWin' ? '⚔' : h.outcome === 'surrender' ? 'S' : 'L'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - RIGHT */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-gradient-to-b from-[#0a0a12] to-[#0f0f1a] rounded-3xl p-6 flex-1 flex flex-col gap-5 border border-red-500/20 shadow-lg shadow-red-500/10">
          {/* Bet Amount */}
          <div className="space-y-3 animate-slide-in-down">
            <label className="text-sm text-red-400 uppercase font-bold tracking-wider">Bet Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 text-xl font-bold">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => handleBetChange(Number(e.target.value))}
                min="1"
                max={state.balance}
                disabled={warMode}
                className="w-full bg-black/60 border-2 border-red-500/30 rounded-xl py-4 pl-10 pr-4 text-white text-xl font-bold focus:border-red-400 focus:outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleBetChange(1)} disabled={warMode} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">MIN</button>
              <button onClick={() => handleBetChange(bet / 2)} disabled={warMode} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">½</button>
              <button onClick={() => handleBetChange(bet * 2)} disabled={warMode} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">2x</button>
              <button onClick={() => handleBetChange(state.balance)} disabled={warMode} className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700 py-3 text-sm font-bold rounded-xl transition-all transform hover:scale-105">MAX</button>
            </div>
          </div>

          {/* Quick Bets */}
          <div className="grid grid-cols-3 gap-2 animate-slide-in-down" style={{ animationDelay: '0.05s' }}>
            {[10, 25, 50, 100, 250, 500].map(v => (
              <button
                key={v}
                onClick={() => handleBetChange(v)}
                disabled={warMode}
                className={`py-3 rounded-2xl text-sm font-bold transition-all transform hover:scale-105 disabled:opacity-50 ${bet === v ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/30' : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 border border-gray-700'}`}
              >
                ${v}
              </button>
            ))}
          </div>

          {/* Payouts */}
          <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-gray-700/50 animate-slide-in-down" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Win</span>
              <span className="text-green-400 font-bold text-lg">{WIN_MULTIPLIER}x</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
              <span className="text-gray-400 text-sm">War Win</span>
              <span className="text-yellow-400 font-bold text-lg">{WAR_MULTIPLIER}x</span>
            </div>
          </div>

          {/* Play Button */}
          <div className="mt-auto">
            <BettingButton
              isBetting={playing}
              balance={state.balance}
              betAmount={bet}
              disabled={warMode}
              onClick={play}
              label="DRAW CARD"
              loadingText="DEALING..."
              className="py-5 rounded-2xl text-xl font-black bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white shadow-red-500/40"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
