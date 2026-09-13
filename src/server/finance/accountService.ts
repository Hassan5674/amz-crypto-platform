import { dataStore } from '../dataStore.js';
import { LedgerAccount, LedgerAccountType, Wallet } from '../../types/finance.js';
import { logger } from '../logger.js';
import crypto from 'crypto';

export class AccountService {
  private static instance: AccountService;

  private constructor() {
    this.ensureSystemAccounts();
  }

  public static getInstance(): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService();
    }
    return AccountService.instance;
  }

  /**
   * Provisions core institutional system accounts with 0 initial balance.
   */
  public ensureSystemAccounts(currency: string = 'USD'): void {
    const systemAccountTypes: LedgerAccountType[] = [
      'SYSTEM_CASH',
      'SYSTEM_CLEARING',
      'SYSTEM_FEES',
      'SYSTEM_INVESTMENT_LIABILITY',
      'SYSTEM_STAKING_LIABILITY',
      'SYSTEM_GAME_SETTLEMENT'
    ];

    for (const type of systemAccountTypes) {
      const code = `SYS_${type.replace('SYSTEM_', '')}_${currency.toUpperCase()}`;
      const exists = dataStore.ledgerAccounts.some(a => a.account_code === code);
      if (!exists) {
        const id = dataStore.ledgerAccounts.length > 0
          ? Math.max(...dataStore.ledgerAccounts.map(a => a.id)) + 1
          : 1;

        const acc: LedgerAccount = {
          id,
          uuid: crypto.randomUUID(),
          account_code: code,
          account_type: type,
          owner_user_id: null,
          currency: currency.toUpperCase(),
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        dataStore.ledgerAccounts.push(acc);
        logger.info('FINANCE', `Provisioned system account: ${code}`);
      }
    }
  }

  /**
   * Ensures the standard user wallet and 5 ledger sub-accounts exist for a given user.
   * Arbitrary account creation is strictly forbidden.
   */
  public ensureUserAccounts(userId: number, currency: string = 'USD'): Wallet {
    const curr = currency.toUpperCase();
    
    // 1. Ensure Wallet entity
    let wallet = dataStore.wallets.find(w => w.user_id === userId && w.currency === curr);
    if (!wallet) {
      const wid = dataStore.wallets.length > 0
        ? Math.max(...dataStore.wallets.map(w => w.id)) + 1
        : 1;

      wallet = {
        id: wid,
        uuid: crypto.randomUUID(),
        user_id: userId,
        currency: curr,
        status: 'ACTIVE',
        cached_balances: {
          available: '0.00000000',
          locked: '0.00000000',
          investment: '0.00000000',
          staking: '0.00000000',
          bonus: '0.00000000',
          total: '0.00000000',
          last_reconciled_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dataStore.wallets.push(wallet);
      logger.info('FINANCE', `Provisioned wallet for user ${userId} (${curr})`);
    }

    // 2. Ensure standard 5 user ledger accounts
    const userAccountTypes: LedgerAccountType[] = [
      'USER_AVAILABLE',
      'USER_LOCKED',
      'USER_INVESTMENT',
      'USER_STAKING',
      'USER_BONUS'
    ];

    for (const type of userAccountTypes) {
      const code = `USER_${userId}_${type.replace('USER_', '')}_${curr}`;
      const exists = dataStore.ledgerAccounts.some(a => a.account_code === code);
      if (!exists) {
        const id = dataStore.ledgerAccounts.length > 0
          ? Math.max(...dataStore.ledgerAccounts.map(a => a.id)) + 1
          : 1;

        const acc: LedgerAccount = {
          id,
          uuid: crypto.randomUUID(),
          account_code: code,
          account_type: type,
          owner_user_id: userId,
          currency: curr,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        dataStore.ledgerAccounts.push(acc);
      }
    }

    return wallet;
  }

  public getUserAccount(userId: number, type: LedgerAccountType, currency: string = 'USD'): LedgerAccount {
    this.ensureUserAccounts(userId, currency);
    const code = `USER_${userId}_${type.replace('USER_', '')}_${currency.toUpperCase()}`;
    const acc = dataStore.ledgerAccounts.find(a => a.account_code === code);
    if (!acc) {
      throw new Error(`Ledger account ${code} could not be resolved for user ${userId}`);
    }
    return acc;
  }

  public getSystemAccount(type: LedgerAccountType, currency: string = 'USD'): LedgerAccount {
    this.ensureSystemAccounts(currency);
    const code = `SYS_${type.replace('SYSTEM_', '')}_${currency.toUpperCase()}`;
    const acc = dataStore.ledgerAccounts.find(a => a.account_code === code);
    if (!acc) {
      throw new Error(`System ledger account ${code} not found`);
    }
    return acc;
  }

  public getAccountById(accountId: number): LedgerAccount | undefined {
    return dataStore.ledgerAccounts.find(a => a.id === accountId);
  }

  public getAccountByCode(code: string): LedgerAccount | undefined {
    return dataStore.ledgerAccounts.find(a => a.account_code === code.trim().toUpperCase());
  }
}

export const accountService = AccountService.getInstance();
