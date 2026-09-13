import { dataStore } from '../dataStore.js';
import { accountService } from './accountService.js';
import { balanceService } from './balanceService.js';
import { Decimal } from './decimal.js';
import {
  LedgerTransaction,
  LedgerEntry,
  LedgerTransactionType,
  LedgerEntryType,
  LedgerTransactionStatus
} from '../../types/finance.js';
import { logger } from '../logger.js';
import { securityEventService } from '../services/securityEventService.js';
import crypto from 'crypto';

export interface CreateTransactionDraft {
  transaction_type: LedgerTransactionType;
  currency: string;
  amount: string; // nominal amount
  description: string;
  idempotency_key?: string | null;
  external_reference?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: number | null;
}

export interface EntryDraft {
  account_id: number;
  entry_type: LedgerEntryType;
  amount: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export class FinancialTransactionService {
  private static instance: FinancialTransactionService;

  private constructor() {}

  public static getInstance(): FinancialTransactionService {
    if (!FinancialTransactionService.instance) {
      FinancialTransactionService.instance = new FinancialTransactionService();
    }
    return FinancialTransactionService.instance;
  }

  /**
   * Generates sequential institutional reference code: TXN-YYYYMMDD-HEX
   */
  public generateReference(): string {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${dateStr}-${rand}`;
  }

  /**
   * Centralized atomic execution of double-entry ledger transactions.
   * If any invariant fails, everything rolls back and nothing is posted.
   */
  public postTransaction(
    draft: CreateTransactionDraft,
    entries: EntryDraft[]
  ): LedgerTransaction {
    const startTime = Date.now();
    const curr = draft.currency.toUpperCase();

    // 1. Idempotency check
    if (draft.idempotency_key) {
      const existing = dataStore.ledgerTransactions.find(
        t => t.idempotency_key === draft.idempotency_key
      );
      if (existing) {
        logger.info('FINANCE', `Idempotent replay detected for key: ${draft.idempotency_key}. Returning existing txn #${existing.id}`);
        return this.getTransactionWithEntries(existing.id)!;
      }
    }

    // 2. Validate nominal amount
    const nominalAmountDec = Decimal.fromString(draft.amount);
    if (nominalAmountDec.isZero() || nominalAmountDec.isNegative()) {
      throw new Error(`Transaction amount must be strictly positive. Received: "${draft.amount}"`);
    }

    // 3. Entries validation (Must have at least 2 entries: 1 debit and 1 credit)
    if (!entries || entries.length < 2) {
      throw new Error('Double-entry ledger requires at least two balanced entries.');
    }

    let totalDebits = Decimal.zero();
    let totalCredits = Decimal.zero();
    const validatedEntries: Array<{
      accountId: number;
      entryType: LedgerEntryType;
      amountDec: Decimal;
      description: string;
      metadata: Record<string, unknown>;
    }> = [];

    const affectedUserIds = new Set<number>();

    for (const [idx, entry] of entries.entries()) {
      // Validate account existence and status
      const account = accountService.getAccountById(entry.account_id);
      if (!account) {
        throw new Error(`Entry #${idx + 1}: Account ID ${entry.account_id} does not exist.`);
      }
      if (account.status !== 'ACTIVE') {
        throw new Error(`Entry #${idx + 1}: Account ${account.account_code} is ${account.status}.`);
      }
      if (account.currency !== curr) {
        throw new Error(`Entry #${idx + 1}: Account currency (${account.currency}) does not match transaction currency (${curr}).`);
      }

      if (account.owner_user_id) {
        affectedUserIds.add(account.owner_user_id);
      }

      // Validate entry amount
      const entryAmtDec = Decimal.fromString(entry.amount);
      if (entryAmtDec.isZero()) {
        throw new Error(`Entry #${idx + 1}: Zero-value entries are strictly prohibited.`);
      }
      if (entryAmtDec.isNegative()) {
        throw new Error(`Entry #${idx + 1}: Negative entry amounts are strictly prohibited. Received: "${entry.amount}".`);
      }

      if (entry.entry_type === 'DEBIT') {
        totalDebits = totalDebits.add(entryAmtDec);
      } else if (entry.entry_type === 'CREDIT') {
        totalCredits = totalCredits.add(entryAmtDec);
      } else {
        throw new Error(`Entry #${idx + 1}: Invalid entry type "${entry.entry_type}". Must be DEBIT or CREDIT.`);
      }

      validatedEntries.push({
        accountId: entry.account_id,
        entryType: entry.entry_type,
        amountDec: entryAmtDec,
        description: entry.description,
        metadata: entry.metadata || {}
      });
    }

