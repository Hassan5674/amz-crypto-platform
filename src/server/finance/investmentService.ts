import { dataStore } from '../dataStore.js';
import {
  InvestmentPlan,
  InvestmentPlanVersion,
  UserInvestment,
  InvestmentEvent,
  UserInvestmentStatus
} from '../../types/investment.js';
import { accountService } from './accountService.js';
import { balanceService } from './balanceService.js';
import { financialTransactionService } from './transactionService.js';
import { InvestmentReturnService } from './investmentReturnService.js';
import { Decimal } from './decimal.js';
import { logger } from '../logger.js';
import { securityEventService } from '../services/securityEventService.js';
import crypto from 'crypto';

export class InvestmentService {
  /**
   * Get all active investment plans with their active versions.
   */
  public static getPlans(): InvestmentPlan[] {
    return dataStore.investmentPlans.map(plan => {
      const activeVersion = dataStore.investmentPlanVersions.find(
        v => v.plan_id === plan.id && (v.id === plan.current_version_id || v.version_number === plan.current_version_id)
      ) || dataStore.investmentPlanVersions.find(v => v.plan_id === plan.id);
      const allVersions = dataStore.investmentPlanVersions.filter(v => v.plan_id === plan.id);
      return {
        ...plan,
        active_version: activeVersion,
        versions: allVersions
      };
    });
  }

  /**
   * Get single plan by ID or slug.
   */
  public static getPlan(planIdOrSlug: number | string): InvestmentPlan | null {
    const plan = dataStore.investmentPlans.find(
      p => p.id === Number(planIdOrSlug) || p.slug === String(planIdOrSlug) || p.public_id === String(planIdOrSlug)
    );
    if (!plan) return null;

    const activeVersion = dataStore.investmentPlanVersions.find(
      v => v.plan_id === plan.id && (v.id === plan.current_version_id || v.version_number === plan.current_version_id)
    ) || dataStore.investmentPlanVersions.find(v => v.plan_id === plan.id);
    const allVersions = dataStore.investmentPlanVersions.filter(v => v.plan_id === plan.id);

    return {
      ...plan,
      active_version: activeVersion,
      versions: allVersions
    };
  }

  /**
   * Get user investments list.
   */
  public static getUserInvestments(userId: number): UserInvestment[] {
    return dataStore.userInvestments
      .filter(inv => inv.user_id === userId)
      .sort((a, b) => b.id - a.id)
      .map(inv => {
        const plan = dataStore.investmentPlans.find(p => p.id === inv.plan_id);
        const version = dataStore.investmentPlanVersions.find(v => v.id === inv.plan_version_id);
        return {
          ...inv,
          plan_name: plan?.name || 'Investment Plan',
          plan_version_number: version?.version_number || 1,
          return_model: version?.return_model || 'FIXED_RATE',
          return_rate: version?.return_rate || '0.00'
        };
      });
  }

  /**
   * Get single investment by ID.
   */
  public static getInvestment(investmentId: number, userId?: number): UserInvestment | null {
    const inv = dataStore.userInvestments.find(i => i.id === investmentId);
    if (!inv) return null;
    if (userId !== undefined && inv.user_id !== userId) {
      return null;
    }

    const plan = dataStore.investmentPlans.find(p => p.id === inv.plan_id);
    const version = dataStore.investmentPlanVersions.find(v => v.id === inv.plan_version_id);

    return {
      ...inv,
      plan_name: plan?.name || 'Investment Plan',
      plan_version_number: version?.version_number || 1,
      return_model: version?.return_model || 'FIXED_RATE',
      return_rate: version?.return_rate || '0.00'
    };
  }

