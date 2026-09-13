// Phase 7: Professional Staking Engine & Rewards Types

export type StakingPoolStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export type StakingRewardModel = 'FIXED_RATE' | 'SIMPLE_RATE' | 'PERIODIC_RATE' | 'COMPOUNDING_RATE';

export type StakingRewardFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_MATURITY';

export interface StakingPoolVersion {
  id: number;
  pool_id: number;
  version_number: number;
  reward_model: StakingRewardModel;
  reward_rate: string; // Annualized rate decimal string, e.g. "8.50"
  reward_frequency: StakingRewardFrequency;
  minimum_stake: string; // decimal string
  maximum_stake: string; // decimal string
  lock_period_days: number;
  cooldown_period_days: number;
  early_unstake_allowed: boolean;
  early_unstake_fee: string; // percentage or fixed decimal string
  compound_enabled: boolean;
  claim_enabled: boolean;
  unstake_enabled: boolean;
  terms_version: number;
  disclosure_version: number;
  effective_from: string;
  effective_until: string | null;
  created_by: number;
  created_at: string;
}

export interface StakingPool {
  id: number;
  public_id: string;
  name: string;
  slug: string;
  description: string;
  asset: string; // e.g. "ETH", "USDT", "BTC"
  currency: string; // e.g. "USD"
  current_version_id: number;
  status: StakingPoolStatus;
  display_order: number;
  max_pool_capacity: string | null; // null for unlimited
  current_utilization: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  versions?: StakingPoolVersion[];
  active_version?: StakingPoolVersion;
}

export type UserStakeStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COOLDOWN'
  | 'UNSTAKED'
  | 'MATURED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EARLY_UNSTAKED';

export interface UserStake {
  id: number;
  public_reference: string;
  user_id: number;
  pool_id: number;
  pool_version_id: number;
  asset: string;
  currency: string;
  principal_amount: string;
  accrued_reward: string;
  claimed_reward: string;
  compounded_reward: string;
  current_staked_amount: string; // principal + compounded rewards
  start_at: string;
  lock_until: string;
  cooldown_until: string | null;
  maturity_at: string;
  last_accrual_at: string;
  status: UserStakeStatus;
  auto_compound: boolean;
  disclosure_version: number;
  terms_version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  pool_name?: string;
  pool_version_number?: number;
  reward_model?: StakingRewardModel;
  reward_rate?: string;
}

export interface StakingRewardAccrual {
  id: number;
  stake_id: number;
  pool_version_id: number;
  period_start: string;
  period_end: string;
  principal_used: string;
  rate_applied: string;
  reward_amount: string;
  calculation_metadata: Record<string, unknown>;
  status: 'ACCRUED' | 'CLAIMED' | 'COMPOUNDED' | 'FORFEITED';
  ledger_transaction_id: number | null;
  created_at: string;
}

export type StakingEventType =
  | 'STAKE_CREATED'
  | 'STAKE_ACTIVATED'
  | 'REWARD_ACCRUED'
  | 'REWARD_CLAIMED'
  | 'REWARD_COMPOUNDED'
  | 'UNSTAKE_REQUESTED'
  | 'COOLDOWN_STARTED'
  | 'UNSTAKED'
  | 'EARLY_UNSTAKED'
  | 'MATURITY_REACHED'
  | 'PRINCIPAL_RELEASED'
  | 'STAKE_COMPLETED'
  | 'CANCELLED';

export interface StakingEvent {
  id: number;
  stake_id: number;
  event_type: StakingEventType;
  amount: string | null;
  currency: string;
  timestamp: string;
  actor_user_id: number | null;
  metadata: Record<string, unknown>;
  ledger_transaction_id: number | null;
  idempotency_key: string;
}
