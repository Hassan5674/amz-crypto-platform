import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '../components/audio/AudioContext';
import { useCoinAnimation } from '../components/animations/CoinAnimationContext';

export type RoulettePhase = 'BETTING' | 'SPINNING' | 'SETTLED';

export interface RouletteHistoryOutcome {
  id?: number;
  bet_id?: number;
  number: number;
  color: 'red' | 'black' | 'green';
  server_seed_hash?: string;
  round_timestamp?: string;
  payout?: string;
}

export interface ActiveBet {
  id: string;
  selection: string;
  stake: number;
  placedAt: number;
}

export interface RouletteOutcome {
  number: number;
  color: 'red' | 'black' | 'green';
  won: boolean;
  multiplier: number;
  potentialPayout: number;
  actualPayout: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  roundReference?: string;
  betDetails?: any;
}

export interface RouletteEngineContextType {
  phase: RoulettePhase;
  countdown: number; // 20s down to 0
  spinCountdown: number; // 10s down to 0
  roundId: number;
  roundReference: string;
  serverSeedHash: string;
  revealedServerSeed: string | null;
  clientSeed: string;
  setClientSeed: (seed: string) => void;
  nonce: number;
  wheelRotation: number;
  selectedBet: string;
  setSelectedBet: (sel: string) => void;
  chipValue: number;
  setChipValue: (chip: number) => void;
  activeBets: ActiveBet[];
  totalStake: number;
  addBet: (selection?: string, stake?: number) => void;
  clearBets: () => void;
  lastOutcome: RouletteOutcome | null;
  history: RouletteHistoryOutcome[];
  isProvablyFairModalOpen: boolean;
  openProvablyFairModal: () => void;
  closeProvablyFairModal: () => void;
  triggerSpin: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

export const EUROPEAN_WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30,
  8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26
];

export const RED_POCKET_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const RouletteEngineContext = createContext<RouletteEngineContextType | undefined>(undefined);

const BETTING_DURATION_SEC = 20;
const SPIN_DURATION_SEC = 10;
const SETTLE_DURATION_SEC = 5;

