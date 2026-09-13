// Phase 9 & 10: Games Engine & Fairness Types

export type GameCategory = 'DICE' | 'COIN_FLIP' | 'CARD' | 'CARDS' | 'NUMBER' | 'ROULETTE' | 'CRASH' | 'SLOTS' | 'CASUAL' | 'TABLE' | 'PROBABILISTIC';

export type GameStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';

export type RoundStatus = 'OPEN' | 'BETTING' | 'CLOSED' | 'RESOLVING' | 'SETTLED' | 'CANCELLED' | 'VOID';

export type BetStatus = 'PENDING' | 'ACCEPTED' | 'WON' | 'LOST' | 'VOID' | 'REFUNDED' | 'CANCELLED';

export interface GameEntity {
  id: number;
  slug: string;
  name: string;
  display_name?: string;
  description: string;
  category: GameCategory;
  status: GameStatus;
  currency: string;
  min_bet: string;
  max_bet: string;
  house_edge_pct: string;
  configured_rtp_pct?: string;
  min_allowed_rtp?: string;
  max_allowed_rtp?: string;
  max_multiplier?: string;
  thumbnail_url?: string;
  banner_url?: string;
  icon_name?: string;
  sort_order?: number;
  is_featured?: boolean;
  is_new?: boolean;
  sound_enabled?: boolean;
  mobile_available?: boolean;
  desktop_available?: boolean;
  rules?: string[];
  history_text?: string;
  strategy_text?: string;
  current_version: number;
  created_at: string;
  updated_at?: string;
}

export interface GameRound {
  id: number;
  round_reference: string;
  game_id: number;
  game_version: number;
  currency: string;
  status: RoundStatus;
  server_seed: string; // revealed upon settlement
  server_seed_hash: string; // committed before betting
  client_seed: string;
  nonce: number;
  outcome_data: Record<string, unknown>;
  created_at: string;
  settled_at: string | null;
}

export interface GameBet {
  id: number;
  public_reference: string;
  user_id: number;
  round_id: number;
  game_id: number;
  game_version: number;
  currency: string;
  selection: string; // e.g. "OVER_50", "HEADS", "RED", "42"
  stake: string;
  multiplier: string;
  potential_payout: string;
  actual_payout: string;
  status: BetStatus;
  ledger_transaction_id: number | null;
  payout_ledger_transaction_id: number | null;
  idempotency_key: string;
  created_at: string;
  settled_at: string | null;
}

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'WAITING_FOR_INFORMATION' | 'RESOLVED' | 'REJECTED' | 'ESCALATED';

export interface GameDispute {
  id: number;
  user_id: number;
  bet_id: number;
  reason: string;
  status: DisputeStatus;
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityAuditLog {
  id: number;
  user_id: number;
  bet_id: number;
  game_id: number;
  action: 'BET' | 'SPIN' | 'SETTLEMENT';
  game_seed: string; // Server seed used for resolution
  server_seed_hash: string;
  server_seed: string;
  client_seed: string;
  nonce: number;
  outcome_result: string | number;
  final_payout: string;
  payout: string;
  round_timestamp: string;
  timestamp: string;
}
