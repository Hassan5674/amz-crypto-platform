import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { audio } from '../utils/audioEngine.js';
import { GameHistoryItem, WinCelebration } from '../types.js';
import { GameAdapter } from '../adapters/GameAdapter.js';

interface CasinoSettings {
  confirmLargeBets: boolean;
  winEffectsEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  fastMode?: boolean;
}

interface CasinoState {
  balance: number;
  currency: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  gamesPlayed: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
  globalBet: number;
  history: GameHistoryItem[];
  settings: CasinoSettings;
  adminSettings?: any;
  isAuthoritativeWallet: boolean;
}

type CasinoAction =
  | { type: 'SET_BALANCE'; balance: number }
  | { type: 'PLACE_BET'; amount: number; game: string }
  | { type: 'ADD_WIN'; amount: number; bet: number; game: string; multiplier: number; outcome?: string }
  | { type: 'ADD_LOSS'; amount: number; game: string; outcome?: string }
  | { type: 'SET_GLOBAL_BET'; amount: number }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<CasinoSettings> }
  | { type: 'RESET_STATS' }
  | { type: 'LOAD_HISTORY'; history: GameHistoryItem[] };

const initialSettings: CasinoSettings = {
  confirmLargeBets: true,
  winEffectsEnabled: true,
  soundEnabled: true,
  soundVolume: 0.35
};

const initialState: CasinoState = {
  balance: 0.00, // Real user balance, defaults to 0 unless deposited or synced from backend
  currency: 'USD',
  totalBets: 0,
  totalWins: 0,
  totalLosses: 0,
  gamesPlayed: 0,
  biggestWin: 0,
  currentStreak: 0,
  bestStreak: 0,
  globalBet: 10,
  history: [],
  settings: initialSettings,
  isAuthoritativeWallet: false
};

function casinoReducer(state: CasinoState, action: CasinoAction): CasinoState {
  switch (action.type) {
    case 'SET_BALANCE':
      return { ...state, balance: Math.max(0, action.balance) };

    case 'SET_GLOBAL_BET':
      return { ...state, globalBet: Math.max(0.1, action.amount) };

    case 'PLACE_BET': {
      const newBal = Math.max(0, state.balance - action.amount);
      return {
        ...state,
        balance: newBal,
        totalBets: state.totalBets + action.amount,
        gamesPlayed: state.gamesPlayed + 1
      };
    }

    case 'ADD_WIN': {
      const isActualWin = action.amount > 0;
      const netProfit = isActualWin ? action.amount - action.bet : -action.bet;
      // Stake was already deducted during PLACE_BET. Winnings are added to current balance.
      const newBal = state.balance + (isActualWin ? action.amount : 0);
      const newStreak = isActualWin ? (state.currentStreak > 0 ? state.currentStreak + 1 : 1) : 0;
      const newHistoryItem: GameHistoryItem = {
        id: `${isActualWin ? 'WIN' : 'LOSS'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        game: action.game,
        gameSlug: action.game.toLowerCase().replace(/\s+/g, '-'),
        bet: action.bet,
        win: action.amount,
        multiplier: action.multiplier,
        timestamp: new Date().toLocaleTimeString(),
        won: isActualWin,
        outcome: action.outcome || (isActualWin ? `Won +$${netProfit.toFixed(2)} (${action.multiplier.toFixed(2)}x)` : `Lost -$${action.bet.toFixed(2)}`)
      };

      return {
        ...state,
        balance: newBal,
        totalWins: isActualWin ? state.totalWins + action.amount : state.totalWins,
        totalLosses: !isActualWin ? state.totalLosses + action.bet : state.totalLosses,
        biggestWin: isActualWin ? Math.max(state.biggestWin, action.amount) : state.biggestWin,
        currentStreak: newStreak,
        bestStreak: Math.max(state.bestStreak, newStreak),
        history: [newHistoryItem, ...state.history.slice(0, 49)]
      };
    }

    case 'ADD_LOSS': {
      // Balance was already deducted during PLACE_BET.
      const newHistoryItem: GameHistoryItem = {
        id: `LOSS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        game: action.game,
        gameSlug: action.game.toLowerCase().replace(/\s+/g, '-'),
        bet: action.amount,
        win: 0,
        multiplier: 0,
        timestamp: new Date().toLocaleTimeString(),
        won: false,
        outcome: action.outcome || `Lost -$${action.amount.toFixed(2)}`
      };

      return {
        ...state,
        totalLosses: state.totalLosses + action.amount,
        currentStreak: 0,
        history: [newHistoryItem, ...state.history.slice(0, 49)]
      };
    }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.settings }
      };

    case 'RESET_STATS':
      return {
        ...state,
        totalBets: 0,
        totalWins: 0,
        totalLosses: 0,
        gamesPlayed: 0,
        biggestWin: 0,
        currentStreak: 0,
        history: []
      };

    case 'LOAD_HISTORY':
      return { ...state, history: action.history };

    default:
      return state;
  }
}

