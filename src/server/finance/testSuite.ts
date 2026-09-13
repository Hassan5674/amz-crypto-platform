import { accountService } from './accountService.js';
import { financialTransactionService } from './transactionService.js';
import { balanceService } from './balanceService.js';
import { reconciliationService } from './reconciliationService.js';
import { Decimal } from './decimal.js';
import { logger } from '../logger.js';
import { dataStore } from '../dataStore.js';

export interface TestResult {
  suite: 'SECTION_28_GENERIC_LIFECYCLE' | 'SECTION_29_NEGATIVE_CONSTRAINTS';
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export class FinancialTestSuite {
  public static runAllTests(): {
    timestamp: string;
    total: number;
    passed: number;
    failed: number;
    allPassed: boolean;
    results: TestResult[];
  } {
    const results: TestResult[] = [];
    logger.info('FINANCE_TESTS', 'Initiating Phase 3 Financial Invariants Test Suite...');

    // We use a dedicated, isolated test user ID per run to avoid state contamination across repeated executions
    const testUserId = 999000 + Math.floor(Math.random() * 900000);
    const curr = 'USD';
    const wallet = accountService.ensureUserAccounts(testUserId, curr);

    // =========================================================================
    // SECTION 28: Generic Ledger Operations Lifecycle
    // =========================================================================

    // Test 1: Initial balance must be zero (no fake money)
    try {
      const initialBal = balanceService.getAvailableBalance(testUserId, curr);
      const passed = initialBal.isZero();
      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '1. Initial User Balance Is Zero (No Fake Money)',
        passed,
        expected: '0.00000000',
        actual: initialBal.toString()
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '1. Initial User Balance Is Zero',
        passed: false,
        expected: '0.00000000',
        actual: String(err)
      });
    }

