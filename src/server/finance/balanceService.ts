import { dataStore } from '../dataStore.js';
import { accountService } from './accountService.js';
import { Decimal } from './decimal.js';
import { LedgerAccount, LedgerAccountType, WalletBalancesDto } from '../../types/finance.js';
import { logger } from '../logger.js';

export class BalanceService {
  private static instance: BalanceService;

  private constructor() {}

  public static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  /**
   * Authoritative calculation: Derives balance purely from posted ledger entries.
   * For User accounts & System Liabilities: Balance = Credits - Debits
   * For System Asset accounts (Cash, Clearing): Balance = Debits - Credits
   */
  public getAccountBalance(accountId: number): Decimal {
    const account = accountService.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account ID ${accountId} does not exist`);
    }

    // Get all posted transactions (including REVERSED ones, which are permanently kept in the ledger
    // and balanced out by an immutable REVERSAL transaction with inverted entries)
    const postedTxIds = new Set(
      dataStore.ledgerTransactions
        .filter(t => t.status === 'POSTED' || t.status === 'REVERSED')
        .map(t => t.id)
    );

    let credits = Decimal.zero();
    let debits = Decimal.zero();

    for (const entry of dataStore.ledgerEntries) {
      if (entry.ledger_account_id === accountId && postedTxIds.has(entry.transaction_id)) {
        const amt = Decimal.fromString(entry.amount);
        if (entry.entry_type === 'CREDIT') {
          credits = credits.add(amt);
        } else if (entry.entry_type === 'DEBIT') {
          debits = debits.add(amt);
        }
      }
    }

    // Determine normal balance side based on account type
    const isAsset = account.account_type === 'SYSTEM_CASH' || account.account_type === 'SYSTEM_CLEARING';
    if (isAsset) {
      return debits.subtract(credits);
    } else {
      return credits.subtract(debits);
    }
  }

  public getAvailableBalance(userId: number, currency: string = 'USD'): Decimal {
    const acc = accountService.getUserAccount(userId, 'USER_AVAILABLE', currency);
    return this.getAccountBalance(acc.id);
  }

  public getLockedBalance(userId: number, currency: string = 'USD'): Decimal {
    const acc = accountService.getUserAccount(userId, 'USER_LOCKED', currency);
    return this.getAccountBalance(acc.id);
  }

  public getInvestmentBalance(userId: number, currency: string = 'USD'): Decimal {
    const acc = accountService.getUserAccount(userId, 'USER_INVESTMENT', currency);
    return this.getAccountBalance(acc.id);
  }

  public getStakingBalance(userId: number, currency: string = 'USD'): Decimal {
    const acc = accountService.getUserAccount(userId, 'USER_STAKING', currency);
    return this.getAccountBalance(acc.id);
  }

  public getBonusBalance(userId: number, currency: string = 'USD'): Decimal {
    const acc = accountService.getUserAccount(userId, 'USER_BONUS', currency);
    return this.getAccountBalance(acc.id);
  }

  public getTotalBalance(userId: number, currency: string = 'USD'): Decimal {
    const avail = this.getAvailableBalance(userId, currency);
    const locked = this.getLockedBalance(userId, currency);
    const invest = this.getInvestmentBalance(userId, currency);
    const stake = this.getStakingBalance(userId, currency);
    const bonus = this.getBonusBalance(userId, currency);

    return avail.add(locked).add(invest).add(stake).add(bonus);
  }

  /**
   * Recalculates wallet balances directly from the ledger and refreshes cache.
   */
  public recalculateBalance(userId: number, currency: string = 'USD'): WalletBalancesDto {
    const curr = currency.toUpperCase();
    const wallet = accountService.ensureUserAccounts(userId, curr);

    const availableDec = this.getAvailableBalance(userId, curr);
    const lockedDec = this.getLockedBalance(userId, curr);
    const investDec = this.getInvestmentBalance(userId, curr);
    const stakeDec = this.getStakingBalance(userId, curr);
    const bonusDec = this.getBonusBalance(userId, curr);
    const totalDec = availableDec.add(lockedDec).add(investDec).add(stakeDec).add(bonusDec);

    const now = new Date().toISOString();
    const balancesSnapshot = {
      available: availableDec.toString(),
      locked: lockedDec.toString(),
      investment: investDec.toString(),
      staking: stakeDec.toString(),
      bonus: bonusDec.toString(),
      total: totalDec.toString(),
      last_reconciled_at: now
    };

    wallet.cached_balances = balancesSnapshot;
    wallet.updated_at = now;

    return {
      user_id: userId,
      currency: curr,
      wallet_status: wallet.status,
      ...balancesSnapshot,
      is_reconciled: true
    };
  }

  /**
   * Verifies whether the cached wallet balance matches pure ledger calculation.
   */
  public verifyBalance(userId: number, currency: string = 'USD'): { matches: boolean; cached: string; derived: string } {
    const curr = currency.toUpperCase();
    const wallet = accountService.ensureUserAccounts(userId, curr);
    const cachedTotal = wallet.cached_balances?.total || '0.00000000';

    const derivedTotal = this.getTotalBalance(userId, curr).toString();
    const matches = cachedTotal === derivedTotal;

    if (!matches) {
      logger.warn('FINANCE_AUDIT', `Wallet cache discrepancy detected for User ${userId}: cached=${cachedTotal} vs derived=${derivedTotal}`);
    }

    return { matches, cached: cachedTotal, derived: derivedTotal };
  }
}

export const balanceService = BalanceService.getInstance();
