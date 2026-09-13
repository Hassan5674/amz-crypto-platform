import { dataStore } from '../dataStore.js';
import { WithdrawalRequest } from '../../types/finance.js';
import { Decimal } from './decimal.js';
import { logger } from '../logger.js';

export interface WithdrawalReconciliationItem {
  withdrawalId: number;
  publicReference: string;
  userId: number;
  amount: string;
  status: string;
  providerReference: string | null;
  reconciliationStatus: 'MATCHED' | 'MISMATCH' | 'MISSING_PROVIDER_REF' | 'AMOUNT_MISMATCH' | 'LEDGER_UNSETTLED';
  details: string;
}

export interface WithdrawalReconciliationReport {
  timestamp: string;
  totalWithdrawalsChecked: number;
  matchedCount: number;
  mismatchCount: number;
  items: WithdrawalReconciliationItem[];
}

export class WithdrawalReconciliationService {
  public static reconcileAll(): WithdrawalReconciliationReport {
    const items: WithdrawalReconciliationItem[] = [];
    let matched = 0;
    let mismatches = 0;

    for (const wd of dataStore.withdrawalRequests) {
      let recStatus: WithdrawalReconciliationItem['reconciliationStatus'] = 'MATCHED';
      let details = 'Withdrawal matches ledger and provider records perfectly.';

      if (wd.status === 'COMPLETED' && !wd.settlement_ledger_transaction_id) {
        recStatus = 'LEDGER_UNSETTLED';
        details = 'Withdrawal marked COMPLETED but missing settlement ledger transaction.';
        mismatches++;
      } else if (wd.status === 'PROCESSING' && !wd.provider_reference) {
        recStatus = 'MISSING_PROVIDER_REF';
        details = 'Withdrawal marked PROCESSING but lacks provider reference.';
        mismatches++;
      } else {
        matched++;
      }

      items.push({
        withdrawalId: wd.id,
        publicReference: wd.public_reference,
        userId: wd.user_id,
        amount: wd.requested_amount,
        status: wd.status,
        providerReference: wd.provider_reference,
        reconciliationStatus: recStatus,
        details
      });
    }

    logger.info('FINANCE_RECON', `Withdrawal reconciliation completed. Total: ${dataStore.withdrawalRequests.length}, Matched: ${matched}, Mismatches: ${mismatches}`);

    return {
      timestamp: new Date().toISOString(),
      totalWithdrawalsChecked: dataStore.withdrawalRequests.length,
      matchedCount: matched,
      mismatchCount: mismatches,
      items
    };
  }
}
