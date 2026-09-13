import { useCallback, useState } from 'react';
import { useCasino } from '../context/CasinoContext.js';
import audio from '../utils/audioEngine.js';
import { BettingButton } from '../../components/games/BettingButton.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getCard = () => {
  const idx = Math.floor(Math.random() * 13);
  return {
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: VALUES[idx],
    numValue: idx + 1
  };
};

export default function AndarBaharGame() {
  const { state, play, placeBet, addWin, setGlobalBet } = useCasino();
  const [bet, setBet] = useState(state.globalBet || 10);
  const [side, setSide] = useState('bahar'); // 'andar' or 'bahar'
  const [jokerCard, setJokerCard] = useState(null);
  const [andarCards, setAndarCards] = useState([]);
  const [baharCards, setBaharCards] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, dealing, ended
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const MULTIPLIERS = { andar: 1.9, bahar: 2.0 };

  const startRound = useCallback(async () => {
    if (gamePhase === 'dealing') return;

    const confirmed = await play(bet, 'andarbahar', async () => {
      setResult(null);
      setGamePhase('dealing');
      setAndarCards([]);
      setBaharCards([]);
      audio.playBet();

      const joker = getCard();
      setJokerCard(joker);

      // Simulate dealing loop
      const andarArr = [];
      const baharArr = [];
      let foundSide = null;

      // Decide randomly which side hits first
      const firstIsAndar = Math.random() > 0.5;
      const targetSide = Math.random() > 0.5 ? 'andar' : 'bahar';

      // Generate sequence
      let matched = false;
      let steps = Math.floor(Math.random() * 4) + 2; // 2 to 5 cards

      for (let i = 0; i < steps; i++) {
        const c = getCard();
        // ensure match on the target side at the last step
        if (i === steps - 1) {
          c.value = joker.value;
          foundSide = i % 2 === 0 ? (firstIsAndar ? 'andar' : 'bahar') : (firstIsAndar ? 'bahar' : 'andar');
        }

        if (i % 2 === 0) {
          if (firstIsAndar) andarArr.push(c);
          else baharArr.push(c);
        } else {
          if (firstIsAndar) baharArr.push(c);
          else andarArr.push(c);
        }
      }

      setAndarCards(andarArr);
      setBaharCards(baharArr);

      setTimeout(() => {
        const won = foundSide === side;
        const mult = won ? MULTIPLIERS[side] : 0;
        const winAmount = won ? bet * mult : 0;

        setResult({
          winningSide: foundSide,
          won,
          mult,
          profit: winAmount - bet
        });
        setHistory(h => [{ side: foundSide, won }, ...h.slice(0, 4)]);
        setGamePhase('ended');

        if (won) {
          addWin(winAmount, bet, 'andarbahar', mult);
          audio.playWin();
        } else {
          addWin(0, bet, 'andarbahar', 0);
          audio.playLose();
        }
      }, 800);
    });

    if (!confirmed) return;
  }, [bet, side, gamePhase, play, addWin]);

  const handleBetChange = (val) => {
    const v = Math.max(1, Math.round(Number(val) || 1));
    setBet(v);
    setGlobalBet(v);
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto p-4 text-white">
      {/* Header Info */}
      <div className="flex justify-between w-full mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="text-xs text-slate-400">Game</div>
          <div className="text-lg font-black text-amber-400">Andar Bahar Duel</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">RTP / House Edge</div>
          <div className="text-sm font-bold text-emerald-400">97.85% / 2.15%</div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="w-full bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-950 p-6 rounded-3xl border-2 border-emerald-500/30 shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-transparent to-slate-950/80 pointer-events-none" />

        {/* Joker Card Centerpiece */}
        <div className="flex flex-col items-center mb-8 relative z-10">
          <span className="text-xs font-bold uppercase text-amber-300 tracking-widest mb-2">Joker Card (Middle)</span>
          {jokerCard ? (
            <div className={`w-28 h-40 rounded-2xl flex flex-col items-center justify-center shadow-2xl bg-white text-slate-900 font-black animate-in zoom-in duration-300 ${
              jokerCard.suit === '♥' || jokerCard.suit === '♦' ? 'text-red-600' : 'text-slate-900'
            }`}>
              <span className="text-5xl">{jokerCard.value}</span>
              <span className="text-3xl mt-1">{jokerCard.suit}</span>
            </div>
          ) : (
            <div className="w-28 h-40 rounded-2xl border-3 border-dashed border-emerald-600/40 flex items-center justify-center bg-emerald-950/50">
              <span className="text-3xl text-emerald-500 font-bold">JOKER</span>
            </div>
          )}
        </div>

        {/* Andar & Bahar Piles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Andar Side */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center ${
            side === 'andar' ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between w-full mb-3">
              <span className="font-bold text-indigo-300">ANDAR (Inside)</span>
              <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full">1.9x Payout</span>
            </div>
            <div className="min-h-[130px] flex flex-wrap gap-2 items-center justify-center w-full p-2 bg-slate-900/50 rounded-xl border border-slate-800">
              {andarCards.length === 0 ? (
                <span className="text-xs text-slate-500">Waiting for deal...</span>
              ) : (
                andarCards.map((c, idx) => (
                  <div key={idx} className="w-16 h-24 bg-white text-slate-900 rounded-lg flex flex-col items-center justify-center font-black text-lg shadow-md animate-in slide-in-from-bottom-2">
                    <span className={c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-slate-900'}>{c.value} {c.suit}</span>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setSide('andar')}
              className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                side === 'andar' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Select ANDAR
            </button>
          </div>

          {/* Bahar Side */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center ${
            side === 'bahar' ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-950' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between w-full mb-3">
              <span className="font-bold text-amber-300">BAHAR (Outside)</span>
              <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">2.0x Payout</span>
            </div>
            <div className="min-h-[130px] flex flex-wrap gap-2 items-center justify-center w-full p-2 bg-slate-900/50 rounded-xl border border-slate-800">
              {baharCards.length === 0 ? (
                <span className="text-xs text-slate-500">Waiting for deal...</span>
              ) : (
                baharCards.map((c, idx) => (
                  <div key={idx} className="w-16 h-24 bg-white text-slate-900 rounded-lg flex flex-col items-center justify-center font-black text-lg shadow-md animate-in slide-in-from-bottom-2">
                    <span className={c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-slate-900'}>{c.value} {c.suit}</span>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setSide('bahar')}
              className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                side === 'bahar' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Select BAHAR
            </button>
          </div>
        </div>

        {/* Result Banner */}
        {result && (
          <div className={`mt-6 p-4 rounded-2xl text-center font-bold text-sm animate-in zoom-in duration-200 ${
            result.won ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300' : 'bg-rose-500/20 border border-rose-500 text-rose-350'
          }`}>
            {result.won ? `🎉 WON $${result.profit.toFixed(2)} (${result.mult}x) on ${result.winningSide.toUpperCase()}!` : `❌ Lost. Winning side was ${result.winningSide.toUpperCase()}.`}
          </div>
        )}
      </div>

      {/* Bet Controls & Action */}
      <div className="w-full bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400">BET ($):</span>
          {[10, 50, 100, 500].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => handleBetChange(amt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                bet === amt ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ${amt}
            </button>
          ))}
          <input
            type="number"
            min="1"
            max={state.balance}
            value={bet}
            onChange={e => handleBetChange(Number(e.target.value))}
            className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
          />
        </div>

        <div className="w-full md:w-72">
          <BettingButton
            label={gamePhase === 'dealing' ? 'Dealing...' : `Place Bet on ${side.toUpperCase()} ($${bet})`}
            onClick={startRound}
            isBetting={gamePhase === 'dealing'}
            betAmount={bet}
            balance={state.balance}
            className="w-full py-4 text-sm font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-950"
          />
        </div>
      </div>
    </div>
  );
}