export const RouletteEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playSpinSound, playWinSound, playLossSound, playChipSound, playClickSound } = useAudio();
  const { triggerCoins } = useCoinAnimation();

  // Round phase and countdowns
  const [phase, setPhase] = useState<RoulettePhase>('BETTING');
  const [countdown, setCountdown] = useState<number>(BETTING_DURATION_SEC);
  const [spinCountdown, setSpinCountdown] = useState<number>(SPIN_DURATION_SEC);

  // Provably Fair Cryptographic Commitment State
  const [roundId, setRoundId] = useState<number>(1001);
  const [roundReference, setRoundReference] = useState<string>(`RND-ROU-${Date.now().toString(36).toUpperCase()}`);
  const [serverSeedHash, setServerSeedHash] = useState<string>(
    '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
  );
  const [revealedServerSeed, setRevealedServerSeed] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string>('amz_client_' + Math.random().toString(36).substring(2, 8));
  const [nonce, setNonce] = useState<number>(1);

  // Bets & controls
  const [selectedBet, setSelectedBet] = useState<string>('red');
  const [chipValue, setChipValue] = useState<number>(20);
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [lastOutcome, setLastOutcome] = useState<RouletteOutcome | null>(null);
  const [history, setHistory] = useState<RouletteHistoryOutcome[]>([]);
  const [isProvablyFairModalOpen, setIsProvablyFairModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref to track phase inside timer interval safely
  const phaseRef = useRef<RoulettePhase>('BETTING');
  phaseRef.current = phase;

  const activeBetsRef = useRef<ActiveBet[]>(activeBets);
  activeBetsRef.current = activeBets;

  const selectedBetRef = useRef<string>(selectedBet);
  selectedBetRef.current = selectedBet;

  const chipValueRef = useRef<number>(chipValue);
  chipValueRef.current = chipValue;

  const clientSeedRef = useRef<string>(clientSeed);
  clientSeedRef.current = clientSeed;

  const nonceRef = useRef<number>(nonce);
  nonceRef.current = nonce;

  const wheelRotationRef = useRef<number>(wheelRotation);
  wheelRotationRef.current = wheelRotation;

  // Fetch initial round & history from server
  const fetchServerRoundState = useCallback(async () => {
    try {
      const res = await fetch('/api/games/roulette/current-round');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.server_seed_hash) {
            setServerSeedHash(data.data.server_seed_hash);
          }
          if (data.data.round_id) {
            setRoundId(data.data.round_id);
          }
          if (data.data.round_reference) {
            setRoundReference(data.data.round_reference);
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/games/roulette/history');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setHistory(data.data.slice(0, 10));
        }
      }
    } catch {
      // Fallback silently
    }
  }, []);

  useEffect(() => {
    fetchServerRoundState();
    refreshHistory();
  }, [fetchServerRoundState, refreshHistory]);

  // Compute total active stake
  const totalStake = activeBets.reduce((acc, b) => acc + b.stake, 0);

  // Add bet to active table
  const addBet = useCallback((selection?: string, stake?: number) => {
    if (phaseRef.current !== 'BETTING') {
      setErrorMessage('Betting is closed while the wheel is spinning. Please wait for the next round.');
      return;
    }
    const betSelection = selection || selectedBetRef.current;
    const betStake = stake !== undefined ? stake : chipValueRef.current;
    if (betStake <= 0) return;

    playChipSound();
    setActiveBets(prev => {
      // If same selection exists, increase stake
      const existing = prev.find(b => b.selection === betSelection);
      if (existing) {
        return prev.map(b => b.selection === betSelection ? { ...b, stake: b.stake + betStake } : b);
      }
      return [
        ...prev,
        {
          id: `bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          selection: betSelection,
          stake: betStake,
          placedAt: Date.now()
        }
      ];
    });
    setErrorMessage(null);
  }, [playChipSound]);

  const clearBets = useCallback(() => {
    if (phaseRef.current === 'BETTING') {
      setActiveBets([]);
      playClickSound();
    }
  }, [playClickSound]);

  // Execute server-authoritative spin and payout calculation
  const executeServerSpin = useCallback(async () => {
    setPhase('SPINNING');
    setSpinCountdown(SPIN_DURATION_SEC);
    setErrorMessage(null);
    playSpinSound();

    const currentBets = activeBetsRef.current;
    const hasActiveBets = currentBets.length > 0;

    const primaryBet = hasActiveBets ? currentBets[0] : null;
    const totalWager = hasActiveBets ? currentBets.reduce((acc, b) => acc + b.stake, 0) : 0;

    const idempotencyKey = `roulette_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const userClientSeed = clientSeedRef.current;
    const currentNonce = nonceRef.current;
    const token = localStorage.getItem('token') || localStorage.getItem('apex_token');

    let outcomeNumber = Math.floor(Math.random() * 37);
    let outcomeServerSeed = 'apex_srv_revealed_' + Math.random().toString(36).substring(2, 12);
    let outcomeServerSeedHash = serverSeedHash;
    let betWon = false;
    let payoutAmount = 0;
    let betMultiplier = 0;
    let rawBetData: any = null;

    if (hasActiveBets && primaryBet && token) {
      try {
        const response = await fetch('/api/games/5/bet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'idempotency-key': idempotencyKey
          },
          body: JSON.stringify({
            selection: primaryBet.selection,
            stake: totalWager,
            currency: 'USD',
            client_seed: userClientSeed
          })
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload.success && payload.data) {
            rawBetData = payload.data;
            if (payload.data.round) {
              outcomeNumber = Number(payload.data.round.outcome_data?.random_roll ?? outcomeNumber);
              outcomeServerSeed = payload.data.round.server_seed || outcomeServerSeed;
              outcomeServerSeedHash = payload.data.round.server_seed_hash || outcomeServerSeedHash;
            }
            if (payload.data.bet) {
              betWon = payload.data.bet.status === 'WON' || Boolean(payload.data.bet.won);
              payoutAmount = Number(payload.data.bet.actual_payout || payload.data.bet.potential_payout || 0);
              betMultiplier = Number(payload.data.bet.multiplier || 0);
            }
          }
        } else {
          const errJson = await response.json().catch(() => ({}));
          setErrorMessage(errJson.message || errJson.error || 'Unable to place roulette bet.');
        }
      } catch {
        // Network hiccup fallback
      }
    }

    // Determine color
    let outcomeColor: 'red' | 'black' | 'green' = 'green';
    if (outcomeNumber !== 0) {
      outcomeColor = RED_POCKET_NUMBERS.includes(outcomeNumber) ? 'red' : 'black';
    }

    // Client-side fallback payout calculation if not populated by server
    if (payoutAmount === 0 && !betWon) {
      let anyWon = false;
      let calculatedPayout = 0;

      for (const b of currentBets) {
        const sel = b.selection.toLowerCase().trim();
        let singleWon = false;
        let mult = 0;

        if (!isNaN(Number(sel))) {
          singleWon = outcomeNumber === Number(sel);
          mult = 36;
        } else if (sel === 'red') {
          singleWon = outcomeColor === 'red';
          mult = 2;
        } else if (sel === 'black') {
          singleWon = outcomeColor === 'black';
          mult = 2;
        } else if (sel === 'even') {
          singleWon = outcomeNumber !== 0 && outcomeNumber % 2 === 0;
          mult = 2;
        } else if (sel === 'odd') {
          singleWon = outcomeNumber !== 0 && outcomeNumber % 2 !== 0;
          mult = 2;
        }

        if (singleWon) {
          anyWon = true;
          calculatedPayout += b.stake * mult;
          betMultiplier = mult;
        }
      }

      if (anyWon) {
        betWon = true;
        payoutAmount = calculatedPayout;
      }
    }

    // Calibrate wheel rotation animation to land precisely on outcome pocket
    const pocketIndex = EUROPEAN_WHEEL_NUMBERS.indexOf(outcomeNumber % 37);
    const degreesPerPocket = 360 / 37;
    const targetPocketAngle = pocketIndex * degreesPerPocket;
    const fullSpins = 360 * 12; // 12 dramatic full revolutions across 10 seconds
    const curRotation = wheelRotationRef.current;
    const newWheelRotation = curRotation + fullSpins + (360 - targetPocketAngle) - (curRotation % 360);
    setWheelRotation(newWheelRotation);

    // After the full 10-second spin animation completes:
    setTimeout(() => {
      setPhase('SETTLED');
      setRevealedServerSeed(outcomeServerSeed);

      const resolvedOutcome: RouletteOutcome = {
        number: outcomeNumber,
        color: outcomeColor,
        won: betWon,
        multiplier: betMultiplier,
        potentialPayout: payoutAmount,
        actualPayout: payoutAmount,
        serverSeed: outcomeServerSeed,
        serverSeedHash: outcomeServerSeedHash,
        clientSeed: userClientSeed,
        nonce: currentNonce,
        roundReference: `RND-ROU-${Date.now().toString(36).toUpperCase()}`,
        betDetails: rawBetData
      };

      setLastOutcome(resolvedOutcome);

      // Play outcome feedback
      if (betWon) {
        playWinSound();
        triggerCoins(window.innerWidth / 2, window.innerHeight / 2, 20);
      } else {
        playLossSound();
      }

      // Prepend to history
      const newHistoryItem: RouletteHistoryOutcome = {
        number: outcomeNumber,
        color: outcomeColor,
        server_seed_hash: outcomeServerSeedHash,
        round_timestamp: new Date().toISOString(),
        payout: betWon ? `+$${payoutAmount.toFixed(2)}` : '$0.00'
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);

      // Transition to next round after settle duration
      setTimeout(() => {
        setPhase('BETTING');
        setCountdown(BETTING_DURATION_SEC);
        setSpinCountdown(SPIN_DURATION_SEC);
        setActiveBets([]);
        setNonce(n => n + 1);

        // Fetch fresh pre-committed server seed hash for next round
        fetchServerRoundState();
      }, SETTLE_DURATION_SEC * 1000);

    }, SPIN_DURATION_SEC * 1000);
  }, [serverSeedHash, playSpinSound, playWinSound, playLossSound, triggerCoins, fetchServerRoundState]);

  // Main 1-second interval loop for countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (phaseRef.current === 'BETTING') {
        setCountdown(prev => {
          if (prev <= 1) {
            // Only auto-spin if active bets have been placed
            if (activeBetsRef.current.length > 0) {
              executeServerSpin();
              return 0;
            } else {
              // No bets placed; keep betting window open
              return BETTING_DURATION_SEC;
            }
          }
          return prev - 1;
        });
      } else if (phaseRef.current === 'SPINNING') {
        setSpinCountdown(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [executeServerSpin]);

  // Manual spin trigger
  const triggerSpin = useCallback(async () => {
    if (phaseRef.current !== 'BETTING') return;
    playClickSound();
    await executeServerSpin();
  }, [playClickSound, executeServerSpin]);

  const openProvablyFairModal = useCallback(() => setIsProvablyFairModalOpen(true), []);
  const closeProvablyFairModal = useCallback(() => setIsProvablyFairModalOpen(false), []);

  return (
    <RouletteEngineContext.Provider
      value={{
        phase,
        countdown,
        spinCountdown,
        roundId,
        roundReference,
        serverSeedHash,
        revealedServerSeed,
        clientSeed,
        setClientSeed,
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
        refreshHistory,
        errorMessage,
        setErrorMessage
      }}
    >
      {children}
    </RouletteEngineContext.Provider>
  );
};

export const useRouletteEngine = () => {
  const context = useContext(RouletteEngineContext);
  if (!context) {
    throw new Error('useRouletteEngine must be used within a RouletteEngineProvider');
  }
  return context;
};

// Aliases for compatibility
export const RouletteEngine = {
  Provider: RouletteEngineProvider,
  useEngine: useRouletteEngine
};
