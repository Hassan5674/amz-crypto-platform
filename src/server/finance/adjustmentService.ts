import { dataStore } from '../dataStore.js';
import { accountService } from './accountService.js';
import { financialTransactionService } from './transactionService.js';
import { ManualAdjustmentRequest, LedgerAccountType } from '../../types/finance.js';
import { securityEventService } from '../services/securityEventService.js';
import { logger } from '../logger.js';
import crypto from 'crypto';

export class AdjustmentService {
  private static instance: AdjustmentService;

  private constructor() {}

  public static getInstance(): AdjustmentService {
    if (!AdjustmentService.instance) {
      AdjustmentService.instance = new AdjustmentService();
    }
    return AdjustmentService.instance;
  }

  public requestAdjustment(params: {
    user_id: number;
    currency: string;
    amount: string;
    direction: 'CREDIT' | 'DEBIT';
    target_account_type?: 'USER_AVAILABLE' | 'USER_LOCKED' | 'USER_BONUS';
    reason: string;
    requested_by_user_id: number;
  }): ManualAdjustmentRequest {
    const user = dataStore.users.find(u => u.id === params.user_id);
    if (!user) {
      throw new Error(`Target user ID ${params.user_id} not found.`);
    }

    const requester = dataStore.users.find(u => u.id === params.requested_by_user_id);

    const nextId = dataStore.manualAdjustments.length > 0
      ? Math.max(...dataStore.manualAdjustments.map(a => a.id)) + 1
      : 1;

    const now = new Date().toISOString();
    const adj: ManualAdjustmentRequest = {
      id: nextId,
      uuid: crypto.randomUUID(),
      user_id: params.user_id,
      user_name: user.name,
      user_email: user.email,
      currency: params.currency.toUpperCase(),
      amount: params.amount,
      direction: params.direction,
      target_account_type: params.target_account_type || 'USER_AVAILABLE',
      reason: params.reason,
      status: 'REQUESTED',
      requested_by_user_id: params.requested_by_user_id,
      requested_by_name: requester?.name || `Admin #${params.requested_by_user_id}`,
      reviewed_by_user_id: null,
      reviewed_by_name: null,
      decision_reason: null,
      ledger_transaction_id: null,
      created_at: now,
      updated_at: now
    };

    dataStore.manualAdjustments.push(adj);

    securityEventService.record({
      type: 'FINANCIAL_ADJUSTMENT_REQUESTED',
      actor: { id: params.requested_by_user_id },
      target: { type: 'MANUAL_ADJUSTMENT', id: String(adj.id) },
      description: `Requested ${adj.direction} of ${adj.currency} ${adj.amount} for User #${adj.user_id} (${user.username}). Reason: ${adj.reason}`,
      ip: '127.0.0.1',
      userAgent: 'ApexPlatform Finance Governance'
    });

    return adj;
  }