    // 4. Fundamental double-entry balance check: TOTAL DEBITS = TOTAL CREDITS
    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `Unbalanced transaction rejected! Total Debits (${totalDebits.toString()}) must equal Total Credits (${totalCredits.toString()}).`
      );
    }

    // 5. Balance adequacy check for user liability accounts
    // If a user account is being debited, ensure the user has sufficient balance
    for (const ve of validatedEntries) {
      if (ve.entryType === 'DEBIT') {
        const acc = accountService.getAccountById(ve.accountId)!;
        // If it's a user sub-account (e.g. USER_AVAILABLE, USER_LOCKED)
        if (acc.owner_user_id) {
          const currentBal = balanceService.getAccountBalance(acc.id);
          if (currentBal.compareTo(ve.amountDec) < 0) {
            throw new Error(
              `Insufficient funds in account ${acc.account_code}. Available: ${currentBal.toString()}, Required: ${ve.amountDec.toString()}`
            );
          }
        }
      }
    }

    // 6. Atomic Commit: Create transaction and append all entries
    const nextTxId = dataStore.ledgerTransactions.length > 0
      ? Math.max(...dataStore.ledgerTransactions.map(t => t.id)) + 1
      : 1;

    const now = new Date().toISOString();
    const newTx: LedgerTransaction = {
      id: nextTxId,
      uuid: crypto.randomUUID(),
      transaction_reference: this.generateReference(),
      transaction_type: draft.transaction_type,
      status: 'POSTED',
      currency: curr,
      amount: draft.amount,
      description: draft.description,
      idempotency_key: draft.idempotency_key || null,
      external_reference: draft.external_reference || null,
      metadata: draft.metadata || {},
      related_transaction_id: null,
      created_by: draft.created_by || null,
      created_at: now,
      posted_at: now,
      reversed_at: null
    };

    let nextEntryId = dataStore.ledgerEntries.length > 0
      ? Math.max(...dataStore.ledgerEntries.map(e => e.id)) + 1
      : 1;

    const createdEntries: LedgerEntry[] = [];
    for (const ve of validatedEntries) {
      const entryRecord: LedgerEntry = {
        id: nextEntryId++,
        transaction_id: newTx.id,
        ledger_account_id: ve.accountId,
        entry_type: ve.entryType,
        amount: ve.amountDec.toString(),
        currency: curr,
        description: ve.description,
        metadata: ve.metadata,
        created_at: now
      };
      createdEntries.push(entryRecord);
    }

    // Commit to dataStore
    dataStore.ledgerTransactions.push(newTx);
    dataStore.ledgerEntries.push(...createdEntries);

    // 7. Update derived wallet caches for affected users
    for (const uid of affectedUserIds) {
      balanceService.recalculateBalance(uid, curr);
    }

    // 8. Audit event
    const duration = Date.now() - startTime;
    logger.info('FINANCE', `Posted transaction #${newTx.id} (${newTx.transaction_reference}) [${newTx.transaction_type}] Amount: ${curr} ${newTx.amount} in ${duration}ms`);

    securityEventService.record({
      type: 'FINANCIAL_TRANSACTION_POSTED',
      actor: { id: draft.created_by || null },
      target: { type: 'LEDGER_TRANSACTION', id: String(newTx.id) },
      description: `Posted ${newTx.transaction_type} of ${curr} ${newTx.amount}. Ref: ${newTx.transaction_reference}`,
      ip: '127.0.0.1',
      userAgent: 'ApexPlatform Ledger Engine'
    });

    return {
      ...newTx,
      entries: createdEntries
    };
  }

  /**
   * Immutable reversal: Posts a new transaction that mirrors the original
   * with Debits and Credits swapped. Never deletes or mutates original entries.
   */
  public reverseTransaction(
    originalTxId: number,
    actorUserId: number,
    reason: string
  ): LedgerTransaction {
    const originalTx = dataStore.ledgerTransactions.find(t => t.id === originalTxId);
    if (!originalTx) {
      throw new Error(`Transaction #${originalTxId} does not exist.`);
    }
    if (originalTx.status !== 'POSTED') {
      throw new Error(`Only POSTED transactions can be reversed. Current status: ${originalTx.status}`);
    }

    const originalEntries = dataStore.ledgerEntries.filter(e => e.transaction_id === originalTxId);
    if (originalEntries.length < 2) {
      throw new Error(`Original transaction #${originalTxId} is missing ledger entries.`);
    }

    // Prepare inverted entries: original DEBIT becomes CREDIT, original CREDIT becomes DEBIT
    const invertedEntries: EntryDraft[] = originalEntries.map(e => ({
      account_id: e.ledger_account_id,
      entry_type: e.entry_type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amount: e.amount,
      description: `Reversal of entry #${e.id}: ${reason}`,
      metadata: { original_entry_id: e.id, reversal_reason: reason }
    }));

    const reversalDraft: CreateTransactionDraft = {
      transaction_type: 'REVERSAL',
      currency: originalTx.currency,
      amount: originalTx.amount,
      description: `Reversal of ${originalTx.transaction_reference}: ${reason}`,
      idempotency_key: `reversal_${originalTx.id}_${Date.now()}`,
      external_reference: originalTx.transaction_reference,
      metadata: {
        original_transaction_id: originalTx.id,
        original_reference: originalTx.transaction_reference,
        reason
      },
      created_by: actorUserId
    };

    const reversalTx = this.postTransaction(reversalDraft, invertedEntries);

    // Link transactions
    originalTx.status = 'REVERSED';
    originalTx.reversed_at = reversalTx.posted_at;
    originalTx.related_transaction_id = reversalTx.id;
    reversalTx.related_transaction_id = originalTx.id;

    securityEventService.record({
      type: 'FINANCIAL_TRANSACTION_REVERSED',
      actor: { id: actorUserId },
      target: { type: 'LEDGER_TRANSACTION', id: String(originalTx.id) },
      description: `Reversed transaction #${originalTx.id} (${originalTx.transaction_reference}) with Reversal #${reversalTx.id}. Reason: ${reason}`,
      ip: '127.0.0.1',
      userAgent: 'ApexPlatform Ledger Engine'
    });

    return reversalTx;
  }

  /**
   * Internal Transfer: Lock Funds (USER_AVAILABLE -> USER_LOCKED)
   */
  public lockFunds(
    userId: number,
    amount: string,
    currency: string = 'USD',
    reason: string = 'Funds locked for active engagement',
    idempotencyKey?: string
  ): LedgerTransaction {
    const curr = currency.toUpperCase();
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', curr);
    const lockedAcc = accountService.getUserAccount(userId, 'USER_LOCKED', curr);

    const draft: CreateTransactionDraft = {
      transaction_type: 'LOCK_FUNDS',
      currency: curr,
      amount,
      description: reason,
      idempotency_key: idempotencyKey || null,
      created_by: userId
    };

    const entries: EntryDraft[] = [
      {
        account_id: availableAcc.id,
        entry_type: 'DEBIT',
        amount,
        description: `Lock funds: Deduct from available balance`
      },
      {
        account_id: lockedAcc.id,
        entry_type: 'CREDIT',
        amount,
        description: `Lock funds: Credit to locked balance`
      }
    ];

    return this.postTransaction(draft, entries);
  }

  /**
   * Internal Transfer: Unlock Funds (USER_LOCKED -> USER_AVAILABLE)
   */
  public unlockFunds(
    userId: number,
    amount: string,
    currency: string = 'USD',
    reason: string = 'Funds unlocked and returned to available',
    idempotencyKey?: string
  ): LedgerTransaction {
    const curr = currency.toUpperCase();
    const lockedAcc = accountService.getUserAccount(userId, 'USER_LOCKED', curr);
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', curr);

    const draft: CreateTransactionDraft = {
      transaction_type: 'UNLOCK_FUNDS',
      currency: curr,
      amount,
      description: reason,
      idempotency_key: idempotencyKey || null,
      created_by: userId
    };

    const entries: EntryDraft[] = [
      {
        account_id: lockedAcc.id,
        entry_type: 'DEBIT',
        amount,
        description: `Unlock funds: Deduct from locked balance`
      },
      {
        account_id: availableAcc.id,
        entry_type: 'CREDIT',
        amount,
        description: `Unlock funds: Credit to available balance`
      }
    ];

    return this.postTransaction(draft, entries);
  }

  /**
   * External Inflow: Deposit Funds (SYSTEM_CASH -> USER_AVAILABLE)
   * Double-entry ledger settlement for verified cryptocurrency or bank deposits
   */
  public depositFunds(
    userId: number,
    amount: string,
    currency: string = 'USD',
    externalRef?: string,
    metadata?: Record<string, unknown>,
    idempotencyKey?: string
  ): LedgerTransaction {
    const curr = currency.toUpperCase();
    const systemCashAcc = accountService.getSystemAccount('SYSTEM_CASH', curr);
    const userAvailableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', curr);

    const draft: CreateTransactionDraft = {
      transaction_type: 'DEPOSIT',
      currency: curr,
      amount,
      description: `Cryptographic deposit inflow: ${amount} ${curr}`,
      external_reference: externalRef || null,
      idempotency_key: idempotencyKey || null,
      metadata: metadata || {},
      created_by: userId
    };

    const entries: EntryDraft[] = [
      {
        account_id: systemCashAcc.id,
        entry_type: 'DEBIT',
        amount,
        description: `External cash inflow: Debited into SYSTEM_CASH`
      },
      {
        account_id: userAvailableAcc.id,
        entry_type: 'CREDIT',
        amount,
        description: `Deposit credit: Added to USER_AVAILABLE`
      }
    ];

    return this.postTransaction(draft, entries);
  }

  public getTransactionWithEntries(transactionId: number): LedgerTransaction | null {
    const tx = dataStore.ledgerTransactions.find(t => t.id === transactionId);
    if (!tx) return null;

    const entries = dataStore.ledgerEntries
      .filter(e => e.transaction_id === transactionId)
      .map(e => {
        const acc = accountService.getAccountById(e.ledger_account_id);
        return {
          ...e,
          account_code: acc?.account_code,
          account_type: acc?.account_type
        };
      });

    return {
      ...tx,
      entries
    };
  }
}

export const financialTransactionService = FinancialTransactionService.getInstance();
