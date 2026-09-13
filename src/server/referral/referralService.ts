// Phase 8: Referral, Affiliate & Bonus Engine Services

import { dataStore } from '../dataStore.js';
import { accountService } from '../finance/accountService.js';
import { financialTransactionService } from '../finance/transactionService.js';
import { Decimal } from '../finance/decimal.js';
import {
  ReferralCode,
  ReferralRelationship,
  AffiliateCommission,
  AffiliateCommissionRule,
  BonusCampaign,
  UserBonus,
  QualifyingEventType
} from '../../types/referral.js';
import { logger } from '../logger.js';
import crypto from 'crypto';

export class ReferralService {
  /**
   * Generates or retrieves referral code for a user.
   */
  public static getOrCreateReferralCode(userId: number): ReferralCode {
    let codeEntry = dataStore.referralCodes.find(c => c.user_id === userId);
    if (!codeEntry) {
      const user = dataStore.users.find(u => u.id === userId);
      const prefix = user?.username ? user.username.slice(0, 4).toUpperCase() : 'REF';
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const code = `${prefix}${randomSuffix}`;

      const nextId = dataStore.referralCodes.length > 0 ? Math.max(...dataStore.referralCodes.map(c => c.id)) + 1 : 1;
      codeEntry = {
        id: nextId,
        user_id: userId,
        code,
        status: 'ACTIVE',
        campaign_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null
      };
      dataStore.referralCodes.push(codeEntry);
    }
    return codeEntry;
  }

  /**
   * Attaches a referred user to a referrer via code.
   */
  public static attributeReferral(referredUserId: number, referralCode: string, source: string = 'DIRECT_LINK'): ReferralRelationship | null {
    const codeObj = dataStore.referralCodes.find(c => c.code.toUpperCase() === referralCode.toUpperCase() && c.status === 'ACTIVE');
    if (!codeObj || codeObj.user_id === referredUserId) {
      return null; // Invalid or self-referral
    }

    // Check if already attributed
    const existing = dataStore.referralRelationships.find(r => r.referred_user_id === referredUserId);
    if (existing) {
      return existing; // Primary referrer already locked
    }

    const nextId = dataStore.referralRelationships.length > 0 ? Math.max(...dataStore.referralRelationships.map(r => r.id)) + 1 : 1;
    const relationship: ReferralRelationship = {
      id: nextId,
      referrer_user_id: codeObj.user_id,
      referred_user_id: referredUserId,
      referral_code_id: codeObj.id,
      attribution_source: source,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    dataStore.referralRelationships.push(relationship);
    logger.info('FINANCE', `User #${referredUserId} successfully attributed to referrer #${codeObj.user_id} via code ${codeObj.code}`);
    return relationship;
  }

  /**
   * Triggers commission calculation upon a qualifying event.
   */
  public static processQualifyingEvent(
    referredUserId: number,
    eventType: QualifyingEventType,
    eventAmount: string,
    currency: string
  ): AffiliateCommission | null {
    const relationship = dataStore.referralRelationships.find(r => r.referred_user_id === referredUserId && r.status === 'ACTIVE');
    if (!relationship) return null;

    const rule = dataStore.affiliateCommissionRules.find(r => r.event_type === eventType && r.status === 'ACTIVE');
    if (!rule) return null;

    const amountDec = Decimal.fromString(eventAmount);
    const minAmountDec = Decimal.fromString(rule.minimum_event_amount);
    if (amountDec.compareTo(minAmountDec) < 0) {
      return null; // Below qualifying minimum
    }

    let commissionAmountDec = Decimal.zero();
    if (rule.calculation_type === 'PERCENTAGE') {
      const rateDec = Decimal.fromString(rule.rate);
      commissionAmountDec = amountDec.multiply(rateDec).divide('100');
    } else {
      commissionAmountDec = Decimal.fromString(rule.fixed_amount);
    }

    if (rule.maximum_commission) {
      const maxDec = Decimal.fromString(rule.maximum_commission);
      if (commissionAmountDec.compareTo(maxDec) > 0) {
        commissionAmountDec = maxDec;
      }
    }

    const nextId = dataStore.affiliateCommissions.length > 0 ? Math.max(...dataStore.affiliateCommissions.map(c => c.id)) + 1 : 1;
    const publicRef = `COM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const holdUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day hold period for security & reversal protection

    const commission: AffiliateCommission = {
      id: nextId,
      public_reference: publicRef,
      referrer_user_id: relationship.referrer_user_id,
      referred_user_id: referredUserId,
      rule_id: rule.id,
      rule_version: rule.version,
      qualifying_event_type: eventType,
      qualifying_amount: eventAmount,
      commission_rate: rule.rate,
      commission_amount: commissionAmountDec.toString(),
      currency: currency.toUpperCase(),
      status: 'PENDING',
      hold_until: holdUntilDate.toISOString(),
      ledger_transaction_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dataStore.affiliateCommissions.push(commission);
    logger.info('FINANCE', `Created PENDING affiliate commission #${commission.id} for referrer #${relationship.referrer_user_id} (${commission.commission_amount} ${currency})`);
    return commission;
  }

  /**
   * Approves a pending commission and posts it to the ledger (making it available).
   */
  public static approveCommission(commissionId: number, adminUserId: number): AffiliateCommission {
    const commission = dataStore.affiliateCommissions.find(c => c.id === commissionId);
    if (!commission) {
      throw new Error('Commission not found.');
    }
    if (commission.status !== 'PENDING') {
      throw new Error(`Cannot approve commission in status: ${commission.status}`);
    }

    const currency = commission.currency;
    const amountStr = commission.commission_amount;
    const referrerId = commission.referrer_user_id;

    // Post to ledger: SYSTEM_FEES -> USER_AVAILABLE (using SYSTEM_FEES or SYSTEM_CLEARING as established system account)
    const availableAcc = accountService.getUserAccount(referrerId, 'USER_AVAILABLE', currency);
    const expenseAcc = accountService.getSystemAccount('SYSTEM_FEES', currency);

    const idempotencyKey = `approve_commission_${commission.id}_${Date.now()}`;
    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'ADJUSTMENT',
        currency,
        amount: amountStr,
        description: `Affiliate commission approval #${commission.public_reference}`,
        idempotency_key: idempotencyKey,
        created_by: adminUserId
      },
      [
        {
          account_id: expenseAcc.id,
          entry_type: 'DEBIT',
          amount: amountStr,
          description: `Debit affiliate commission expense`
        },
        {
          account_id: availableAcc.id,
          entry_type: 'CREDIT',
          amount: amountStr,
          description: `Credit referrer available balance for approved commission`
        }
      ]
    );