  public approveAdjustment(
    adjustmentId: number,
    approverUserId: number,
    decisionNotes?: string
  ): ManualAdjustmentRequest {
    const adj = dataStore.manualAdjustments.find(a => a.id === adjustmentId);
    if (!adj) {
      throw new Error(`Adjustment request #${adjustmentId} not found.`);
    }
    if (adj.status !== 'REQUESTED' && adj.status !== 'REVIEW') {
      throw new Error(`Cannot approve adjustment with status: ${adj.status}`);
    }

    const approver = dataStore.users.find(u => u.id === approverUserId);

    // Resolve accounts
    const userTargetAcc = accountService.getUserAccount(
      adj.user_id,
      adj.target_account_type,
      adj.currency
    );
    const systemClearingAcc = accountService.getSystemAccount('SYSTEM_CLEARING', adj.currency);

    // Build double-entry transaction
    // If CREDIT to user: Debit System Clearing, Credit User Account
    // If DEBIT from user: Debit User Account, Credit System Clearing
    const entries = adj.direction === 'CREDIT'
      ? [
          {
            account_id: systemClearingAcc.id,
            entry_type: 'DEBIT' as const,
            amount: adj.amount,
            description: `Manual adjustment approval: Clearing offset for ${userTargetAcc.account_code}`
          },
          {
            account_id: userTargetAcc.id,
            entry_type: 'CREDIT' as const,
            amount: adj.amount,
            description: `Manual adjustment credit: ${adj.reason}`
          }
        ]
      : [
          {
            account_id: userTargetAcc.id,
            entry_type: 'DEBIT' as const,
            amount: adj.amount,
            description: `Manual adjustment debit: ${adj.reason}`
          },
          {
            account_id: systemClearingAcc.id,
            entry_type: 'CREDIT' as const,
            amount: adj.amount,
            description: `Manual adjustment recovery to ${systemClearingAcc.account_code}`
          }
        ];

    const draft = {
      transaction_type: 'ADJUSTMENT' as const,
      currency: adj.currency,
      amount: adj.amount,
      description: `Manual Adjustment #${adj.id}: ${adj.reason}`,
      idempotency_key: `adj_${adj.id}`,
      external_reference: `ADJ-REQ-${adj.id}`,
      metadata: {
        adjustment_request_id: adj.id,
        direction: adj.direction,
        target_account: userTargetAcc.account_code,
        notes: decisionNotes || ''
      },
      created_by: approverUserId
    };

    // Execute atomic transaction via ledger
    const postedTx = financialTransactionService.postTransaction(draft, entries);

    const now = new Date().toISOString();
    adj.status = 'POSTED';
    adj.reviewed_by_user_id = approverUserId;
    adj.reviewed_by_name = approver?.name || `Approver #${approverUserId}`;
    adj.decision_reason = decisionNotes || 'Approved by authorized officer';
    adj.ledger_transaction_id = postedTx.id;
    adj.updated_at = now;

    securityEventService.record({
      type: 'FINANCIAL_ADJUSTMENT_APPROVED',
      actor: { id: approverUserId },
      target: { type: 'MANUAL_ADJUSTMENT', id: String(adj.id) },
      description: `Approved adjustment #${adj.id} -> Posted Ledger Txn #${postedTx.id} (${postedTx.transaction_reference})`,
      ip: '127.0.0.1',
      userAgent: 'ApexPlatform Finance Governance'
    });

    return adj;
  }

  public rejectAdjustment(
    adjustmentId: number,
    rejecterUserId: number,
    reason: string
  ): ManualAdjustmentRequest {
    const adj = dataStore.manualAdjustments.find(a => a.id === adjustmentId);
    if (!adj) {
      throw new Error(`Adjustment request #${adjustmentId} not found.`);
    }
    if (adj.status !== 'REQUESTED' && adj.status !== 'REVIEW') {
      throw new Error(`Cannot reject adjustment with status: ${adj.status}`);
    }

    const rejecter = dataStore.users.find(u => u.id === rejecterUserId);
    const now = new Date().toISOString();

    adj.status = 'REJECTED';
    adj.reviewed_by_user_id = rejecterUserId;
    adj.reviewed_by_name = rejecter?.name || `Officer #${rejecterUserId}`;
    adj.decision_reason = reason;
    adj.updated_at = now;

    securityEventService.record({
      type: 'FINANCIAL_ADJUSTMENT_REJECTED',
      actor: { id: rejecterUserId },
      target: { type: 'MANUAL_ADJUSTMENT', id: String(adj.id) },
      description: `Rejected adjustment #${adj.id}. Reason: ${reason}`,
      ip: '127.0.0.1',
      userAgent: 'ApexPlatform Finance Governance'
    });

    return adj;
  }

  public listAdjustments(): ManualAdjustmentRequest[] {
    return [...dataStore.manualAdjustments].sort((a, b) => b.id - a.id);
  }
}

export const adjustmentService = AdjustmentService.getInstance();