export interface InsufficientFundsNotice {
  isOpen: boolean;
  title: string;
  message: string;
  currentBalance: number;
  betAmount: number;
  currency: string;
  game: string;
  timestamp: number;
}

interface CasinoContextValue {
  state: CasinoState;
  placeBet: (amount: number, game: string, selection?: unknown) => Promise<boolean> | boolean;
  play: (
    betAmount: number,
    game: string,
    triggerGameSession?: () => void | Promise<void>,
    selection?: unknown
  ) => Promise<boolean>;
  validateBalance: (betAmount: number, game?: string) => boolean;
  insufficientFundsNotice: InsufficientFundsNotice | null;
  showInsufficientFundsNotification: (betAmount: number, currentBalance?: number, game?: string) => void;
  dismissInsufficientFundsNotice: () => void;
  isDepositModalOpen: boolean;
  openDepositModal: () => void;
  closeDepositModal: () => void;
  addWin: (amount: number, bet: number, game: string, multiplier: number, outcome?: string) => void;
  addLoss: (amount: number, game: string, outcome?: string) => void;
  setGlobalBet: (amount: number) => void;
  setBalance: (amount: number) => void;
  updateSettings: (settings: Partial<CasinoSettings>) => void;
  toggleSound: () => void;
  setVolume: (vol: number) => void;
  resetStats: () => void;
  winEffect: WinCelebration | null;
  clearWinEffect: () => void;
  refreshBackendBalance: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  reloadPracticeChips: (amount?: number) => void;
  getGameWinRate: (gameSlugOrName: string) => number;
  shouldGameWin: (gameSlugOrName: string) => boolean;
  checkWinAllowed: (gameSlugOrName: string) => boolean;
  gameRtpConfigs: Record<string, number>;
}

const CasinoContext = createContext<CasinoContextValue | null>(null);

