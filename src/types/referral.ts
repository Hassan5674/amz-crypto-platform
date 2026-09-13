// Phase 8: Referral, Affiliate & Bonus Engine Types

export type ReferralStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'CANCELLED';

export interface ReferralCode {
  id: number;
  user_id: number;
  code: string;
  status: ReferralStatus;
  campaign_id: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface ReferralRelationship {
  id: number;
  referrer_user_id: number;
  referred_user_id: number;
  referral_code_id: number;
  attribution_source: string;
  status: ReferralStatus;
  created_at: string;
}

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'AVAILABLE' | 'PAID' | 'REJECTED' | 'REVERSED';

export type QualifyingEventType =
  | 'USER_REGISTERED'
  | 'EMAIL_VERIFIED'
  | 'KYC_COMPLETED'
  | 'FIRST_DEPOSIT_CONFIRMED'
  | 'QUALIFYING_DEPOSIT'
  | 'QUALIFYING_INVESTMENT'
  | 'QUALIFYING_STAKE';

export interface AffiliateCommissionRule {
  id: number;
  name: string;
  event_type: QualifyingEventType;
  calculation_type: 'PERCENTAGE' | 'FIXED' | 'TIERED';
  rate: string; // decimal percentage e.g. "5.00"
  fixed_amount: string;
  minimum_event_amount: string;
  maximum_commission: string | null;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommission {
  id: number;
  public_reference: string;
  referrer_user_id: number;
  referred_user_id: number;
  rule_id: number;
  rule_version: number;
  qualifying_event_type: QualifyingEventType;
  qualifying_amount: string;
  commission_rate: string;
  commission_amount: string;
  currency: string;
  status: CommissionStatus;
  hold_until: string;
  ledger_transaction_id: number | null;
  created_at: string;
  updated_at: string;
  referred_user_masked?: string;
  rule_name?: string;
}

export type BonusType = 'WELCOME_BONUS' | 'DEPOSIT_BONUS' | 'REFERRAL_BONUS' | 'PROMOTIONAL_BONUS' | 'CAMPAIGN_BONUS';

export interface BonusCampaign {
  id: number;
  name: string;
  code: string;
  description: string;
  bonus_type: BonusType;
  reward_type: 'PERCENTAGE' | 'FIXED';
  amount: string; // fixed or percentage rate
  currency: string;
  minimum_qualifying_amount: string;
  maximum_bonus: string | null;
  total_budget: string | null;
  awarded_budget: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
  terms_version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type UserBonusStatus = 'PENDING' | 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';

export interface UserBonus {
  id: number;
  public_reference: string;
  user_id: number;
  campaign_id: number;
  bonus_type: BonusType;
  amount: string;
  currency: string;
  status: UserBonusStatus;
  expires_at: string;
  ledger_transaction_id: number | null;
  created_at: string;
  updated_at: string;
  campaign_name?: string;
}
