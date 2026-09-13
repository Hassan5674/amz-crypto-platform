import { Decimal } from './decimal.js';
import { InvestmentPlanVersion } from '../../types/investment.js';

export interface InvestmentCalculationResult {
  principal: string;
  expectedReturn: string;
  fees: string;
  netPrincipal: string;
  maturityAmount: string;
  dailyAccrualRate: string;
}

export class InvestmentReturnService {
  /**
   * Calculate expected return, maturity amount, and fees using precise Decimal arithmetic.
   */
  public static calculateReturn(
    principalStr: string,
    version: InvestmentPlanVersion
  ): InvestmentCalculationResult {
    const principal = Decimal.fromString(principalStr);
    const returnRate = Decimal.fromString(version.return_rate); // e.g. "10.00" for 10% annual or term
    const hundred = Decimal.fromString('100');

    // Calculate Entry Fee if specified
    const entryFeePct = version.fees_structure?.entry_fee_pct
      ? Decimal.fromString(version.fees_structure.entry_fee_pct)
      : Decimal.ZERO;
    const fees = principal.multiply(entryFeePct).divide(hundred);
    const netPrincipal = principal.subtract(fees);

    let expectedReturn = Decimal.ZERO;

    if (version.return_model === 'FIXED_RATE' || version.return_model === 'SIMPLE_RETURN') {
      // expectedReturn = principal * (returnRate / 100) * (duration fraction if annual, but usually term rate in fixed term plans)
      // For standard fixed rate term plans, returnRate is the total term return or annual rate. Let's assume returnRate is term return percentage, or annual adjusted by duration.
      // To be robust and explicit: returnRate / 100 * principal
      expectedReturn = principal.multiply(returnRate).divide(hundred);
    } else if (version.return_model === 'PERIODIC_RATE') {
      // Periodic compound or simple rate
      expectedReturn = principal.multiply(returnRate).divide(hundred);
    } else {
      expectedReturn = principal.multiply(returnRate).divide(hundred);
    }

    const maturityAmount = netPrincipal.add(expectedReturn);

    // Daily accrual rate for schedule/accruals
    const durationDays = Math.max(1, version.duration || 30);
    const dailyAccrualRate = expectedReturn.divide(Decimal.fromString(String(durationDays)));

    return {
      principal: principal.toString(2),
      expectedReturn: expectedReturn.toString(2),
      fees: fees.toString(2),
      netPrincipal: netPrincipal.toString(2),
      maturityAmount: maturityAmount.toString(2),
      dailyAccrualRate: dailyAccrualRate.toString(4)
    };
  }

  /**
   * Calculate early exit return payout according to early exit rules and fees.
   */
  public static calculateEarlyExit(
    principalStr: string,
    accruedReturnStr: string,
    version: InvestmentPlanVersion
  ): { refundPrincipal: string; payoutReturn: string; earlyExitFee: string; totalPayout: string } {
    const principal = Decimal.fromString(principalStr);
    const accrued = Decimal.fromString(accruedReturnStr);
    const hundred = Decimal.fromString('100');

    if (!version.early_exit_allowed) {
      throw new Error('Early exit is not allowed for this investment plan version.');
    }

    // Early exit fee percentage or fixed amount
    const exitFeeRate = version.early_exit_fee ? Decimal.fromString(version.early_exit_fee) : Decimal.ZERO;
    // Assume exit fee applies to accrued return or principal penalty
    const earlyExitFee = accrued.multiply(exitFeeRate).divide(hundred);
    const netAccruedReturn = accrued.subtract(earlyExitFee);
    const payoutReturn = netAccruedReturn.isPositive() ? netAccruedReturn : Decimal.ZERO;

    const totalPayout = principal.add(payoutReturn);

    return {
      refundPrincipal: principal.toString(2),
      payoutReturn: payoutReturn.toString(2),
      earlyExitFee: earlyExitFee.toString(2),
      totalPayout: totalPayout.toString(2)
    };
  }
}
