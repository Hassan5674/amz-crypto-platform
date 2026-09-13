import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Gamepad2,
  ShieldCheck,
  Volume2,
  VolumeX,
  Lock,
  Timer,
  Sparkles,
  RotateCw,
  Coins,
  CheckCircle2,
  AlertCircle,
  Wallet,
  PlusCircle
} from 'lucide-react';
import { BettingButton } from './BettingButton';
import { useAudio } from '../audio/AudioContext';
import { RouletteHistory } from './RouletteHistory';
import { ProvablyFairModal } from './ProvablyFairModal';
import { ProfessionalRouletteWheel } from './ProfessionalRouletteWheel';
import { ProfessionalRouletteTable } from './ProfessionalRouletteTable';
import { useCasino } from '../../games/context/CasinoContext';
import {
  RouletteEngineProvider,
  useRouletteEngine,
  EUROPEAN_WHEEL_NUMBERS,
  RED_POCKET_NUMBERS
} from '../../context/RouletteContext';

interface RouletteBoardProps {
  demoBalance?: number;
  setDemoBalance?: React.Dispatch<React.SetStateAction<number>>;
  isBetting?: boolean;
  setIsBetting?: React.Dispatch<React.SetStateAction<boolean>>;
  gameSlug?: string;
  onBetPlaced?: () => void;
}

const OUTSIDE_BETS = [
  { id: 'red', label: '🔴 Red (2x)', colorClass: 'hover:border-rose-500' },
  { id: 'black', label: '⚫ Black (2x)', colorClass: 'hover:border-slate-500' },
  { id: 'even', label: 'Even (2x)', colorClass: 'hover:border-indigo-500' },
  { id: 'odd', label: 'Odd (2x)', colorClass: 'hover:border-indigo-500' }
];

const CHIP_VALUES = [5, 10, 20, 50, 100, 500];

