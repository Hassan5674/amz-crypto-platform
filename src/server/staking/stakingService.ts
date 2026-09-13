import { dataStore } from '../dataStore.js';
import { accountService } from '../finance/accountService.js';
import { financialTransactionService } from '../finance/transactionService.js';
import { Decimal } from '../finance/decimal.js';
import {
  StakingPool,
  StakingPoolVersion,
  UserStake,
  StakingRewardAccrual,
  StakingEvent,
  StakingRewardModel
} from '../../types/staking.js';
import { logger } from '../logger.js';
import crypto from 'crypto';

export class StakingRewardService {
  /**
   * Deterministic reward calculation using exact fixed-point Decimal arithmetic.
   */
  public static calculateReward(
    principal: string,
    annualizedRatePct: string,
    rewardModel: StakingRewardModel,
    periodDays: number
  ): { reward_amount: string; calculation_metadata: Record<string, unknown> } {
    const p = Decimal.fromString(principal);
    const ratePct = Decimal.fromString(annualizedRatePct);
    const rateDecimal = ratePct.divide('100');

    if (p.isZero() || p.isNegative() || rateDecimal.isZero() || periodDays <= 0) {
      return {
        reward_amount: '0.00000000',
        calculation_metadata: {
          model: rewardModel,
          period_days: periodDays,
          principal,
          rate: annualizedRatePct,
          method: 'ZERO_OR_INVALID'
        }
      };
    }

    // Formula: Principal * (Annual Rate / 365) * Period Days
    const dailyRate = rateDecimal.divide('365');
    const daysDec = Decimal.fromString(String(periodDays));
    const reward = p.multiply(dailyRate).multiply(daysDec);

    return {
      reward_amount: reward.toString(),
      calculation_metadata: {
        model: rewardModel,
        period_days: periodDays,
        principal,
        annualized_rate: annualizedRatePct,
        daily_rate: dailyRate.toString()
      }
    };
  }
}

export class StakingService {
  // ----------------------------------------------------
  // Pool Management
  // ----------------------------------------------------
  public static getPools(): StakingPool[] {
    return dataStore.stakingPoolEntities.map(pool => {
      const activeVersion = dataStore.stakingPoolVersions.find(v => v.id === pool.current_version_id);
      const versions = dataStore.stakingPoolVersions.filter(v => v.pool_id === pool.id);
      return {
        ...pool,
        active_version: activeVersion,
        versions
      };
    });
  }

  public static getPool(idOrSlug: string | number): StakingPool | null {
    const pool = dataStore.stakingPoolEntities.find(p => p.id === Number(idOrSlug) || p.slug === String(idOrSlug) || p.public_id === String(idOrSlug));
    if (!pool) return null;

    const activeVersion = dataStore.stakingPoolVersions.find(v => v.id === pool.current_version_id);
    const versions = dataStore.stakingPoolVersions.filter(v => v.pool_id === pool.id);
    return {
      ...pool,
      active_version: activeVersion,
      versions
    };
  }

  // ----------------------------------------------------
  // User Staking Operations
  // ----------------------------------------------------
  public static getUserStakes(userId: number): UserStake[] {
    return dataStore.userStakes.filter(s => s.user_id === userId).map(stake => {
      const pool = dataStore.stakingPoolEntities.find(p => p.id === stake.pool_id);
      const version = dataStore.stakingPoolVersions.find(v => v.id === stake.pool_version_id);
      return {
        ...stake,
        pool_name: pool?.name || 'Unknown Pool',
        pool_version_number: version?.version_number || 1,
        reward_model: version?.reward_model || 'FIXED_RATE',
        reward_rate: version?.reward_rate || '0.00'
      };
    }).sort((a, b) => b.id - a.id);
  }

  public static getStake(stakeId: number, userId?: number): UserStake | null {
    const stake = dataStore.userStakes.find(s => s.id === stakeId);
    if (!stake) return null;
    if (userId !== undefined && stake.user_id !== userId) return null;

    const pool = dataStore.stakingPoolEntities.find(p => p.id === stake.pool_id);
    const version = dataStore.stakingPoolVersions.find(v => v.id === stake.pool_version_id);

    return {
      ...stake,
      pool_name: pool?.name || 'Unknown Pool',
      pool_version_number: version?.version_number || 1,
      reward_model: version?.reward_model || 'FIXED_RATE',
      reward_rate: version?.reward_rate || '0.00'
    };
  }

