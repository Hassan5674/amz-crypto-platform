import { dataStore } from '../dataStore.js';
import { WithdrawalRequest, WithdrawalStatus, RiskLevel } from '../../types/finance.js';
import { accountService } from './accountService.js';
import { balanceService } from './balanceService.js';
import { financialTransactionService } from './transactionService.js';
import { RiskEngine } from './riskEngine.js';
import { PayoutProviderRegistry } from './payoutProvider.js';
import { Decimal } from './decimal.js';
import { logger } from '../logger.js';
import { securityEventService } from '../services/securityEventService.js';

export class WithdrawalService {
  /**
   * Calculates withdrawal fee and net amount.
   * Standard fee: 1.5% minimum $1.00 or fixed $2.00 flat depending on currency.
   */
  public static calculateFee(amountStr: string, currency: string = 'USD'): { fee: string; net: string } {
    const amt = Decimal.fromString(amountStr);
    // 1.5% fee
    let fee = amt.multiply('0.015');
    const minFee = Decimal.fromString('2.00');
    if (fee.lessThan(minFee)) {
      fee = minFee;
    }
    // Cap fee at $50
    const maxFee = Decimal.fromString('50.00');
    if (fee.greaterThan(maxFee)) {
      fee = maxFee;
    }

    const net = amt.subtract(fee);
    if (net.isNegative() || net.isZero()) {
      throw new Error('Withdrawal amount is too small to cover the transaction fee.');
    }

    return {
      fee: fee.toFixed(8),
      net: net.toFixed(8)
    };
  }