  /**
   * Create a new user investment with atomic ledger transfer.
   */
  public static createInvestment(
    userId: number,
    planId: number,
    amountStr: string,
    currency: string = 'USD',
    autoRenew: boolean = false,
    ip: string = '127.0.0.1',
    userAgent: string = 'ApexPlatform-Client'
  ): UserInvestment {
    const curr = currency.toUpperCase();
    const plan = this.getPlan(planId);
    if (!plan || plan.status !== 'ACTIVE') {
      throw new Error('Investment plan is not active or does not exist.');
    }

    const version = plan.active_version;
    if (!version) {
      throw new Error('No active version found for this investment plan.');
    }

    const amount = Decimal.fromString(amountStr);
    const minAmount = Decimal.fromString(version.minimum_amount);
    const maxAmount = Decimal.fromString(version.maximum_amount);

    if (amount.lessThan(minAmount) || amount.greaterThan(maxAmount)) {
      throw new Error(
        `Investment amount must be between ${version.minimum_amount} and ${version.maximum_amount} ${curr}.`
      );
    }

    // Verify available balance
    const availableBalance = balanceService.getAvailableBalance(userId, curr);
    if (availableBalance.lessThan(amount)) {
      throw new Error(
        `Insufficient available balance. Available: ${availableBalance.toString()} ${curr}, Required: ${amount.toString()} ${curr}`
      );
    }

    // Calculate return & fees
    const calc = InvestmentReturnService.calculateReturn(amountStr, version);
    const grossPrincipal = Decimal.fromString(calc.principal);
    const netPrincipal = Decimal.fromString(calc.netPrincipal);
    const fees = Decimal.fromString(calc.fees);
    const expectedReturn = Decimal.fromString(calc.expectedReturn);
    const maturityAmount = Decimal.fromString(calc.maturityAmount);

    // Get ledger accounts
    const userAvailAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', curr);
    const userInvestAcc = accountService.getUserAccount(userId, 'USER_INVESTMENT', curr);
    const feesAcc = fees.isPositive() ? accountService.getSystemAccount('SYSTEM_FEES', curr) : null;

    // Prepare ledger entries
    const entries: Array<{
      account_id: number;
      entry_type: 'DEBIT' | 'CREDIT';
      amount: string;
      description: string;
    }> = [
      {
        account_id: userAvailAcc.id,
        entry_type: 'DEBIT',
        amount: grossPrincipal.toFixed(8),
        description: `Investment funding for plan: ${plan.name}`
      },
      {
        account_id: userInvestAcc.id,
        entry_type: 'CREDIT',
        amount: netPrincipal.toFixed(8),
        description: `Principal locked in investment plan: ${plan.name}`
      }
    ];

    if (fees.isPositive() && feesAcc) {
      entries.push({
        account_id: feesAcc.id,
        entry_type: 'CREDIT',
        amount: fees.toFixed(8),
        description: `Entry fee for investment plan: ${plan.name}`
      });
    }

    const idempotencyKey = `inv_create_${userId}_${plan.id}_${Date.now()}`;
    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'INVESTMENT',
        currency: curr,
        amount: grossPrincipal.toFixed(8),
        description: `User #${userId} invested ${grossPrincipal.toString()} ${curr} in ${plan.name}`,
        idempotency_key: idempotencyKey,
        created_by: userId
      },
      entries
    );

    // Create User Investment record
    const invId = dataStore.userInvestments.length + 1;
    const publicRef = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const now = new Date();
    const durationDays = version.duration || 30;
    const maturityDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const lockUntilDate = new Date(now.getTime() + (version.lock_period || durationDays) * 24 * 60 * 60 * 1000);

    const newInvestment: UserInvestment = {
      id: invId,
      public_reference: publicRef,
      user_id: userId,
      plan_id: plan.id,
      plan_version_id: version.id,
      currency: curr,
      principal_amount: netPrincipal.toFixed(8),
      expected_return: expectedReturn.toFixed(8),
      accrued_return: '0.00000000',
      paid_return: '0.00000000',
      maturity_amount: maturityAmount.toFixed(8),
      start_at: now.toISOString(),
      maturity_at: maturityDate.toISOString(),
      lock_until: lockUntilDate.toISOString(),
      status: 'ACTIVE',
      auto_renew: Boolean(autoRenew),
      disclosure_version: version.version_number,
      terms_version: version.version_number,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      completed_at: null,
      cancelled_at: null
    };

    dataStore.userInvestments.push(newInvestment);

    // Record investment event
    const eventId = dataStore.investmentEvents.length + 1;
    dataStore.investmentEvents.push({
      id: eventId,
      investment_id: invId,
      event_type: 'CREATED',
      amount: netPrincipal.toFixed(8),
      currency: curr,
      timestamp: now.toISOString(),
      actor_user_id: userId,
      metadata: { plan_name: plan.name, version: version.version_number },
      ledger_transaction_id: tx.id,
      idempotency_key: `evt_create_${invId}`
    });

    securityEventService.record({
      type: 'FINANCIAL_ADJUSTMENT_REQUESTED',
      actor: { id: userId },
      target: { type: 'INVESTMENT', id: invId },
      description: `User created investment #${publicRef} for ${netPrincipal.toString()} ${curr}`,
      ip,
      userAgent,
      severity: 'LOW'
    });

    logger.info('FINANCE', `Investment created #${invId} (${publicRef}) by user #${userId}`);
    return this.getInvestment(invId, userId)!;
  }

  /**
   * Process investment maturities (Cron / Scheduled Job).
   */
  public static processMaturities(): { processed: number; errors: string[] } {
    const now = new Date();
    const activeInvestments = dataStore.userInvestments.filter(
      i => i.status === 'ACTIVE' && new Date(i.maturity_at) <= now
    );

    let processed = 0;
    const errors: string[] = [];

    for (const inv of activeInvestments) {
      try {
        const curr = inv.currency;
        const netPrincipal = Decimal.fromString(inv.principal_amount);
        const expectedReturn = Decimal.fromString(inv.expected_return);
        const totalPayout = netPrincipal.add(expectedReturn);

        // Get accounts
        const userInvestAcc = accountService.getUserAccount(inv.user_id, 'USER_INVESTMENT', curr);
        const userAvailAcc = accountService.getUserAccount(inv.user_id, 'USER_AVAILABLE', curr);

        // Post ledger transaction: Debit USER_INVESTMENT (principal), and release principal + return to USER_AVAILABLE
        // Wait, double entry requires debits = credits.
        // Debit USER_INVESTMENT: netPrincipal
        // Debit System Expense (or Profit Liability): expectedReturn
        // Credit USER_AVAILABLE: totalPayout
        const sysExpenseAcc = accountService.getSystemAccount('SYSTEM_CLEARING', curr);

        const entries = [
          {
            account_id: userInvestAcc.id,
            entry_type: 'DEBIT' as const,
            amount: netPrincipal.toFixed(8),
            description: `Release principal for matured investment #${inv.public_reference}`
          },
          {
            account_id: sysExpenseAcc.id,
            entry_type: 'DEBIT' as const,
            amount: expectedReturn.toFixed(8),
            description: `Return payout expense for matured investment #${inv.public_reference}`
          },
          {
            account_id: userAvailAcc.id,
            entry_type: 'CREDIT' as const,
            amount: totalPayout.toFixed(8),
            description: `Maturity payout (Principal + Return) for investment #${inv.public_reference}`
          }
        ];

        const idempotencyKey = `maturity_${inv.id}_${inv.public_reference}`;
        const tx = financialTransactionService.postTransaction(
          {
            transaction_type: 'INVESTMENT_RETURN',
            currency: curr,
            amount: totalPayout.toFixed(8),
            description: `Maturity settlement for investment #${inv.public_reference}`,
            idempotency_key: idempotencyKey,
            created_by: null
          },
          entries
        );

        inv.status = 'MATURED';
        inv.paid_return = expectedReturn.toFixed(8);
        inv.completed_at = now.toISOString();
        inv.updated_at = now.toISOString();

        // Record investment events
        dataStore.investmentEvents.push({
          id: dataStore.investmentEvents.length + 1,
          investment_id: inv.id,
          event_type: 'MATURITY_REACHED',
          amount: totalPayout.toFixed(8),
          currency: curr,
          timestamp: now.toISOString(),
          actor_user_id: null,
          metadata: { principal: netPrincipal.toString(), return: expectedReturn.toString() },
          ledger_transaction_id: tx.id,
          idempotency_key: `evt_mat_${inv.id}`
        });

        processed++;
        logger.info('FINANCE', `Investment matured and settled successfully #${inv.id} (${inv.public_reference})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Investment #${inv.id}: ${msg}`);
        logger.error('FINANCE', `Failed to mature investment #${inv.id}: ${msg}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Early exit an active investment.
   */
  public static earlyExitInvestment(investmentId: number, userId: number): UserInvestment {
    const inv = dataStore.userInvestments.find(i => i.id === investmentId && i.user_id === userId);
    if (!inv) {
      throw new Error('Investment not found or unauthorized.');
    }
    if (inv.status !== 'ACTIVE') {
      throw new Error(`Investment cannot be exited early because its status is ${inv.status}.`);
    }

    const version = dataStore.investmentPlanVersions.find(v => v.id === inv.plan_version_id);
    if (!version || !version.early_exit_allowed) {
      throw new Error('Early exit is not allowed for this investment plan version.');
    }

    // Check lock period
    const now = new Date();
    const lockUntil = new Date(inv.lock_until);
    if (now < lockUntil) {
      throw new Error(`Investment is locked until ${inv.lock_until}. Early exit is not permitted during the lock period.`);
    }

    // Calculate early exit
    const exitCalc = InvestmentReturnService.calculateEarlyExit(inv.principal_amount, inv.accrued_return, version);
    const refundPrincipal = Decimal.fromString(exitCalc.refundPrincipal);
    const payoutReturn = Decimal.fromString(exitCalc.payoutReturn);
    const exitFee = Decimal.fromString(exitCalc.earlyExitFee);
    const totalPayout = Decimal.fromString(exitCalc.totalPayout);
    const curr = inv.currency;

    const userInvestAcc = accountService.getUserAccount(userId, 'USER_INVESTMENT', curr);
    const userAvailAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', curr);
    const feesAcc = exitFee.isPositive() ? accountService.getSystemAccount('SYSTEM_FEES', curr) : null;
    const sysClearingAcc = accountService.getSystemAccount('SYSTEM_CLEARING', curr);

    const entries = [
      {
        account_id: userInvestAcc.id,
        entry_type: 'DEBIT' as const,
        amount: refundPrincipal.toFixed(8),
        description: `Principal release on early exit for investment #${inv.public_reference}`
      },
      {
        account_id: sysClearingAcc.id,
        entry_type: 'DEBIT' as const,
        amount: payoutReturn.toFixed(8),
        description: `Prorated return on early exit for investment #${inv.public_reference}`
      },
      {
        account_id: userAvailAcc.id,
        entry_type: 'CREDIT' as const,
        amount: totalPayout.toFixed(8),
        description: `Early exit payout for investment #${inv.public_reference}`
      }
    ];

    if (exitFee.isPositive() && feesAcc) {
      entries.push({
        account_id: feesAcc.id,
        entry_type: 'CREDIT' as const,
        amount: exitFee.toFixed(8),
        description: `Early exit fee for investment #${inv.public_reference}`
      });
    }

    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'REFUND',
        currency: curr,
        amount: totalPayout.toFixed(8),
        description: `Early exit settlement for investment #${inv.public_reference}`,
        idempotency_key: `early_exit_${inv.id}_${Date.now()}`,
        created_by: userId
      },
      entries
    );

    inv.status = 'EARLY_EXIT';
    inv.completed_at = now.toISOString();
    inv.updated_at = now.toISOString();

    dataStore.investmentEvents.push({
      id: dataStore.investmentEvents.length + 1,
      investment_id: inv.id,
      event_type: 'EARLY_EXIT_COMPLETED',
      amount: totalPayout.toFixed(8),
      currency: curr,
      timestamp: now.toISOString(),
      actor_user_id: userId,
      metadata: { fee: exitFee.toString(), payout: totalPayout.toString() },
      ledger_transaction_id: tx.id,
      idempotency_key: `evt_ee_${inv.id}`
    });

    logger.info('FINANCE', `Investment early exited #${inv.id} (${inv.public_reference}) by user #${userId}`);
    return this.getInvestment(inv.id, userId)!;
  }
}