export const CasinoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(casinoReducer, initialState);
  const [winEffect, setWinEffect] = useState<WinCelebration | null>(null);
  const [insufficientFundsNotice, setInsufficientFundsNotice] = useState<InsufficientFundsNotice | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [gameRtpConfigs, setGameRtpConfigs] = useState<Record<string, number>>({});
  const { user, isAuthenticated } = useAuth();

  // Sync game configurations (RTP, house edge) from server
  const fetchGameConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const json = await res.json();
        const gamesList = json.data?.games || json.data || [];
        if (Array.isArray(gamesList)) {
          const map: Record<string, number> = {};
          gamesList.forEach((g: any) => {
            if (g.slug) {
              const rtp = g.configured_rtp_pct !== undefined ? parseFloat(g.configured_rtp_pct) : 98.0;
              map[g.slug.toLowerCase()] = isNaN(rtp) ? 98.0 : rtp;
              if (g.name) {
                map[g.name.toLowerCase().replace(/\s+/g, '-')] = isNaN(rtp) ? 98.0 : rtp;
                map[g.name.toLowerCase()] = isNaN(rtp) ? 98.0 : rtp;
              }
            }
          });
          setGameRtpConfigs(map);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchGameConfigs();
  }, [fetchGameConfigs]);

  const getGameWinRate = useCallback((gameSlugOrName: string): number => {
    const raw = String(gameSlugOrName || '').toLowerCase().trim();
    const slug = raw.replace(/\s+/g, '-');
    if (gameRtpConfigs[slug] !== undefined) return gameRtpConfigs[slug];
    if (gameRtpConfigs[raw] !== undefined) return gameRtpConfigs[raw];
    return 98.0;
  }, [gameRtpConfigs]);

  const shouldGameWin = useCallback((gameSlugOrName: string): boolean => {
    const winRate = getGameWinRate(gameSlugOrName);
    if (winRate <= 0) return false;
    if (winRate >= 100) return true;
    return (Math.random() * 100) < winRate;
  }, [getGameWinRate]);

  const checkWinAllowed = useCallback((gameSlugOrName: string): boolean => {
    return shouldGameWin(gameSlugOrName);
  }, [shouldGameWin]);

  // Dismiss notification
  const dismissInsufficientFundsNotice = useCallback(() => {
    setInsufficientFundsNotice(null);
  }, []);

  // Display clear Insufficient Funds notification
  const showInsufficientFundsNotification = useCallback((
    betAmount: number,
    currentBalance?: number,
    game: string = 'Game'
  ) => {
    const bal = currentBalance !== undefined ? currentBalance : state.balance;
    const cleanBet = Math.max(0.01, Number(betAmount) || 0);
    setInsufficientFundsNotice({
      isOpen: true,
      title: 'Insufficient Funds',
      message: `Your available balance (${bal.toFixed(2)} USD) is insufficient for this wager (${cleanBet.toFixed(2)} USD). You must have sufficient balance before starting a game session.`,
      currentBalance: bal,
      betAmount: cleanBet,
      currency: state.currency || 'USD',
      game,
      timestamp: Date.now()
    });
    audio.playTone(180, 0.25, 'sine', 0.4);
  }, [state.balance, state.currency]);

  const openDepositModal = useCallback(() => {
    setIsDepositModalOpen(true);
  }, []);

  const closeDepositModal = useCallback(() => {
    setIsDepositModalOpen(false);
  }, []);

  // Sync with authoritative backend user wallet
  const syncAuthoritativeBalance = useCallback(async () => {
    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token');
      if (!token) return;
      const res = await fetch('/api/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const rawBal = data.data?.available ??
          data.data?.balance ??
          data.data?.wallet?.balances?.available ??
          data.data?.wallet?.available_balance ??
          data.data?.balances?.available ??
          data.data?.available_balance;
        if (rawBal !== undefined) {
          const avail = parseFloat(rawBal);
          if (!isNaN(avail)) {
            dispatch({ type: 'SET_BALANCE', balance: avail });
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    syncAuthoritativeBalance();
  }, [syncAuthoritativeBalance, isAuthenticated, user?.id]);

  // Window focus and balance update listeners to refresh authoritative balance seamlessly
  useEffect(() => {
    const handleBalanceRefresh = () => {
      syncAuthoritativeBalance();
    };
    window.addEventListener('focus', handleBalanceRefresh);
    window.addEventListener('balance_updated', handleBalanceRefresh);
    window.addEventListener('storage', handleBalanceRefresh);
    return () => {
      window.removeEventListener('focus', handleBalanceRefresh);
      window.removeEventListener('balance_updated', handleBalanceRefresh);
      window.removeEventListener('storage', handleBalanceRefresh);
    };
  }, [syncAuthoritativeBalance]);

  // Load sound settings from storage
  useEffect(() => {
    try {
      const savedSound = localStorage.getItem('amz_casino_sound');
      const savedVol = localStorage.getItem('amz_casino_vol');
      if (savedSound !== null) {
        const enabled = savedSound === 'true';
        audio.setEnabled(enabled);
        dispatch({ type: 'UPDATE_SETTINGS', settings: { soundEnabled: enabled } });
      }
      if (savedVol !== null) {
        const vol = parseFloat(savedVol);
        if (!isNaN(vol)) {
          audio.setVolume(vol);
          dispatch({ type: 'UPDATE_SETTINGS', settings: { soundVolume: vol } });
        }
      }
    } catch {}
  }, []);

  const refreshBackendBalance = async () => {
    await syncAuthoritativeBalance();
  };

  /**
   * Validates if current balance is sufficient for wager without starting a game.
   */
  const validateBalance = useCallback((betAmount: number, game: string = 'Game'): boolean => {
    const currentBalance = Number(state.balance);
    const num = Number(betAmount);
    if (isNaN(num) || num <= 0 || currentBalance < num) {
      showInsufficientFundsNotification(Math.max(1, isNaN(num) ? 0 : num), currentBalance, game);
      return false;
    }
    return true;
  }, [state.balance, showInsufficientFundsNotification]);

  /**
   * Places bet and updates engine state only after verifying currentBalance >= betAmount.
   */
  const placeBet = useCallback((amount: number, game: string, selection?: unknown): boolean => {
    const num = Number(amount);
    const currentBalance = Number(state.balance);

    if (isNaN(num) || num <= 0) {
      showInsufficientFundsNotification(Math.max(1, isNaN(num) ? 0 : num), currentBalance, game);
      return false;
    }

    // Strict balance validation check
    if (currentBalance < num) {
      showInsufficientFundsNotification(num, currentBalance, game);
      return false; // Prevent game interaction, block unauthorized play
    }

    // Dismiss any previous notice on successful validation
    dismissInsufficientFundsNotice();

    // State is only updated after verification passes
    dispatch({ type: 'PLACE_BET', amount: num, game });
    audio.playBet();

    // If authenticated, fire authoritative background transaction or sync
    if (isAuthenticated && user) {
      const slug = game.toLowerCase().replace(/\s+/g, '-');
      GameAdapter.placeServerBet({
        gameSlug: slug,
        stake: num,
        selection: typeof selection === 'object' ? JSON.stringify(selection) : String(selection || 'PLAY'),
        currency: state.currency
      }).then(res => {
        if (res.success && typeof res.newBalance === 'number') {
          // Sync exact authoritative balance
          dispatch({ type: 'SET_BALANCE', balance: res.newBalance });
        } else {
          if (res.errorMessage && res.errorMessage.toLowerCase().includes('insufficient')) {
            showInsufficientFundsNotification(num, state.balance, game);
          }
          // Re-sync balance from backend on rejection
          syncAuthoritativeBalance();
        }
      }).catch(() => {
        syncAuthoritativeBalance();
      });
    }

    return true;
  }, [state.balance, state.currency, isAuthenticated, user, showInsufficientFundsNotification, dismissInsufficientFundsNotice, syncAuthoritativeBalance]);

  /**
   * Core Gaming Engine 'play' logic.
   * Integrates a balance validation check inside the 'play' logic:
   * Before any game session is triggered or state is updated, verify 'currentBalance >= betAmount'.
   * If the balance is insufficient, prevent the game interaction and display a clear 'Insufficient Funds'
   * notification to the user, blocking any unauthorized play without money.
   */
  const play = useCallback(async (
    betAmount: number,
    game: string,
    triggerGameSession?: () => void | Promise<void>,
    selection?: unknown
  ): Promise<boolean> => {
    const num = Number(betAmount);
    const currentBalance = Number(state.balance);

    // 1. Core balance validation check: currentBalance >= betAmount
    if (isNaN(num) || num <= 0 || currentBalance < num) {
      // Prevent game interaction & display clear 'Insufficient Funds' notification
      showInsufficientFundsNotification(Math.max(1, isNaN(num) ? 0 : num), currentBalance, game);
      return false; // Blocks unauthorized play without money
    }

    // 2. Clear any prior notification
    dismissInsufficientFundsNotice();

    // 3. Confirm and update state
    const confirmed = await placeBet(num, game, selection);
    if (!confirmed) {
      return false;
    }

    // 4. Trigger game session ONLY after balance check passes and state is updated
    if (triggerGameSession) {
      try {
        await triggerGameSession();
      } catch (sessionErr) {
        console.error(`Error in game session [${game}]:`, sessionErr);
      }
    }

    return true;
  }, [state.balance, showInsufficientFundsNotification, dismissInsufficientFundsNotice, placeBet]);

  const addLoss = useCallback((amount: number, game: string, outcome?: string) => {
    const lossNum = Number(amount);
    dispatch({ type: 'ADD_LOSS', amount: lossNum, game, outcome });
    audio.playLose();

    // Persist loss outcome to ledger if authenticated
    if (isAuthenticated) {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token');
      const gameSlug = game.toLowerCase().replace(/\s+/g, '-');
      fetch(`/api/games/${gameSlug}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          won: false,
          payout: 0,
          stake: lossNum,
          multiplier: 0,
          outcome: outcome || 'LOSS',
          currency: state.currency || 'USD'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.new_balance) {
          const nb = parseFloat(data.data.new_balance);
          dispatch({ type: 'SET_BALANCE', balance: nb });
          window.dispatchEvent(new CustomEvent('balance_updated', { detail: { balance: nb } }));
        }
      })
      .catch(() => {
        refreshBackendBalance().catch(() => {});
      });
    }
  }, [state.currency, isAuthenticated, refreshBackendBalance]);

  const addWin = useCallback((amount: number, bet: number, game: string, multiplier: number, outcome?: string) => {
    let winNum = Number(amount);
    const betNum = Number(bet);
    let multNum = Number(multiplier);

    // Live Authoritative Win Rate (0% to 100%) Check
    const winRate = getGameWinRate(game);
    let isWin = winNum > 0;

    if (isWin) {
      if (winRate <= 0) {
        // 0% win rate: User NEVER wins
        isWin = false;
        winNum = 0;
        multNum = 0;
        outcome = outcome ? `${outcome} (House Edge 100%)` : 'Outcome settled: Loss (House edge 100%)';
      } else if (winRate < 100) {
        const roll = Math.random() * 100;
        if (roll >= winRate) {
          isWin = false;
          winNum = 0;
          multNum = 0;
          outcome = outcome ? `${outcome} (House Edge)` : 'Outcome settled: Loss';
        }
      }
    }

    if (!isWin) {
      addLoss(betNum, game, outcome);
      return;
    }

    dispatch({ type: 'ADD_WIN', amount: winNum, bet: betNum, game, multiplier: multNum, outcome });

    const profit = winNum - betNum;
    if (winNum > 0) {
      if (multNum >= 10 || profit >= 500) {
        audio.playBigWin();
      } else if (multNum >= 2 || profit >= 50) {
        audio.playWin();
      } else {
        audio.playCashout();
      }

      if (state.settings.winEffectsEnabled && (multNum >= 2 || profit >= 50)) {
        setWinEffect({ profit, multiplier: multNum, game });
      }
    } else {
      audio.playLose();
    }

    // Persist authoritative ledger payout if authenticated
    if (isAuthenticated) {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token');
      const gameSlug = game.toLowerCase().replace(/\s+/g, '-');
      fetch(`/api/games/${gameSlug}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          won: winNum > 0,
          payout: winNum,
          stake: betNum,
          multiplier: multNum,
          outcome: outcome || (winNum > 0 ? 'WIN' : 'LOSS'),
          currency: state.currency || 'USD'
        })
      })
      .then(res => res.json())
      .then(data => {
        const nb = parseFloat(data.data?.new_balance ?? data.data?.balance_after);
        if (!isNaN(nb)) {
          dispatch({ type: 'SET_BALANCE', balance: nb });
          window.dispatchEvent(new CustomEvent('balance_updated', { detail: { balance: nb } }));
        }
      })
      .catch(() => {
        refreshBackendBalance().catch(() => {});
      });
    }
  }, [getGameWinRate, addLoss, state.settings.winEffectsEnabled, state.currency, isAuthenticated, refreshBackendBalance]);

  const setGlobalBet = useCallback((amount: number) => {
    dispatch({ type: 'SET_GLOBAL_BET', amount: Number(amount) });
  }, []);

  const setBalance = useCallback((amount: number) => {
    dispatch({ type: 'SET_BALANCE', balance: Number(amount) });
  }, []);

  const reloadPracticeChips = useCallback((amount: number = 1000) => {
    dispatch({ type: 'SET_BALANCE', balance: amount });
    dismissInsufficientFundsNotice();
    try {
      localStorage.setItem('apex_player_balance', String(amount));
    } catch {}
    window.dispatchEvent(new CustomEvent('balance_updated', { detail: { balance: amount } }));
  }, [dismissInsufficientFundsNotice]);

  const updateSettings = useCallback((settings: Partial<CasinoSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
    if (settings.soundEnabled !== undefined) {
      audio.setEnabled(settings.soundEnabled);
      try { localStorage.setItem('amz_casino_sound', String(settings.soundEnabled)); } catch {}
    }
    if (settings.soundVolume !== undefined) {
      audio.setVolume(settings.soundVolume);
      try { localStorage.setItem('amz_casino_vol', String(settings.soundVolume)); } catch {}
    }
  }, []);

  const toggleSound = useCallback(() => {
    const next = !state.settings.soundEnabled;
    updateSettings({ soundEnabled: next });
    if (next) {
      audio.playClick();
    }
  }, [state.settings.soundEnabled, updateSettings]);

  const setVolume = useCallback((vol: number) => {
    updateSettings({ soundVolume: vol });
  }, [updateSettings]);

  const resetStats = useCallback(() => {
    dispatch({ type: 'RESET_STATS' });
  }, []);

  const clearWinEffect = useCallback(() => {
    setWinEffect(null);
  }, []);

  const value = useMemo(() => ({
    state,
    placeBet,
    play,
    validateBalance,
    insufficientFundsNotice,
    showInsufficientFundsNotification,
    dismissInsufficientFundsNotice,
    isDepositModalOpen,
    openDepositModal,
    closeDepositModal,
    addWin,
    addLoss,
    setGlobalBet,
    setBalance,
    updateSettings,
    toggleSound,
    setVolume,
    resetStats,
    winEffect,
    clearWinEffect,
    refreshBackendBalance,
    refreshBalance: refreshBackendBalance,
    reloadPracticeChips,
    getGameWinRate,
    shouldGameWin,
    checkWinAllowed,
    gameRtpConfigs
  }), [
    state,
    placeBet,
    play,
    validateBalance,
    insufficientFundsNotice,
    showInsufficientFundsNotification,
    dismissInsufficientFundsNotice,
    isDepositModalOpen,
    openDepositModal,
    closeDepositModal,
    addWin,
    addLoss,
    setGlobalBet,
    setBalance,
    updateSettings,
    toggleSound,
    setVolume,
    resetStats,
    winEffect,
    clearWinEffect,
    refreshBackendBalance,
    reloadPracticeChips,
    getGameWinRate,
    shouldGameWin,
    checkWinAllowed,
    gameRtpConfigs
  ]);

  return (
    <CasinoContext.Provider value={value}>
      {children}
    </CasinoContext.Provider>
  );
};

export function useCasino() {
  const ctx = useContext(CasinoContext);
  if (!ctx) {
    throw new Error('useCasino must be used within a CasinoProvider');
  }
  return ctx;
}