  public static createStake(
    userId: number,
    poolId: number,
    amountStr: string,
    currency: string,
    autoCompound: boolean,
    ip: string,
    userAgent: string
  ): UserStake {
    const pool = this.getPool(poolId);
    if (!pool || pool.status !== 'ACTIVE') {
      throw new Error('Staking pool is not active or does not exist.');
    }
    const version = pool.active_version;
    if (!version) {
      throw new Error('No active version configured for this staking pool.');
    }

    const amount = Decimal.fromString(amountStr);
    const min = Decimal.fromString(version.minimum_stake);
    const max = Decimal.fromString(version.maximum_stake);

    if (amount.compareTo(min) < 0 || amount.compareTo(max) > 0) {
      throw new Error(`Stake amount must be between ${version.minimum_stake} and ${version.maximum_stake} ${currency}`);
    }

    // 1. Check pool capacity if set
    if (pool.max_pool_capacity) {
      const capacity = Decimal.fromString(pool.max_pool_capacity);
      const utilization = Decimal.fromString(pool.current_utilization);
      if (utilization.add(amount).compareTo(capacity) > 0) {
        throw new Error('Staking pool capacity exceeded.');
      }
    }

    // 2. Lock funds via double-entry ledger: USER_AVAILABLE -> USER_STAKING
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', currency);
    const stakingAcc = accountService.getUserAccount(userId, 'USER_STAKING', currency);
    const sysLiabilityAcc = accountService.getSystemAccount('SYSTEM_STAKING_LIABILITY', currency);

    const idempotencyKey = `stake_create_${userId}_${poolId}_${Date.now()}`;
    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'STAKING',
        currency,
        amount: amount.toString(),
        description: `Stake ${amount.toString()} ${currency} in pool #${pool.id} (${pool.name})`,
        idempotency_key: idempotencyKey,
        created_by: userId
      },
      [
        {
          account_id: availableAcc.id,
          entry_type: 'DEBIT',
          amount: amount.toString(),
          description: `Debit available balance for staking principal`
        },
        {
          account_id: stakingAcc.id,
          entry_type: 'CREDIT',
          amount: amount.toString(),
          description: `Credit staking liability balance`
        }
      ]
    );

    // 3. Update pool utilization
    const currentUtil = Decimal.fromString(pool.current_utilization);
    pool.current_utilization = currentUtil.add(amount).toString();
    const poolEntity = dataStore.stakingPoolEntities.find(p => p.id === pool.id);
    if (poolEntity) {
      poolEntity.current_utilization = pool.current_utilization;
    }

    // 4. Calculate maturity and lock dates
    const now = new Date();
    const startAt = now.toISOString();
    const lockUntilDate = new Date(now.getTime() + version.lock_period_days * 24 * 60 * 60 * 1000);
    const maturityDate = new Date(now.getTime() + version.lock_period_days * 24 * 60 * 60 * 1000); // 1:1 for fixed term or customizable

    const nextId = dataStore.userStakes.length > 0 ? Math.max(...dataStore.userStakes.map(s => s.id)) + 1 : 1;
    const publicReference = `STK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newStake: UserStake = {
      id: nextId,
      public_reference: publicReference,
      user_id: userId,
      pool_id: pool.id,
      pool_version_id: version.id,
      asset: pool.asset,
      currency: currency.toUpperCase(),
      principal_amount: amount.toString(),
      accrued_reward: '0.00000000',
      claimed_reward: '0.00000000',
      compounded_reward: '0.00000000',
      current_staked_amount: amount.toString(),
      start_at: startAt,
      lock_until: lockUntilDate.toISOString(),
      cooldown_until: null,
      maturity_at: maturityDate.toISOString(),
      last_accrual_at: startAt,
      status: 'ACTIVE',
      auto_compound: Boolean(autoCompound),
      disclosure_version: version.disclosure_version,
      terms_version: version.terms_version,
      created_at: startAt,
      updated_at: startAt,
      completed_at: null,
      cancelled_at: null
    };

    dataStore.userStakes.push(newStake);

    // 5. Record staking event
    const eventId = dataStore.stakingEvents.length > 0 ? Math.max(...dataStore.stakingEvents.map(e => e.id)) + 1 : 1;
    dataStore.stakingEvents.push({
      id: eventId,
      stake_id: newStake.id,
      event_type: 'STAKE_CREATED',
      amount: amount.toString(),
      currency,
      timestamp: startAt,
      actor_user_id: userId,
      metadata: { ip, user_agent: userAgent, pool_name: pool.name },
      ledger_transaction_id: tx.id,
      idempotency_key: `evt_stake_${newStake.id}_create`
    });

    logger.info('FINANCE', `User #${userId} successfully staked ${amount.toString()} ${currency} in pool #${pool.id}`);
    return newStake;
  }

  public static claimReward(stakeId: number, userId: number): UserStake {
    const stake = dataStore.userStakes.find(s => s.id === stakeId && s.user_id === userId);
    if (!stake) {
      throw new Error('Stake not found or unauthorized.');
    }

    const claimableDec = Decimal.fromString(stake.accrued_reward).subtract(Decimal.fromString(stake.claimed_reward));
    if (claimableDec.isZero() || claimableDec.isNegative()) {
      throw new Error('No claimable rewards available at this time.');
    }

    const rewardStr = claimableDec.toString();
    const currency = stake.currency;

    // Credit USER_AVAILABLE via ledger from system staking reward expense
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', currency);
    const stakingLiabAcc = accountService.getSystemAccount('SYSTEM_STAKING_LIABILITY', currency);

    const idempotencyKey = `claim_reward_${stakeId}_${Date.now()}`;
    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'STAKING_REWARD',
        currency,
        amount: rewardStr,
        description: `Claim staking reward for stake #${stake.id} (${stake.public_reference})`,
        idempotency_key: idempotencyKey,
        created_by: userId
      },
      [
        {
          account_id: stakingLiabAcc.id,
          entry_type: 'DEBIT',
          amount: rewardStr,
          description: `Debit system staking liability`
        },
        {
          account_id: availableAcc.id,
          entry_type: 'CREDIT',
          amount: rewardStr,
          description: `Credit user available balance for claimed staking reward`
        }
      ]
    );

    const prevClaimed = Decimal.fromString(stake.claimed_reward);
    stake.claimed_reward = prevClaimed.add(claimableDec).toString();
    stake.updated_at = new Date().toISOString();

    const eventId = dataStore.stakingEvents.length > 0 ? Math.max(...dataStore.stakingEvents.map(e => e.id)) + 1 : 1;
    dataStore.stakingEvents.push({
      id: eventId,
      stake_id: stake.id,
      event_type: 'REWARD_CLAIMED',
      amount: rewardStr,
      currency,
      timestamp: stake.updated_at,
      actor_user_id: userId,
      metadata: {},
      ledger_transaction_id: tx.id,
      idempotency_key: `evt_claim_${stake.id}_${Date.now()}`
    });

    return stake;
  }

  public static unstake(stakeId: number, userId: number): UserStake {
    const stake = dataStore.userStakes.find(s => s.id === stakeId && s.user_id === userId);
    if (!stake) {
      throw new Error('Stake not found or unauthorized.');
    }

    if (stake.status !== 'ACTIVE' && stake.status !== 'MATURED') {
      throw new Error(`Cannot unstake a stake in status: ${stake.status}`);
    }

    const now = new Date();
    const lockUntil = new Date(stake.lock_until);

    if (now < lockUntil) {
      // Check early exit rules
      const version = dataStore.stakingPoolVersions.find(v => v.id === stake.pool_version_id);
      if (!version || !version.early_unstake_allowed) {
        throw new Error('Lock period is active and early unstaking is not permitted for this pool.');
      }
    }

    const principalDec = Decimal.fromString(stake.principal_amount);
    const compoundedDec = Decimal.fromString(stake.compounded_reward);
    const totalReleaseDec = principalDec.add(compoundedDec);
    const currency = stake.currency;

    // Release funds via ledger: USER_STAKING -> USER_AVAILABLE
    const stakingAcc = accountService.getUserAccount(userId, 'USER_STAKING', currency);
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', currency);

    const idempotencyKey = `unstake_${stakeId}_${Date.now()}`;
    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'STAKING',
        currency,
        amount: totalReleaseDec.toString(),
        description: `Unstake and release principal for stake #${stake.id} (${stake.public_reference})`,
        idempotency_key: idempotencyKey,
        created_by: userId
      },
      [
        {
          account_id: stakingAcc.id,
          entry_type: 'DEBIT',
          amount: totalReleaseDec.toString(),
          description: `Debit staking liability account for principal release`
        },
        {
          account_id: availableAcc.id,
          entry_type: 'CREDIT',
          amount: totalReleaseDec.toString(),
          description: `Credit user available balance upon unstaking`
        }
      ]
    );

    stake.status = 'COMPLETED';
    stake.completed_at = now.toISOString();
    stake.updated_at = now.toISOString();

    const eventId = dataStore.stakingEvents.length > 0 ? Math.max(...dataStore.stakingEvents.map(e => e.id)) + 1 : 1;
    dataStore.stakingEvents.push({
      id: eventId,
      stake_id: stake.id,
      event_type: 'UNSTAKED',
      amount: totalReleaseDec.toString(),
      currency,
      timestamp: stake.updated_at,
      actor_user_id: userId,
      metadata: {},
      ledger_transaction_id: tx.id,
      idempotency_key: `evt_unstake_${stake.id}`
    });

    return stake;
  }
}