    commission.status = 'AVAILABLE';
    commission.ledger_transaction_id = tx.id;
    commission.updated_at = new Date().toISOString();

    logger.info('FINANCE', `Commission #${commission.id} approved and posted to ledger for user #${referrerId}`);
    return commission;
  }

  /**
   * Claims a promotional bonus campaign for a user.
   */
  public static claimBonus(userId: number, campaignId: number): UserBonus {
    const campaign = dataStore.bonusCampaigns.find(c => c.id === campaignId && c.status === 'ACTIVE');
    if (!campaign) {
      throw new Error('Bonus campaign is not active or does not exist.');
    }

    // Check duplicate claim
    const existing = dataStore.userBonuses.find(b => b.user_id === userId && b.campaign_id === campaignId);
    if (existing) {
      throw new Error('You have already claimed this bonus campaign.');
    }

    const nextId = dataStore.userBonuses.length > 0 ? Math.max(...dataStore.userBonuses.map(b => b.id)) + 1 : 1;
    const publicRef = `BNS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days expiry

    const userBonus: UserBonus = {
      id: nextId,
      public_reference: publicRef,
      user_id: userId,
      campaign_id: campaignId,
      bonus_type: campaign.bonus_type,
      amount: campaign.amount,
      currency: campaign.currency,
      status: 'ACTIVE',
      expires_at: expiresAt,
      ledger_transaction_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dataStore.userBonuses.push(userBonus);
    logger.info('FINANCE', `User #${userId} claimed bonus campaign #${campaignId} (${campaign.amount} ${campaign.currency})`);
    return userBonus;
  }
}