const RouletteBoardContent: React.FC<RouletteBoardProps> = ({
  demoBalance,
  setDemoBalance
}) => {
  const { muted, toggleMute, playClickSound, playChipSound } = useAudio();

  // Safely connect with global casino context if mounted within CasinoProvider
  let casinoStateBalance: number | undefined;
  let casinoPlaceBet: ((amount: number, game: string, selection?: unknown) => boolean | Promise<boolean>) | undefined;
  let casinoAddWin: ((amount: number, betAmount: number, game: string, multiplier?: number) => void) | undefined;
  try {
    const casino = useCasino();
    casinoStateBalance = casino?.state?.balance;
    casinoPlaceBet = casino?.placeBet;
    casinoAddWin = casino?.addWin;
  } catch {
    // If mounted outside CasinoProvider
  }

  const effectiveBalance = demoBalance !== undefined
    ? demoBalance
    : (casinoStateBalance !== undefined ? casinoStateBalance : 0);

  const {
    phase,
    countdown,
    spinCountdown,
    serverSeedHash,
    revealedServerSeed,
    clientSeed,
    nonce,
    wheelRotation,
    selectedBet,
    setSelectedBet,
    chipValue,
    setChipValue,
    activeBets,
    totalStake,
    addBet,
    clearBets,
    lastOutcome,
    history,
    isProvablyFairModalOpen,
    openProvablyFairModal,
    closeProvablyFairModal,
    triggerSpin,
    errorMessage
  } = useRouletteEngine();

  const [inputBetAmount, setInputBetAmount] = useState<string>('20');
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync input bet amount with chipValue
  const handleChipSelect = (val: number) => {
    playChipSound();
    setChipValue(val);
    setInputBetAmount(val.toString());
  };

  // Sync demoBalance and casino balance when outcome settles
  useEffect(() => {
    if (phase === 'SETTLED' && lastOutcome) {
      if (lastOutcome.won && lastOutcome.actualPayout > 0) {
        if (setDemoBalance) {
          setDemoBalance(prev => prev + lastOutcome.actualPayout);
        }
        if (casinoAddWin && totalStake > 0) {
          casinoAddWin(
            lastOutcome.actualPayout,
            totalStake,
            'roulette',
            lastOutcome.multiplier || (lastOutcome.actualPayout / totalStake)
          );
        }
      }
    }
  }, [phase, lastOutcome, setDemoBalance, casinoAddWin, totalStake]);

  // When bet is placed, ensure user actually has funds!
  const handleAddBetClick = (selection: string) => {
    const amount = Number(inputBetAmount) || chipValue;
    if (effectiveBalance <= 0) {
      setLocalError('You have no balance. Please deposit funds into your wallet to place a bet.');
      return;
    }
    if (totalStake + amount > effectiveBalance) {
      setLocalError(`Insufficient funds: total stake ($${(totalStake + amount).toFixed(2)}) would exceed available balance ($${effectiveBalance.toFixed(2)}).`);
      return;
    }
    setLocalError(null);
    if (setDemoBalance) {
      setDemoBalance(prev => Math.max(0, prev - amount));
    }
    setSelectedBet(selection);
    addBet(selection, amount);
  };

  const isZeroBalance = effectiveBalance <= 0;
  const isOverBalance = totalStake > effectiveBalance;
  const hasNoBets = totalStake <= 0 && activeBets.length === 0;
  const isButtonDisabled = isZeroBalance || isOverBalance || hasNoBets || phase !== 'BETTING';

  const handleSpinClick = async () => {
    if (isZeroBalance) {
      setLocalError('Cannot spin: You have no balance. Please deposit funds.');
      return;
    }
    if (hasNoBets) {
      setLocalError('Please place at least one bet chip on the table before spinning.');
      return;
    }
    if (isOverBalance) {
      setLocalError(`Total wager ($${totalStake.toFixed(2)}) exceeds your balance ($${effectiveBalance.toFixed(2)}).`);
      return;
    }
    if (phase !== 'BETTING') return;

    if (casinoPlaceBet && totalStake > 0) {
      const ok = await casinoPlaceBet(totalStake, 'roulette');
      if (!ok) {
        setLocalError('Wager rejected by authoritative wallet: Insufficient balance.');
        return;
      }
    }

    setLocalError(null);
    triggerSpin();
  };

  // Compute countdown progress bar percentage (20s countdown)
  const bettingProgress = Math.min(100, Math.max(0, (countdown / 20) * 100));
  const spinProgress = Math.min(100, Math.max(0, (spinCountdown / 10) * 100));

  return (
    <Card className="p-6 bg-slate-950 text-white border-slate-800 space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-600/20 rounded-xl border border-violet-500/30 text-violet-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              European Roulette Engine
              <Badge variant="success">RTP 97.3%</Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Server-authoritative 37-pocket European Wheel with HMAC-SHA256 seed commitment and instant verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={toggleMute}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl transition-colors"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. Sleek Horizontal Scrolling Bar: Last 10 Round Outcomes at the Top */}
      <RouletteHistory outcomes={history} />

      {/* 3. Authoritative Live Phase & Countdown Status Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {phase === 'BETTING' && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-sm text-emerald-400 uppercase tracking-wider">
                  Betting Window Open
                </span>
              </div>
            )}

            {phase === 'SPINNING' && (
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="font-bold text-sm text-amber-400 uppercase tracking-wider">
                  Wheel Spinning Server-Authoritatively
                </span>
              </div>
            )}

            {phase === 'SETTLED' && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-cyan-400 uppercase tracking-wider">
                  Outcome Validated & Settled
                </span>
              </div>
            )}

            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              | Nonce: #{nonce}
            </span>
          </div>

          {/* Countdown Clock Display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              {phase === 'BETTING' && (
                <span>
                  Betting closes in: <strong className="text-emerald-400 text-sm">{countdown}s</strong>
                </span>
              )}
              {phase === 'SPINNING' && (
                <span>
                  Spinning: <strong className="text-amber-400 text-sm">{spinCountdown}s</strong>
                </span>
              )}
              {phase === 'SETTLED' && (
                <span className="text-cyan-400">
                  Next round starts shortly...
                </span>
              )}
            </div>

            {phase === 'BETTING' && (
              <button
                type="button"
                onClick={triggerSpin}
                className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Spin Now
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-3 w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-1000 ${
              phase === 'BETTING'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : phase === 'SPINNING'
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}
            style={{ width: `${phase === 'BETTING' ? bettingProgress : phase === 'SPINNING' ? spinProgress : 100}%` }}
          />
        </div>
      </div>

      {localError && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{localError}</span>
          </div>
          <button
            onClick={() => setLocalError(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Main Game Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Betting Controls & Seed Commitment Widget */}
        <div className="space-y-4 text-xs lg:col-span-1 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          {/* Zero Balance Warning Card */}
          {isZeroBalance && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Zero Wallet Balance ($0.00)</span>
              </div>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                You have insufficient funds to place chips or spin the wheel. Please deposit to begin playing with real funds.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate_dashboard_view', { detail: 'wallet' }))}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Deposit Funds to Wallet
              </button>
            </div>
          )}

          <div>
            <label htmlFor="roulette-wager-input" className="text-slate-300 block mb-1 font-semibold text-xs">
              Chip Value / Wager ($):
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="roulette-wager-input"
                type="number"
                min="1"
                value={inputBetAmount}
                onChange={(e) => {
                  setInputBetAmount(e.target.value);
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val > 0) setChipValue(val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Quick Chip Presets */}
            <div className="flex gap-1.5 flex-wrap">
              {CHIP_VALUES.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleChipSelect(val)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
                    chipValue === val
                      ? 'bg-violet-600 text-white border-violet-400 shadow-md scale-105'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Outside Bets (2x Return) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 font-semibold text-xs">Outside Bets (2x Payout):</span>
              <span className="text-[10px] text-slate-500 font-mono">1:1 Evens</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {OUTSIDE_BETS.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleAddBetClick(b.id);
                  }}
                  disabled={phase !== 'BETTING' || isZeroBalance}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase border transition-all ${
                    selectedBet === b.id
                      ? 'bg-violet-600 text-white border-violet-400 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  } ${phase !== 'BETTING' || isZeroBalance ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Bets & Total Wager Summary */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Selected Target:</span>
              <span className="font-bold text-violet-400 uppercase font-mono">
                {!isNaN(Number(selectedBet)) ? `Number ${selectedBet} (35:1)` : `${selectedBet} Bet (2x)`}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> Active Stake:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                ${totalStake > 0 ? totalStake.toFixed(2) : (Number(inputBetAmount) || chipValue).toFixed(2)} USD
              </span>
            </div>
            {activeBets.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{activeBets.length} bet(s) placed</span>
                {phase === 'BETTING' && (
                  <button
                    type="button"
                    onClick={clearBets}
                    className="text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          <BettingButton
            isBetting={phase !== 'BETTING'}
            disabled={isButtonDisabled}
            onClick={handleSpinClick}
            label={
              isZeroBalance
                ? 'Insufficient Balance ($0.00)'
                : isOverBalance
                ? `Insufficient Funds ($${effectiveBalance.toFixed(2)} Available)`
                : hasNoBets
                ? 'Place Bets on Table First'
                : phase === 'BETTING'
                ? `Confirm & Spin ($${totalStake > 0 ? totalStake.toFixed(2) : (Number(inputBetAmount) || chipValue).toFixed(2)})`
                : phase === 'SPINNING'
                ? `Authoritative Spin (${spinCountdown}s)`
                : 'Settling Outcome...'
            }
            loadingText={phase === 'SPINNING' ? `Spinning European Wheel (${spinCountdown}s)...` : 'Settling...'}
          />
        </div>

        {/* Right Column: Professional 3D European Wheel & Casino Felt Table */}
        <div className="lg:col-span-2 p-5 sm:p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-6">
          {/* Wheel Header */}
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase font-extrabold tracking-widest text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              PHYSICAL 3D EUROPEAN GRAND WHEEL
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              SINGLE ZERO • 37 POCKETS
            </span>
          </div>

          {/* Interactive 3D Canvas Wheel */}
          <div className="p-4 sm:p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-4 shadow-inner">
            <ProfessionalRouletteWheel
              phase={phase}
              winningNumber={lastOutcome ? lastOutcome.number : null}
              spinDurationSec={10}
              lastOutcome={lastOutcome}
            />

            {/* Live Result Banner */}
            {lastOutcome && phase === 'SETTLED' && (
              <div
                className={`p-4 rounded-xl border animate-fade-in ${
                  lastOutcome.won
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-600 text-rose-200'
                }`}
              >
                <div className="font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 flex-wrap">
                  <span>
                    {lastOutcome.won
                      ? `🎉 WINNER! Ball landed on ${lastOutcome.number} (${lastOutcome.color.toUpperCase()}).`
                      : `❌ Ball landed on ${lastOutcome.number} (${lastOutcome.color.toUpperCase()}).`}
                  </span>
                  {lastOutcome.won && (
                    <span className="font-mono text-emerald-400 font-black text-lg">
                      +${lastOutcome.actualPayout.toFixed(2)} USD
                    </span>
                  )}
                </div>

                {/* Outcome summary without provably fair audit links */}
              </div>
            )}
          </div>

          {/* Interactive Casino Green Felt Table */}
          <ProfessionalRouletteTable
            phase={phase}
            selectedBet={selectedBet}
            activeBets={activeBets}
            chipValue={chipValue}
            onBetClick={(selection) => {
              playClickSound();
              handleAddBetClick(selection);
            }}
            onClearBets={clearBets}
            winningNumber={lastOutcome && phase === 'SETTLED' ? lastOutcome.number : null}
          />
        </div>
      </div>
    </Card>
  );
};

export const RouletteBoard: React.FC<RouletteBoardProps> = (props) => {
  return (
    <RouletteEngineProvider>
      <RouletteBoardContent {...props} />
    </RouletteEngineProvider>
  );
};
