import { dataStore } from '../dataStore.js';
import { accountService } from './accountService.js';
import { balanceService } from './balanceService.js';
import { Decimal } from './decimal.js';
import { ReconciliationReport } from '../../types/finance.js';
import { logger } from '../logger.js';

export class ReconciliationService {
  private static instance: ReconciliationService;

  private constructor() {}

  public static getInstance(): ReconciliationService {
    if (!ReconciliationService.instance) {
      ReconciliationService.instance = new ReconciliationService();
    }
    return ReconciliationService.instance;
  }

  /**
   * Comprehensive Audit of all 9 double-entry financial invariants:
   * 1. Every transaction is balanced.
   * 2. Debit total = credit total.
   * 3. Ledger entries use valid accounts.
   * 4. Currency matches across transactions and entries.
   * 5. Wallet balances equal ledger-derived balances.
   * 6. No orphaned entries.
   * 7. No duplicate idempotency keys.
   * 8. No invalid zero or negative amounts.
   * 9. No missing transaction references.
   */
  public reconcileAll(): ReconciliationReport {
    const startTime = Date.now();
    const discrepancies: ReconciliationReport['discrepancies'] = [];

    const txMap = new Map<number, typeof dataStore.ledgerTransactions[0]>();
    const idempotencySet = new Set<string>();

    let totalDebitsAll = Decimal.zero();
    let totalCreditsAll = Decimal.zero();

    // --- Invariant 7 & 9: Transactions Reference & Idempotency ---
    for (const tx of dataStore.ledgerTransactions) {
      txMap.set(tx.id, tx);

      if (!tx.transaction_reference || tx.transaction_reference.trim() === '') {
        discrepancies.push({
          code: 'INV_9_MISSING_TX_REF',
          entity_id: tx.id,
          description: `Transaction #${tx.id} is missing a unique transaction reference.`,
          severity: 'CRITICAL'
        });
      }

      if (tx.idempotency_key) {
        if (idempotencySet.has(tx.idempotency_key)) {
          discrepancies.push({
            code: 'INV_7_DUPLICATE_IDEMPOTENCY',
            entity_id: tx.id,
            description: `Duplicate idempotency key detected: "${tx.idempotency_key}" on Txn #${tx.id}`,
            severity: 'CRITICAL'
          });
        } else {
          idempotencySet.add(tx.idempotency_key);
        }
      }
    }

    // Group entries by transaction
    const entriesByTx = new Map<number, typeof dataStore.ledgerEntries>();
    const accountIds = new Set(dataStore.ledgerAccounts.map(a => a.id));

    // --- Invariant 3, 6, 8: Entry Validation ---
    for (const entry of dataStore.ledgerEntries) {
      // Invariant 6: Orphaned entries
      if (!txMap.has(entry.transaction_id)) {
        discrepancies.push({
          code: 'INV_6_ORPHANED_ENTRY',
          entity_id: entry.id,
          description: `Ledger entry #${entry.id} references non-existent transaction #${entry.transaction_id}`,
          severity: 'CRITICAL'
        });
      }

      // Invariant 3: Valid account
      if (!accountIds.has(entry.ledger_account_id)) {
        discrepancies.push({
          code: 'INV_3_INVALID_ACCOUNT',
          entity_id: entry.id,
          description: `Entry #${entry.id} references non-existent account ID ${entry.ledger_account_id}`,
          severity: 'CRITICAL'
        });
      }

      // Invariant 8: No negative or zero amounts
      try {
        const amtDec = Decimal.fromString(entry.amount);
        if (amtDec.isZero() || amtDec.isNegative()) {
          discrepancies.push({
            code: 'INV_8_INVALID_AMOUNT',
            entity_id: entry.id,
            description: `Entry #${entry.id} has invalid non-positive amount: "${entry.amount}"`,
            severity: 'CRITICAL'
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        discrepancies.push({
          code: 'INV_8_MALFORMED_AMOUNT',
          entity_id: entry.id,
          description: `Entry #${entry.id} amount cannot be parsed: ${msg}`,
          severity: 'CRITICAL'
        });
      }

      // Add to transaction map
      const list = entriesByTx.get(entry.transaction_id) || [];
      list.push(entry);
      entriesByTx.set(entry.transaction_id, list);
    }

    // --- Invariant 1, 2, 4: Transaction Balancing & Currency ---
    let unbalancedTxCount = 0;
    for (const tx of dataStore.ledgerTransactions) {
      if (tx.status !== 'POSTED' && tx.status !== 'REVERSED') continue;

      const entries = entriesByTx.get(tx.id) || [];
      if (entries.length < 2) {
        discrepancies.push({
          code: 'INV_1_INSUFFICIENT_ENTRIES',
          entity_id: tx.id,
          description: `Posted transaction #${tx.id} has only ${entries.length} entries. Double-entry requires at least 2.`,
          severity: 'CRITICAL'
        });
        unbalancedTxCount++;
        continue;
      }

      let txDebits = Decimal.zero();
      let txCredits = Decimal.zero();

      for (const e of entries) {
        // Invariant 4: Currency match
        if (e.currency !== tx.currency) {
          discrepancies.push({
            code: 'INV_4_CURRENCY_MISMATCH',
            entity_id: e.id,
            description: `Entry #${e.id} currency (${e.currency}) does not match transaction currency (${tx.currency})`,
            severity: 'CRITICAL'
          });
        }

        const amtDec = Decimal.fromString(e.amount);
        if (e.entry_type === 'DEBIT') {
          txDebits = txDebits.add(amtDec);
          totalDebitsAll = totalDebitsAll.add(amtDec);
        } else if (e.entry_type === 'CREDIT') {
          txCredits = txCredits.add(amtDec);
          totalCreditsAll = totalCreditsAll.add(amtDec);
        }
      }

      // Invariant 1 & 2: Debits == Credits
      if (!txDebits.equals(txCredits)) {
        discrepancies.push({
          code: 'INV_2_UNBALANCED_TRANSACTION',
          entity_id: tx.id,
          description: `Unbalanced transaction #${tx.id}: Debits (${txDebits.toString()}) != Credits (${txCredits.toString()})`,
          severity: 'CRITICAL'
        });
        unbalancedTxCount++;
      }
    }

    // --- Invariant 5: Wallet Cached Balance equals Ledger-Derived Balance ---
    let mismatchedWalletCount = 0;
    for (const wallet of dataStore.wallets) {
      const check = balanceService.verifyBalance(wallet.user_id, wallet.currency);
      if (!check.matches) {
        discrepancies.push({
          code: 'INV_5_WALLET_CACHE_MISMATCH',
          entity_id: wallet.id,
          description: `User #${wallet.user_id} wallet cache (${check.cached}) does not match ledger derivation (${check.derived})`,
          severity: 'WARNING'
        });
        mismatchedWalletCount++;
        // Auto-heal cache
        balanceService.recalculateBalance(wallet.user_id, wallet.currency);
      }
    }

    // Calculate system overview figures
    let totalUserLiabilities = Decimal.zero();
    let totalSystemAssets = Decimal.zero();

    for (const acc of dataStore.ledgerAccounts) {
      const bal = balanceService.getAccountBalance(acc.id);
      if (acc.owner_user_id) {
        totalUserLiabilities = totalUserLiabilities.add(bal);
      } else if (acc.account_type === 'SYSTEM_CASH' || acc.account_type === 'SYSTEM_CLEARING') {
        totalSystemAssets = totalSystemAssets.add(bal);
      }
    }

    const duration = Date.now() - startTime;
    const isPassed = discrepancies.filter(d => d.severity === 'CRITICAL').length === 0;

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      status: isPassed ? 'RECONCILIATION PASSED' : 'RECONCILIATION FAILED',
      invariants_checked: 9,
      invariants_passed: isPassed ? 9 : Math.max(0, 9 - discrepancies.length),
      total_transactions_checked: dataStore.ledgerTransactions.length,
      total_entries_checked: dataStore.ledgerEntries.length,
      total_accounts_checked: dataStore.ledgerAccounts.length,
      discrepancies,
      summary: {
        total_debits: totalDebitsAll.toString(),
        total_credits: totalCreditsAll.toString(),
        total_user_liabilities: totalUserLiabilities.toString(),
        total_system_assets: totalSystemAssets.toString(),
        unbalanced_transactions_count: unbalancedTxCount,
        mismatched_wallet_cache_count: mismatchedWalletCount
      }
    };

    logger.info('FINANCE_RECON', `Completed reconciliation in ${duration}ms. Status: ${report.status} (${discrepancies.length} discrepancies)`);
    return report;
  }

  public reconcileWallet(userId: number, currency: string = 'USD'): {
    user_id: number;
    status: 'RECONCILIATION PASSED' | 'RECONCILIATION FAILED';
    cached_total: string;
    ledger_derived_total: string;
    sub_accounts: Record<string, string>;
  } {
    const curr = currency.toUpperCase();
    const verification = balanceService.verifyBalance(userId, curr);

    const avail = balanceService.getAvailableBalance(userId, curr).toString();
    const locked = balanceService.getLockedBalance(userId, curr).toString();
    const invest = balanceService.getInvestmentBalance(userId, curr).toString();
    const stake = balanceService.getStakingBalance(userId, curr).toString();
    const bonus = balanceService.getBonusBalance(userId, curr).toString();

    return {
      user_id: userId,
      status: verification.matches ? 'RECONCILIATION PASSED' : 'RECONCILIATION FAILED',
      cached_total: verification.cached,
      ledger_derived_total: verification.derived,
      sub_accounts: {
        available: avail,
        locked,
        investment: invest,
        staking: stake,
        bonus
      }
    };
  }

  public reconcileTransaction(transactionId: number): {
    transaction_id: number;
    status: 'BALANCED' | 'UNBALANCED' | 'NOT_FOUND';
    total_debits: string;
    total_credits: string;
    entries_count: number;
    discrepancy?: string;
  } {
    const tx = dataStore.ledgerTransactions.find(t => t.id === transactionId);
    if (!tx) {
      return {
        transaction_id: transactionId,
        status: 'NOT_FOUND',
        total_debits: '0.00000000',
        total_credits: '0.00000000',
        entries_count: 0,
        discrepancy: 'Transaction ID not found'
      };
    }

    const entries = dataStore.ledgerEntries.filter(e => e.transaction_id === transactionId);
    let debits = Decimal.zero();
    let credits = Decimal.zero();

    for (const e of entries) {
      const amt = Decimal.fromString(e.amount);
      if (e.entry_type === 'DEBIT') debits = debits.add(amt);
      if (e.entry_type === 'CREDIT') credits = credits.add(amt);
    }

    const isBalanced = debits.equals(credits);
    return {
      transaction_id: transactionId,
      status: isBalanced ? 'BALANCED' : 'UNBALANCED',
      total_debits: debits.toString(),
      total_credits: credits.toString(),
      entries_count: entries.length,
      discrepancy: isBalanced ? undefined : `Debits (${debits.toString()}) != Credits (${credits.toString()})`
    };
  }
}

export const reconciliationService = ReconciliationService.getInstance();
