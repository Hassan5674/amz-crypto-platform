// AMZDistributor Games Platform Types & Interfaces

export type GameCategory = 'CARDS' | 'DICE' | 'CRASH' | 'SLOTS' | 'CASUAL' | 'ROULETTE' | 'TABLE' | 'PROBABILISTIC';

export type GameStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';

export interface GameDefinition {
  id: number;
  slug: string;
  name: string;
  displayName: string;
  description: string;
  category: GameCategory;
  iconName: string;
  thumbnail: string;
  banner?: string;
  status: GameStatus;
  currency: string;
  minBet: number;
  maxBet: number;
  maxMultiplier: string;
  configuredRtp: number; // e.g. 98.50%
  houseEdge: string; // e.g. "1.50%"
  minAllowedRtp: number;
  maxAllowedRtp: number;
  sortOrder: number;
  featured: boolean;
  isNew: boolean;
  soundEnabled: boolean;
  mobileAvailable: boolean;
  desktopAvailable: boolean;
  rules: string[];
  history: string;
  strategy: string;
  version: number;
}

export interface GameBetRequest {
  gameSlug: string;
  stake: number;
  selection?: string | number | Record<string, unknown>;
  currency?: string;
  clientSeed?: string;
}

export interface GameBetResult {
  success: boolean;
  betId: number | string;
  roundReference: string;
  gameSlug: string;
  stake: number;
  payout: number;
  multiplier: number;
  won: boolean;
  outcomeData: Record<string, unknown>;
  newBalance: number;
  serverSeedHash?: string;
  revealedServerSeed?: string;
  clientSeed?: string;
  nonce?: number;
  errorMessage?: string;
}

export interface GameHistoryItem {
  id: string | number;
  game: string;
  gameSlug: string;
  bet: number;
  win: number;
  multiplier: number;
  timestamp: number | string;
  won: boolean;
  outcome?: string;
}

export interface WinCelebration {
  profit: number;
  multiplier: number;
  game: string;
}

export interface GameRtpAuditEntry {
  id: number;
  gameSlug: string;
  gameName: string;
  previousRtp: number;
  newRtp: number;
  previousHouseEdge: string;
  newHouseEdge: string;
  adminEmail: string;
  timestamp: string;
  reason?: string;
}