  /**
   * User requests a withdrawal.
   * Atomically verifies available balance, runs risk engine, locks funds in ledger, and creates withdrawal record.
   */
  public static requestWithdrawal(
    userId: number,
    destinationId: number,
    amountStr: string,
    currency: string = 'USD',
    ip: string = '127.0.0.1',
    userAgent: string = 'ApexPlatform-Client'
  ): WithdrawalRequest {
    const curr = currency.toUpperCase();
    const amount = Decimal.fromString(amountStr);

    if (amount.isZero() || amount.isNegative()) {
      throw new Error('Withdrawal amount must be greater than zero.');
    }

    // 1. Validate destination ownership & status
    const destination = dataStore.withdrawalDestinations.find(d => d.id === destinationId && d.user_id === userId);
    if (!destination) {
      throw new Error('Selected withdrawal destination does not exist or does not belong to you.');
    }
    if (destination.verification_status === 'DISABLED') {
      throw new Error('Selected withdrawal destination is disabled.');
    }

    // 2. Verify authoritative available balance via ledger
    const availableBalance = balanceService.getAvailableBalance(userId, curr);
    const { fee, net } = this.calculateFee(amountStr, curr);
    const totalRequired = amount; // Gross amount is deducted from available balance

    if (availableBalance.lessThan(totalRequired)) {
      throw new Error(
        `Insufficient available balance. Available: ${availableBalance.toString()} ${curr}, Requested: ${totalRequired.toString()} ${curr}`
      );
    }

    // 3. Evaluate Risk Engine
    const risk = RiskEngine.evaluateWithdrawal(userId, amountStr, curr, destinationId);
    if (risk.riskLevel === 'BLOCKED') {
      securityEventService.record({
        type: 'HIGH_RISK_WITHDRAWAL_BLOCKED',
        actor: { id: userId },
        target: { type: 'WITHDRAWAL_REQUEST', id: `${curr}_${amountStr}` },
        description: `Withdrawal blocked by Risk Engine. Reasons: ${risk.reasons.join(', ')}`,
        ip,
        userAgent,
        severity: 'HIGH'
      });
      throw new Error(`Withdrawal request blocked by security compliance guardrails: ${risk.reasons[0]}`);
    }

    // 4. Atomically lock funds in ledger: USER_AVAILABLE -> USER_LOCKED
    const idempotencyKey = `wd_lock_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lockTx = financialTransactionService.lockFunds(
      userId,
      amount.toFixed(8),
      curr,
      `Withdrawal reservation for ${destination.display_name}`,
      idempotencyKey
    );

    // 5. Create Withdrawal Request Record
    const withdrawalId = dataStore.withdrawalRequests.length + 1;
    const publicRef = `WDR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const initialStatus: WithdrawalStatus = risk.riskLevel === 'HIGH' || risk.riskLevel === 'MEDIUM' ? 'PENDING_REVIEW' : 'REQUESTED';

    const newRequest: WithdrawalRequest = {
      id: withdrawalId,
      uuid: crypto.randomUUID ? crypto.randomUUID() : `wd_${Date.now()}_${Math.random()}`,
      public_reference: publicRef,
      user_id: userId,
      currency: curr,
      requested_amount: amount.toFixed(8),
      fee_amount: fee,
      net_amount: net,
      destination_id: destinationId,
      destination_summary: `${destination.type.toUpperCase()} - ${destination.display_name} (${destination.masked_identifier})`,
      provider_id: 'sandbox',
      provider_reference: null,
      status: initialStatus,
      risk_score: risk.riskScore,
      risk_level: risk.riskLevel,
      risk_reasons: risk.reasons,
      review_reason: initialStatus === 'PENDING_REVIEW' ? 'Flagged by risk evaluation engine for manual review' : null,
      rejection_reason: null,
      cancellation_reason: null,
      failure_reason: null,
      ledger_transaction_id: lockTx.id,
      settlement_ledger_transaction_id: null,
      requested_at: new Date().toISOString(),
      reviewed_at: null,
      approved_at: null,
      processing_at: null,
      completed_at: null,
      failed_at: null,
      cancelled_at: null,
      reversed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dataStore.withdrawalRequests.push(newRequest);

    securityEventService.record({
      type: 'WITHDRAWAL_REQUESTED',
      actor: { id: userId },
      target: { type: 'WITHDRAWAL', id: newRequest.id },
      description: `User requested withdrawal of ${amount.toString()} ${curr}. Status: ${initialStatus}, Risk: ${risk.riskLevel}`,
      ip,
      userAgent,
      severity: 'LOW'
    });

    logger.info('FINANCE', `Withdrawal requested #${newRequest.id} (${publicRef}) by user #${userId} for ${amount.toString()} ${curr}`);
    return newRequest;
  }

  /**
   * Admin reviews withdrawal (moves PENDING_REVIEW -> REQUESTED or APPROVED).
   */
  public static reviewWithdrawal(withdrawalId: number, adminUserId: number, approve: boolean, notes: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (wd.status !== 'PENDING_REVIEW' && wd.status !== 'REQUESTED') {
      throw new Error(`Withdrawal cannot be reviewed in status: ${wd.status}`);
    }

    wd.reviewed_at = new Date().toISOString();
    wd.updated_at = new Date().toISOString();

    if (approve) {
      wd.status = 'APPROVED';
      wd.approved_at = new Date().toISOString();
      wd.review_reason = notes || 'Reviewed and cleared by finance compliance';
    } else {
      // Reject during review
      return this.rejectWithdrawal(withdrawalId, adminUserId, notes || 'Rejected during compliance review');
    }

    logger.info('FINANCE', `Withdrawal #${withdrawalId} reviewed and APPROVED by admin #${adminUserId}`);
    return wd;
  }

  /**
   * Admin approves withdrawal.
   */
  public static approveWithdrawal(withdrawalId: number, adminUserId: number, notes?: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (wd.status !== 'REQUESTED' && wd.status !== 'PENDING_REVIEW') {
      throw new Error(`Withdrawal cannot be approved from status: ${wd.status}`);
    }

    wd.status = 'APPROVED';
    wd.approved_at = new Date().toISOString();
    wd.updated_at = new Date().toISOString();
    if (notes) wd.review_reason = notes;

    logger.info('FINANCE', `Withdrawal #${withdrawalId} approved by admin #${adminUserId}`);
    return wd;
  }

  /**
   * Reject withdrawal: releases locked funds back to USER_AVAILABLE.
   */
  public static rejectWithdrawal(withdrawalId: number, adminUserId: number, reason: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (['COMPLETED', 'REJECTED', 'CANCELLED', 'REVERSED'].includes(wd.status)) {
      throw new Error(`Withdrawal cannot be rejected in status: ${wd.status}`);
    }

    wd.status = 'REJECTED';
    wd.rejection_reason = reason;
    wd.updated_at = new Date().toISOString();

    // Release locked funds back to user available
    if (wd.ledger_transaction_id) {
      try {
        financialTransactionService.unlockFunds(
          wd.user_id,
          wd.requested_amount,
          wd.currency,
          `Release funds for rejected withdrawal #${wd.public_reference}: ${reason}`,
          `wd_reject_unlock_${wd.id}_${Date.now()}`
        );
      } catch (err: unknown) {
        logger.error('FINANCE', `Failed to unlock funds on withdrawal rejection #${wd.id}: ${String(err)}`);
      }
    }

    logger.info('FINANCE', `Withdrawal #${withdrawalId} rejected by admin #${adminUserId}. Reason: ${reason}`);
    return wd;
  }

  /**
   * Cancel withdrawal (by user or admin): releases locked funds back to USER_AVAILABLE.
   */
  public static cancelWithdrawal(withdrawalId: number, actorUserId: number, isStaff: boolean, reason: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (!isStaff && wd.user_id !== actorUserId) {
      throw new Error('Access denied to cancel this withdrawal.');
    }
    if (!['REQUESTED', 'PENDING_REVIEW', 'APPROVED'].includes(wd.status)) {
      throw new Error(`Withdrawal cannot be cancelled in status: ${wd.status}`);
    }

    wd.status = 'CANCELLED';
    wd.cancellation_reason = reason;
    wd.updated_at = new Date().toISOString();

    // Release locked funds
    if (wd.ledger_transaction_id) {
      try {
        financialTransactionService.unlockFunds(
          wd.user_id,
          wd.requested_amount,
          wd.currency,
          `Release funds for cancelled withdrawal #${wd.public_reference}`,
          `wd_cancel_unlock_${wd.id}_${Date.now()}`
        );
      } catch (err: unknown) {
        logger.error('FINANCE', `Failed to unlock funds on withdrawal cancellation #${wd.id}: ${String(err)}`);
      }
    }

    logger.info('FINANCE', `Withdrawal #${withdrawalId} cancelled by user/admin #${actorUserId}`);
    return wd;
  }

  /**
   * Process approved withdrawal through payment provider.
   */
  public static async processWithdrawal(withdrawalId: number, adminUserId: number): Promise<WithdrawalRequest> {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (wd.status !== 'APPROVED') {
      throw new Error(`Only APPROVED withdrawals can be processed. Current status: ${wd.status}`);
    }

    wd.status = 'PROCESSING';
    wd.processing_at = new Date().toISOString();
    wd.updated_at = new Date().toISOString();

    const destination = dataStore.withdrawalDestinations.find(d => d.id === wd.destination_id);
    const provider = PayoutProviderRegistry.getProvider(wd.provider_id);

    try {
      const payoutRes = await provider.createPayout({
        withdrawalId: wd.id,
        publicReference: wd.public_reference,
        amount: wd.net_amount,
        currency: wd.currency,
        destinationDetails: {
          type: destination?.type || 'unknown',
          maskedIdentifier: destination?.masked_identifier || '****',
          provider: destination?.provider || 'generic'
        }
      });

      wd.provider_reference = payoutRes.providerReference;

      if (payoutRes.status === 'COMPLETED' || payoutRes.success) {
        return this.completeWithdrawal(withdrawalId, adminUserId, payoutRes.providerReference);
      } else if (payoutRes.status === 'FAILED') {
        return this.failWithdrawal(withdrawalId, payoutRes.errorMessage || 'Payment provider payout rejected');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('FINANCE', `Provider payout submission error for withdrawal #${wd.id}: ${msg}`);
      wd.failure_reason = msg;
    }

    return wd;
  }

  /**
   * Complete withdrawal: settles locked funds via ledger (USER_LOCKED -> SYSTEM_CLEARING or SYSTEM_FEES).
   */
  public static completeWithdrawal(withdrawalId: number, actorUserId: number, providerRef: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (wd.status === 'COMPLETED') return wd;

    wd.status = 'COMPLETED';
    wd.completed_at = new Date().toISOString();
    wd.provider_reference = providerRef || wd.provider_reference;
    wd.updated_at = new Date().toISOString();

    // Settle ledger:
    // Debit USER_LOCKED for full requested amount
    // Credit SYSTEM_CLEARING for net amount
    // Credit SYSTEM_FEES for fee amount
    const userLockedAcc = accountService.getUserAccount(wd.user_id, 'USER_LOCKED', wd.currency);
    const sysClearing = accountService.getSystemAccount('SYSTEM_CLEARING', wd.currency);
    const sysFees = accountService.getSystemAccount('SYSTEM_FEES', wd.currency);

    const settlementTx = financialTransactionService.postTransaction(
      {
        transaction_type: 'WITHDRAWAL',
        currency: wd.currency,
        amount: wd.requested_amount,
        description: `Completed withdrawal #${wd.public_reference} (Net: ${wd.net_amount}, Fee: ${wd.fee_amount})`,
        idempotency_key: `wd_settle_${wd.id}`,
        external_reference: wd.provider_reference,
        metadata: { withdrawal_id: wd.id, public_reference: wd.public_reference, net_amount: wd.net_amount, fee_amount: wd.fee_amount },
        created_by: actorUserId
      },
      [
        {
          account_id: userLockedAcc.id,
          entry_type: 'DEBIT',
          amount: wd.requested_amount,
          description: `Debit locked funds for payout #${wd.public_reference}`
        },
        {
          account_id: sysClearing.id,
          entry_type: 'CREDIT',
          amount: wd.net_amount,
          description: `Credit system clearing for payout net amount`
        },
        {
          account_id: sysFees.id,
          entry_type: 'CREDIT',
          amount: wd.fee_amount,
          description: `Credit system fees for withdrawal fee`
        }
      ]
    );

    wd.settlement_ledger_transaction_id = settlementTx.id;
    logger.info('FINANCE', `Withdrawal #${withdrawalId} successfully completed and settled via ledger txn #${settlementTx.id}`);
    return wd;
  }

  /**
   * Fail withdrawal: releases locked funds back to USER_AVAILABLE.
   */
  public static failWithdrawal(withdrawalId: number, failureReason: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (['COMPLETED', 'FAILED', 'REJECTED'].includes(wd.status)) return wd;

    wd.status = 'FAILED';
    wd.failure_reason = failureReason;
    wd.failed_at = new Date().toISOString();
    wd.updated_at = new Date().toISOString();

    // Release locked funds back to user available
    if (wd.ledger_transaction_id) {
      try {
        financialTransactionService.unlockFunds(
          wd.user_id,
          wd.requested_amount,
          wd.currency,
          `Release funds due to failed payout #${wd.public_reference}: ${failureReason}`,
          `wd_fail_unlock_${wd.id}_${Date.now()}`
        );
      } catch (err: unknown) {
        logger.error('FINANCE', `Failed to unlock funds on payout failure #${wd.id}: ${String(err)}`);
      }
    }

    logger.warn('FINANCE', `Withdrawal #${withdrawalId} marked FAILED. Reason: ${failureReason}`);
    return wd;
  }

  /**
   * Reverse completed withdrawal using immutable ledger reversal.
   */
  public static reverseWithdrawal(withdrawalId: number, adminUserId: number, reason: string): WithdrawalRequest {
    const wd = dataStore.withdrawalRequests.find(w => w.id === withdrawalId);
    if (!wd) throw new Error(`Withdrawal #${withdrawalId} not found.`);
    if (wd.status !== 'COMPLETED') {
      throw new Error(`Only COMPLETED withdrawals can be reversed. Current status: ${wd.status}`);
    }
    if (!wd.settlement_ledger_transaction_id) {
      throw new Error('Settlement transaction reference missing for completed withdrawal.');
    }

    // Use Phase 3 immutable reversal
    const reversalTx = financialTransactionService.reverseTransaction(
      wd.settlement_ledger_transaction_id,
      adminUserId,
      `Reversal of withdrawal #${wd.public_reference}: ${reason}`
    );

    wd.status = 'REVERSED';
    wd.reversed_at = reversalTx.posted_at;
    wd.updated_at = new Date().toISOString();

    // Also return funds to user available balance
    financialTransactionService.postTransaction(
      {
        transaction_type: 'REFUND',
        currency: wd.currency,
        amount: wd.requested_amount,
        description: `Refund for reversed withdrawal #${wd.public_reference}: ${reason}`,
        idempotency_key: `wd_reverse_refund_${wd.id}_${Date.now()}`,
        created_by: adminUserId
      },
      [
        {
          account_id: accountService.getSystemAccount('SYSTEM_CLEARING', wd.currency).id,
          entry_type: 'DEBIT',
          amount: wd.requested_amount,
          description: 'Debit clearing for withdrawal reversal'
        },
        {
          account_id: accountService.getUserAccount(wd.user_id, 'USER_AVAILABLE', wd.currency).id,
          entry_type: 'CREDIT',
          amount: wd.requested_amount,
          description: 'Credit user available for withdrawal reversal'
        }
      ]
    );

    logger.info('FINANCE', `Withdrawal #${withdrawalId} successfully reversed by admin #${adminUserId}`);
    return wd;
  }
}
