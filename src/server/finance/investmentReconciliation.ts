import { dataStore } from '../dataStore.js';
import { balanceService } from './balanceService.js';
import { Decimal } from './decimal.js';

export interface InvestmentReconciliationReport {
  timestamp: string;
  status: 'RECONCILIATION PASSED' | 'RECONCILIATION FAILED';
  investmentsChecked: number;
  discrepancies: Array<{
    investmentId: number;
    publicReference: string;
    issue: string;
  }>;
}

export class InvestmentReconciliationService {
  public static reconcile(): InvestmentReconciliationReport {
    const discrepancies: Array<{ investmentId: number; publicReference: string; issue: string }> = [];
    let checked = 0;

    // Group active/locked principal by user and currency
    const userActivePrincipal: Record<string, Decimal> = {};

    for (const inv of dataStore.userInvestments) {
      if (inv.status === 'ACTIVE') {
        checked++;
        const key = `${inv.user_id}_${inv.currency}`;
        const amt = Decimal.fromString(inv.principal_amount);
        userActivePrincipal[key] = (userActivePrincipal[key] || Decimal.zero()).add(amt);
      }
    }

    // Verify against authoritative ledger USER_INVESTMENT account balances
    for (const [key, expectedTotal] of Object.entries(userActivePrincipal)) {
      const [userIdStr, currency] = key.split('_');
      const userId = Number(userIdStr);
      try {
        const ledgerBalance = balanceService.getInvestmentBalance(userId, currency);
        if (!ledgerBalance.equals(expectedTotal)) {
          discrepancies.push({
            investmentId: 0,
            publicReference: `USER_ACC_${userId}_${currency}`,
            issue: `Ledger USER_INVESTMENT balance (${ledgerBalance.toString()}) does not match sum of active user investments (${expectedTotal.toString()})`
          });
        }
      } catch (err: unknown) {
        discrepancies.push({
          investmentId: 0,
          publicReference: `USER_ACC_${userId}_${currency}`,
          issue: `Error reading ledger balance: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      status: discrepancies.length === 0 ? 'RECONCILIATION PASSED' : 'RECONCILIATION FAILED',
      investmentsChecked: checked,
      discrepancies
    };
  }
}