    // Test 2: Transaction A: Debit System Clearing 100, Credit User Available 100
    let txAId = 0;
    try {
      const sysClearing = accountService.getSystemAccount('SYSTEM_CLEARING', curr);
      const userAvail = accountService.getUserAccount(testUserId, 'USER_AVAILABLE', curr);

      const txA = financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '100.00000000',
          description: 'Test Section 28 Tx A: System Clearing -> User Available',
          idempotency_key: `sec28_step1_${Date.now()}`
        },
        [
          {
            account_id: sysClearing.id,
            entry_type: 'DEBIT',
            amount: '100.00000000',
            description: 'Debit Clearing'
          },
          {
            account_id: userAvail.id,
            entry_type: 'CREDIT',
            amount: '100.00000000',
            description: 'Credit User Available'
          }
        ]
      );
      txAId = txA.id;

      const availAfterA = balanceService.getAvailableBalance(testUserId, curr);
      const reconA = reconciliationService.reconcileTransaction(txA.id);
      const passed = availAfterA.toString() === '100.00000000' && reconA.status === 'BALANCED';

      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '2. Transaction A: Debit Clearing 100, Credit Available 100',
        passed,
        expected: 'Available = 100.00000000, Status = BALANCED',
        actual: `Available = ${availAfterA.toString()}, Status = ${reconA.status}`
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '2. Transaction A: Debit Clearing 100, Credit Available 100',
        passed: false,
        expected: 'Success',
        actual: String(err)
      });
    }

    // Test 3: Lock 30: Debit User Available 30, Credit User Locked 30
    let lockTxId = 0;
    try {
      const lockTx = financialTransactionService.lockFunds(
        testUserId,
        '30.00000000',
        curr,
        'Test Section 28 Step 2: Lock 30',
        `sec28_step2_${Date.now()}`
      );
      lockTxId = lockTx.id;

      const availAfterLock = balanceService.getAvailableBalance(testUserId, curr);
      const lockedAfterLock = balanceService.getLockedBalance(testUserId, curr);
      const passed = availAfterLock.toString() === '70.00000000' && lockedAfterLock.toString() === '30.00000000';

      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '3. Lock 30: Debit Available 30, Credit Locked 30',
        passed,
        expected: 'Available = 70.00000000, Locked = 30.00000000',
        actual: `Available = ${availAfterLock.toString()}, Locked = ${lockedAfterLock.toString()}`
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '3. Lock 30: Debit Available 30, Credit Locked 30',
        passed: false,
        expected: 'Success',
        actual: String(err)
      });
    }

    // Test 4: Unlock 30: Debit User Locked 30, Credit User Available 30
    try {
      const unlockTx = financialTransactionService.unlockFunds(
        testUserId,
        '30.00000000',
        curr,
        'Test Section 28 Step 3: Unlock 30',
        `sec28_step3_${Date.now()}`
      );

      const availAfterUnlock = balanceService.getAvailableBalance(testUserId, curr);
      const lockedAfterUnlock = balanceService.getLockedBalance(testUserId, curr);
      const passed = availAfterUnlock.toString() === '100.00000000' && lockedAfterUnlock.toString() === '0.00000000';

      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '4. Unlock 30: Balances return to initial state',
        passed,
        expected: 'Available = 100.00000000, Locked = 0.00000000',
        actual: `Available = ${availAfterUnlock.toString()}, Locked = ${lockedAfterUnlock.toString()}`
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '4. Unlock 30: Balances return to initial state',
        passed: false,
        expected: 'Success',
        actual: String(err)
      });
    }

    // Test 5: Reversal Test
    try {
      if (txAId > 0) {
        // Reverse Tx A (which credited 100 to user)
        const reversalTx = financialTransactionService.reverseTransaction(
          txAId,
          1,
          'Test Section 28 Reversal of Tx A'
        );
        const availAfterReversal = balanceService.getAvailableBalance(testUserId, curr);
        const passed = availAfterReversal.isZero() && reversalTx.status === 'POSTED';

        results.push({
          suite: 'SECTION_28_GENERIC_LIFECYCLE',
          testName: '5. Immutable Reversal: Inverts entries and restores balance',
          passed,
          expected: 'Available = 0.00000000, Reversal Status = POSTED',
          actual: `Available = ${availAfterReversal.toString()}, Reversal Status = ${reversalTx.status}`
        });
      }
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_28_GENERIC_LIFECYCLE',
        testName: '5. Immutable Reversal Test',
        passed: false,
        expected: 'Success',
        actual: String(err)
      });
    }

    // =========================================================================
    // SECTION 29: Negative Tests & Invariant Constraints
    // =========================================================================

    const sysClearing = accountService.getSystemAccount('SYSTEM_CLEARING', curr);
    const userAvail = accountService.getUserAccount(testUserId, 'USER_AVAILABLE', curr);

    // Negative Test 1: Reject Negative Amount
    try {
      financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '-50.00',
          description: 'Negative Amount Test'
        },
        [
          { account_id: sysClearing.id, entry_type: 'DEBIT', amount: '-50.00', description: 'Invalid' },
          { account_id: userAvail.id, entry_type: 'CREDIT', amount: '-50.00', description: 'Invalid' }
        ]
      );
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '6. Reject Negative Amount',
        passed: false,
        expected: 'Rejection Exception',
        actual: 'Transaction unexpectedly accepted'
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '6. Reject Negative Amount',
        passed: true,
        expected: 'Rejection Exception',
        actual: `Properly rejected: ${(err as Error).message}`
      });
    }

    // Negative Test 2: Reject Zero Amount Entry
    try {
      financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '10.00',
          description: 'Zero Amount Entry Test'
        },
        [
          { account_id: sysClearing.id, entry_type: 'DEBIT', amount: '0.00', description: 'Zero' },
          { account_id: userAvail.id, entry_type: 'CREDIT', amount: '0.00', description: 'Zero' }
        ]
      );
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '7. Reject Zero Amount Entry',
        passed: false,
        expected: 'Rejection Exception',
        actual: 'Transaction unexpectedly accepted'
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '7. Reject Zero Amount Entry',
        passed: true,
        expected: 'Rejection Exception',
        actual: `Properly rejected: ${(err as Error).message}`
      });
    }

    // Negative Test 3: Reject Unbalanced Transaction (Debits != Credits)
    try {
      financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '100.00',
          description: 'Unbalanced Test'
        },
        [
          { account_id: sysClearing.id, entry_type: 'DEBIT', amount: '100.00', description: '100 Debit' },
          { account_id: userAvail.id, entry_type: 'CREDIT', amount: '90.00', description: '90 Credit' }
        ]
      );
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '8. Reject Unbalanced Transaction (Debits != Credits)',
        passed: false,
        expected: 'Rejection Exception',
        actual: 'Unbalanced transaction accepted!'
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '8. Reject Unbalanced Transaction (Debits != Credits)',
        passed: true,
        expected: 'Rejection Exception',
        actual: `Properly rejected: ${(err as Error).message}`
      });
    }

    // Negative Test 4: Reject Missing / Non-existent Account
    try {
      financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '50.00',
          description: 'Missing Account Test'
        },
        [
          { account_id: 999999, entry_type: 'DEBIT', amount: '50.00', description: 'Invalid' },
          { account_id: userAvail.id, entry_type: 'CREDIT', amount: '50.00', description: 'Valid' }
        ]
      );
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '9. Reject Missing / Non-Existent Account',
        passed: false,
        expected: 'Rejection Exception',
        actual: 'Missing account accepted!'
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '9. Reject Missing / Non-Existent Account',
        passed: true,
        expected: 'Rejection Exception',
        actual: `Properly rejected: ${(err as Error).message}`
      });
    }

    // Negative Test 5: Idempotency Enforcement (Duplicate request returns existing)
    try {
      const key = `idem_test_${Date.now()}`;
      // First submission
      const first = financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '25.00',
          description: 'Idempotency First',
          idempotency_key: key
        },
        [
          { account_id: sysClearing.id, entry_type: 'DEBIT', amount: '25.00', description: 'Debit' },
          { account_id: userAvail.id, entry_type: 'CREDIT', amount: '25.00', description: 'Credit' }
        ]
      );

      // Second identical submission
      const second = financialTransactionService.postTransaction(
        {
          transaction_type: 'ADJUSTMENT',
          currency: curr,
          amount: '25.00',
          description: 'Idempotency Second',
          idempotency_key: key
        },
        [
          { account_id: sysClearing.id, entry_type: 'DEBIT', amount: '25.00', description: 'Debit' },
          { account_id: userAvail.id, entry_type: 'CREDIT', amount: '25.00', description: 'Credit' }
        ]
      );

      const passed = first.id === second.id && first.transaction_reference === second.transaction_reference;
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '10. Idempotency Key Deduping: Returns existing, no double post',
        passed,
        expected: `Same Txn ID #${first.id}`,
        actual: `Txn ID #${second.id} (Matches = ${passed})`
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '10. Idempotency Key Deduping',
        passed: false,
        expected: 'Deduplicated Txn',
        actual: String(err)
      });
    }

    // Negative Test 6: Insufficient Funds Rejection
    try {
      // Attempt to lock 50,000.00 when available is only 25.00
      financialTransactionService.lockFunds(
        testUserId,
        '50000.00',
        curr,
        'Insufficient funds test'
      );
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '11. Insufficient Funds Rejection',
        passed: false,
        expected: 'Rejection Exception',
        actual: 'Overdraft unexpectedly allowed!'
      });
    } catch (err: unknown) {
      results.push({
        suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
        testName: '11. Insufficient Funds Rejection',
        passed: true,
        expected: 'Rejection Exception',
        actual: `Properly rejected: ${(err as Error).message}`
      });
    }

    // Final Overall Invariant Audit
    const reconAudit = reconciliationService.reconcileAll();
    results.push({
      suite: 'SECTION_29_NEGATIVE_CONSTRAINTS',
      testName: '12. Global Double-Entry Reconciliation Status',
      passed: reconAudit.status === 'RECONCILIATION PASSED',
      expected: 'RECONCILIATION PASSED',
      actual: reconAudit.status,
      details: `${reconAudit.invariants_passed} / ${reconAudit.invariants_checked} invariants verified`
    });

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    return {
      timestamp: new Date().toISOString(),
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      allPassed: failedCount === 0,
      results
    };
  }
}
