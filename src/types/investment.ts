// Phase 6: Configurable Investment Plan Engine Types

export type InvestmentPlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type ReturnModelType = 'FIXED_RATE' | 'PERIODIC_RATE' | 'SIMPLE_RETURN';

export type DurationUnit = 'DAYS' | 'MONTHS' | 'YEARS';

export type ReturnFrequency = 'ON_MATURITY' | 'MONTHLY' | 'DAILY';

export type InvestmentRiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'DYNAMIC';

export interface InvestmentPlanVersion {
  id: number;
  plan_id: number;
  version_number: number;
  minimum_amount: string; // decimal string
  maximum_amount: string; // decimal string
  duration: number;
  duration_unit: DurationUnit;
  lock_period: number; // days
  return_model: ReturnModelType;
  return_rate: string; // e.g. "10.00" for 10%
  return_frequency: ReturnFrequency;
  early_exit_allowed: boolean;
  early_exit_fee: string; // decimal string or percentage e.g. "2.00"
  early_exit_rules: string;
  auto_renew_allowed: boolean;
  fees_structure: {
    entry_fee_pct?: string;
    management_fee_pct?: string;
  };
  risk_level: InvestmentRiskLevel;
  risk_disclosure: string;
  terms_text: string;
  effective_from: string;
  effective_until: string | null;
  created_by: number;
  created_at: string;
}

export interface InvestmentPlan {
  id: number;
  public_id: string;
  name: string;
  slug: string;
  description: string;
  image_url?: string;
  currency: string;
  current_version_id: number;
  status: InvestmentPlanStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
  versions?: InvestmentPlanVersion[];
  active_version?: InvestmentPlanVersion;
}

export type UserInvestmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'MATURED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EARLY_EXIT'
  | 'FAILED';

export interface UserInvestment {
  id: number;
  public_reference: string;
  user_id: number;
  plan_id: number;
  plan_version_id: number;
  currency: string;
  principal_amount: string;
  expected_return: string;
  accrued_return: string;
  paid_return: string;
  maturity_amount: string;
  start_at: string;
  maturity_at: string;
  lock_until: string;
  status: UserInvestmentStatus;
  auto_renew: boolean;
  disclosure_version: number;
  terms_version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  plan_name?: string;
  plan_version_number?: number;
  return_model?: ReturnModelType;
  return_rate?: string;
}

export type InvestmentEventType =
  | 'CREATED'
  | 'ACTIVATED'
  | 'RETURN_ACCRUED'
  | 'RETURN_PAID'
  | 'MATURITY_REACHED'
  | 'PRINCIPAL_RELEASED'
  | 'EARLY_EXIT_REQUESTED'
  | 'EARLY_EXIT_COMPLETED'
  | 'CANCELLED'
  | 'AUTO_RENEWED';

export interface InvestmentEvent {
  id: number;
  investment_id: number;
  event_type: InvestmentEventType;
  amount: string | null;
  currency: string;
  timestamp: string;
  actor_user_id: number | null;
  metadata: Record<string, unknown>;
  ledger_transaction_id: number | null;
  idempotency_key: string;
}
