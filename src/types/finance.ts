// Phase 3: Double-Entry Financial Ledger & Wallet Types
export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'RESTRICTED' | 'CLOSED';

export type LedgerAccountType =
  // User Accounts
  | 'USER_AVAILABLE'
  | 'USER_LOCKED'
  | 'USER_INVESTMENT'
  | 'USER_STAKING'
  | 'USER_BONUS'
  // System Accounts
  | 'SYSTEM_CASH'
  | 'SYSTEM_CLEARING'
  | 'SYSTEM_FEES'
  | 'SYSTEM_INVESTMENT_LIABILITY'
  | 'SYSTEM_STAKING_LIABILITY'
  | 'SYSTEM_GAME_SETTLEMENT';

export type LedgerTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INVESTMENT'
  | 'INVESTMENT_RETURN'
  | 'STAKING'
  | 'STAKING_REWARD'
  | 'GAME_BET'
  | 'GAME_PAYOUT'
  | 'FEE'
  | 'BONUS'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'REVERSAL'
  | 'LOCK_FUNDS'
  | 'UNLOCK_FUNDS';

export type LedgerTransactionStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'REVERSED' | 'CANCELLED';

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface Wallet {
  id: number;
  uuid: string;
  user_id: number;
  currency: string;
  status: WalletStatus;
  // Derived/cached balances for performance - reconcilable against ledger
  cached_balances?: {
    available: string;
    locked: string;
    investment: string;
    staking: string;
    bonus: string;
    total: string;
    last_reconciled_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface LedgerAccount {
  id: number;
  uuid: string;
  account_code: string;
  account_type: LedgerAccountType;
  owner_user_id: number | null; // null for platform system accounts
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface LedgerTransaction {
  id: number;
  uuid: string;
  transaction_reference: string;
  transaction_type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  currency: string;
  amount: string; // Positive decimal string representing transaction nominal amount
  description: string;
  idempotency_key: string | null;
  external_reference: string | null;
  metadata: Record<string, unknown>;
  related_transaction_id: number | null;
  created_by: number | null;
  created_at: string;
  posted_at: string | null;
  reversed_at: string | null;
  entries?: LedgerEntry[];
}

export interface LedgerEntry {
  id: number;
  transaction_id: number;
  ledger_account_id: number;
  entry_type: LedgerEntryType;
  amount: string; // Positive decimal string, strictly > 0, never negative
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  // Populated dynamically in queries
  account_code?: string;
  account_type?: LedgerAccountType;
}

export type AdjustmentStatus = 'REQUESTED' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'POSTED';

export interface ManualAdjustmentRequest {
  id: number;
  uuid: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  currency: string;
  amount: string; // Positive decimal string
  direction: 'CREDIT' | 'DEBIT';
  target_account_type: 'USER_AVAILABLE' | 'USER_LOCKED' | 'USER_BONUS';
  reason: string;
  status: AdjustmentStatus;
  requested_by_user_id: number;
  requested_by_name?: string;
  reviewed_by_user_id: number | null;
  reviewed_by_name?: string;
  decision_reason: string | null;
  ledger_transaction_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface WalletBalancesDto {
  user_id: number;
  currency: string;
  wallet_status: WalletStatus;
  available: string;
  locked: string;
  investment: string;
  staking: string;
  bonus: string;
  total: string;
  last_reconciled_at: string;
  is_reconciled: boolean;
}

export interface ReconciliationReport {
  timestamp: string;
  status: 'RECONCILIATION PASSED' | 'RECONCILIATION FAILED';
  invariants_checked: number;
  invariants_passed: number;
  total_transactions_checked: number;
  total_entries_checked: number;
  total_accounts_checked: number;
  discrepancies: Array<{
    code: string;
    entity_id: string | number;
    description: string;
    severity: 'CRITICAL' | 'WARNING';
  }>;
  summary: {
    total_debits: string;
    total_credits: string;
    total_user_liabilities: string;
    total_system_assets: string;
    unbalanced_transactions_count: number;
    mismatched_wallet_cache_count: number;
  };
}

// Phase 5: Withdrawal & Payout System Types
export type WithdrawalStatus =
  | 'REQUESTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REVERSED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';

export type DestinationType = 'bank_account' | 'crypto_address' | 'paypal' | 'local_payout';

export interface WithdrawalDestination {
  id: number;
  uuid: string;
  user_id: number;
  type: DestinationType;
  currency: string;
  provider: string;
  display_name: string;
  masked_identifier: string;
  verification_status: 'VERIFIED' | 'PENDING' | 'COOLING_OFF' | 'DISABLED';
  is_default: boolean;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  disabled_at: string | null;
}

export interface WithdrawalRequest {
  id: number;
  uuid: string;
  public_reference: string;
  user_id: number;
  currency: string;
  requested_amount: string;
  fee_amount: string;
  net_amount: string;
  destination_id: number;
  destination_summary?: string;
  provider_id: string;
  provider_reference: string | null;
  status: WithdrawalStatus;
  risk_score: number;
  risk_level: RiskLevel;
  risk_reasons: string[];
  review_reason: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  failure_reason: string | null;
  ledger_transaction_id: number | null;
  settlement_ledger_transaction_id: number | null;
  requested_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  processing_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  reversed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalLimitConfig {
  currency: string;
  min_withdrawal: string;
  max_withdrawal_per_tx: string;
  daily_max: string;
  monthly_max: string;
}

