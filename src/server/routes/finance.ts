import { Router, Response } from 'express';
import { dataStore } from '../dataStore.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';
import {
  authMiddleware,
  requirePermission,
  AuthenticatedRequest
} from '../middleware/auth.js';
import { accountService } from '../finance/accountService.js';
import { balanceService } from '../finance/balanceService.js';
import { financialTransactionService } from '../finance/transactionService.js';
import { adjustmentService } from '../finance/adjustmentService.js';
import { reconciliationService } from '../finance/reconciliationService.js';
import { FinancialTestSuite } from '../finance/testSuite.js';
import { Decimal } from '../finance/decimal.js';
import { ReferralService } from '../referral/referralService.js';
import { logger } from '../logger.js';

const router = Router();

// ============================================================================
// 1. USER WALLET & BALANCES (Protected against IDOR)
// ============================================================================

/**
 * GET /wallet
 * Returns current user's wallet with authoritative ledger-derived balances.
 */
router.get('/wallet', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const currency = (req.query.currency as string || 'USD').toUpperCase();

    const wallet = accountService.ensureUserAccounts(userId, currency);
    const balances = balanceService.recalculateBalance(userId, currency);

    // Get recent user transactions (up to 5)
    const userAccountIds = new Set(
      dataStore.ledgerAccounts
        .filter(a => a.owner_user_id === userId && a.currency === currency)
        .map(a => a.id)
    );

    const userTxIds = new Set(
      dataStore.ledgerEntries
        .filter(e => userAccountIds.has(e.ledger_account_id))
        .map(e => e.transaction_id)
    );

    const isAdmin = req.permissions?.some(p => p.name === 'transactions.view_admin') ||
                    req.roles?.some(r => r.name === 'ADMIN' || r.name === 'SUPER_ADMIN');

    const recentTx = dataStore.ledgerTransactions
      .filter(t => userTxIds.has(t.id))
      .sort((a, b) => b.id - a.id)
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        uuid: t.uuid,
        transaction_reference: t.transaction_reference,
        transaction_type: t.transaction_type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        description: t.description,
        created_at: t.created_at,
        posted_at: t.posted_at
      }));

    res.json(createResponse({
      wallet: {
        id: wallet.id,
        uuid: wallet.uuid,
        currency: wallet.currency,
        status: wallet.status,
        balances
      },
      recent_transactions: recentTx
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE_API', `Error fetching wallet: ${msg}`);
    res.status(500).json(createErrorResponse(`Failed to load wallet: ${msg}`));
  }
});

/**
 * GET /wallet/balances
 * Returns pure ledger-derived balance breakdown.
 */
router.get('/wallet/balances', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const currency = (req.query.currency as string || 'USD').toUpperCase();
    const balances = balanceService.recalculateBalance(userId, currency);
    res.json(createResponse(balances));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * POST /wallet/lock
 * Moves funds from USER_AVAILABLE -> USER_LOCKED via real double-entry ledger.
 */
router.post('/wallet/lock', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency = 'USD', reason = 'User requested fund lock', idempotency_key } = req.body;

    if (!amount) {
      return res.status(400).json(createErrorResponse('Amount is required'));
    }

    const tx = financialTransactionService.lockFunds(
      userId,
      String(amount),
      String(currency),
      String(reason),
      idempotency_key ? String(idempotency_key) : undefined
    );

    const newBalances = balanceService.recalculateBalance(userId, String(currency));
    res.json(createResponse({ transaction: tx, balances: newBalances }, 'Funds successfully locked via ledger'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('FINANCE_API', `Lock funds failed for user ${req.user!.id}: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /wallet/unlock
 * Moves funds from USER_LOCKED -> USER_AVAILABLE via real double-entry ledger.
 */
router.post('/wallet/unlock', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency = 'USD', reason = 'User requested fund unlock', idempotency_key } = req.body;

    if (!amount) {
      return res.status(400).json(createErrorResponse('Amount is required'));
    }

    const tx = financialTransactionService.unlockFunds(
      userId,
      String(amount),
      String(currency),
      String(reason),
      idempotency_key ? String(idempotency_key) : undefined
    );

    const newBalances = balanceService.recalculateBalance(userId, String(currency));
    res.json(createResponse({ transaction: tx, balances: newBalances }, 'Funds successfully unlocked via ledger'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('FINANCE_API', `Unlock funds failed for user ${req.user!.id}: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /wallet/topup
 * Allocates sandbox demo funds into USER_AVAILABLE via real double-entry ledger.
 */
router.post('/wallet/topup', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount = '1000', currency = 'USD' } = req.body;
    const amtDec = Decimal.fromString(String(amount));
    if (amtDec.isZero() || amtDec.isNegative()) {
      return res.status(400).json(createErrorResponse('Topup amount must be positive.'));
    }

    const curr = String(currency).toUpperCase();
    accountService.ensureUserAccounts(userId, curr);
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', curr);
    const systemClearing = accountService.getSystemAccount('SYSTEM_CLEARING', curr);

    const idempotencyKey = req.body.idempotency_key || `topup_${userId}_${Date.now()}`;
    const tx = financialTransactionService.postTransaction(
      {
        transaction_type: 'DEPOSIT',
        currency: curr,
        amount: amtDec.toString(),
        description: `Institutional sandbox demo allocation topup for User #${userId}`,
        idempotency_key: idempotencyKey,
        created_by: userId
      },
      [
        {
          account_id: systemClearing.id,
          entry_type: 'DEBIT',
          amount: amtDec.toString(),
          description: 'Debit system clearing for sandbox demo topup'
        },
        {
          account_id: availableAcc.id,
          entry_type: 'CREDIT',
          amount: amtDec.toString(),
          description: 'Credit user available balance for sandbox demo topup'
        }
      ]
    );

    // AUTOMATIC DEPOSIT BONUS PROCESSING: Check admin configured deposit bonus tiers
    try {
      const topupVal = parseFloat(amtDec.toString());
      const matchingTier = dataStore.depositBonusTiers.find(tier => {
        if (tier.status !== 'ACTIVE') return false;
        const minD = parseFloat(tier.min_deposit);
        const maxD = tier.max_deposit ? parseFloat(tier.max_deposit) : Infinity;
        return topupVal >= minD && topupVal <= maxD;
      });

      if (matchingTier) {
        const bonusRate = parseFloat(matchingTier.bonus_amount);
        const bonusAmt = matchingTier.bonus_type === 'PERCENTAGE'
          ? (topupVal * bonusRate) / 100
          : bonusRate;

        if (bonusAmt > 0) {
          financialTransactionService.depositFunds(
            userId,
            bonusAmt.toFixed(2),
            curr,
            `Deposit Bonus: ${matchingTier.name} (+$${bonusAmt.toFixed(2)})`,
            { tier_id: matchingTier.id, topup_tx_id: tx.id }
          );

          const nextBonusId = dataStore.userBonuses.length > 0
            ? Math.max(...dataStore.userBonuses.map(b => b.id)) + 1
            : 1;

          dataStore.userBonuses.push({
            id: nextBonusId,
            public_reference: `bonus_ref_${Date.now()}_${nextBonusId}`,
            user_id: userId,
            campaign_id: 1,
            bonus_type: 'DEPOSIT_BONUS',
            amount: bonusAmt.toFixed(2),
            currency: curr,
            status: 'ACTIVE',
            ledger_transaction_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
          });

          logger.info('FINANCE', `Applied deposit bonus of $${bonusAmt.toFixed(2)} to user #${userId} based on Tier #${matchingTier.id} (${matchingTier.name})`);
        }
      }
    } catch (bonusErr) {
      logger.error('FINANCE', `Error processing deposit bonus for topup tx #${tx.id}: ${bonusErr}`);
    }

    // AUTOMATIC REFERRAL COMMISSION PROCESSING
    try {
      ReferralService.processQualifyingEvent(
        userId,
        'FIRST_DEPOSIT_CONFIRMED',
        amtDec.toString(),
        curr
      );
    } catch (refErr) {
      logger.error('FINANCE', `Error calculating referral commission for topup: ${refErr}`);
    }

    const balances = balanceService.recalculateBalance(userId, curr);
    res.json(createResponse({ transaction: tx, balances }, `Successfully topped up ${amtDec.toString()} ${curr}`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('FINANCE_API', `Topup failed for user ${req.user!.id}: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

// ============================================================================
// 2. USER TRANSACTION JOURNAL & DETAILS
// ============================================================================

/**
 * GET /transactions
 * Paginated list of ledger transactions for the authenticated user.
 */
router.get('/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
    const type = req.query.type as string;

    const userAccountIds = new Set(
      dataStore.ledgerAccounts
        .filter(a => a.owner_user_id === userId)
        .map(a => a.id)
    );

    const userTxIds = new Set(
      dataStore.ledgerEntries
        .filter(e => userAccountIds.has(e.ledger_account_id))
        .map(e => e.transaction_id)
    );

    const isAdmin = req.permissions?.some(p => p.name === 'transactions.view_admin') ||
                    req.roles?.some(r => r.name === 'ADMIN' || r.name === 'SUPER_ADMIN');

    let transactions = dataStore.ledgerTransactions
      .filter(t => userTxIds.has(t.id));

    if (type) {
      transactions = transactions.filter(t => t.transaction_type === type);
    }

    transactions.sort((a, b) => b.id - a.id);

    const total = transactions.length;
    const paginated = transactions.slice((page - 1) * limit, page * limit).map(t => ({
      id: t.id,
      uuid: t.uuid,
      transaction_reference: t.transaction_reference,
      transaction_type: t.transaction_type,
      status: t.status,
      currency: t.currency,
      amount: t.amount,
      description: t.description,
      created_at: t.created_at,
      posted_at: t.posted_at,
      reversed_at: t.reversed_at
    }));

    res.json(createResponse({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * GET /transactions/:id
 * Transaction details. Standard users see sanitized transaction info;
 * administrators with 'transactions.view_admin' see detailed double-entry journals.
 */
router.get('/transactions/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const txId = parseInt(req.params.id);
    const tx = financialTransactionService.getTransactionWithEntries(txId);
    if (!tx) {
      return res.status(404).json(createErrorResponse('Transaction not found'));
    }

    const isAdmin = req.permissions?.some(p => p.name === 'transactions.view_admin') ||
      req.roles?.some(r => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN' || r.name === 'FINANCE');

    const userAccountIds = new Set(
      dataStore.ledgerAccounts
        .filter(a => a.owner_user_id === req.user!.id)
        .map(a => a.id)
    );

    const userOwnsTx = tx.entries?.some(e => userAccountIds.has(e.ledger_account_id));

    if (!isAdmin && !userOwnsTx) {
      return res.status(403).json(createErrorResponse('Access denied to this transaction'));
    }

    if (isAdmin) {
      // Full double-entry detail
      return res.json(createResponse(tx));
    } else {
      // Sanitized view for standard users
      const sanitized = {
        id: tx.id,
        uuid: tx.uuid,
        transaction_reference: tx.transaction_reference,
        transaction_type: tx.transaction_type,
        status: tx.status,
        currency: tx.currency,
        amount: tx.amount,
        description: tx.description,
        created_at: tx.created_at,
        posted_at: tx.posted_at,
        reversed_at: tx.reversed_at
      };
      return res.json(createResponse(sanitized));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ============================================================================
// 3. ADMIN FINANCIAL GOVERNANCE & RECONCILIATION
// ============================================================================

/**
 * GET /admin/financial/overview
 * Real aggregate institutional balance metrics.
 */
router.get(
  '/admin/financial/overview',
  authMiddleware,
  requirePermission('financial_reports.view'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      let totalVolumeDec = Decimal.zero();
      let totalAvailableDec = Decimal.zero();
      let totalLockedDec = Decimal.zero();
      let totalInvestmentDec = Decimal.zero();
      let totalStakingDec = Decimal.zero();
      let totalBonusDec = Decimal.zero();
      let totalSystemClearingDec = Decimal.zero();
      let totalSystemCashDec = Decimal.zero();

      // Aggregate posted transactions volume
      for (const tx of dataStore.ledgerTransactions) {
        if (tx.status === 'POSTED') {
          totalVolumeDec = totalVolumeDec.add(Decimal.fromString(tx.amount));
        }
      }

      // Aggregate ledger account balances
      for (const acc of dataStore.ledgerAccounts) {
        const bal = balanceService.getAccountBalance(acc.id);
        switch (acc.account_type) {
          case 'USER_AVAILABLE': totalAvailableDec = totalAvailableDec.add(bal); break;
          case 'USER_LOCKED': totalLockedDec = totalLockedDec.add(bal); break;
          case 'USER_INVESTMENT': totalInvestmentDec = totalInvestmentDec.add(bal); break;
          case 'USER_STAKING': totalStakingDec = totalStakingDec.add(bal); break;
          case 'USER_BONUS': totalBonusDec = totalBonusDec.add(bal); break;
          case 'SYSTEM_CLEARING': totalSystemClearingDec = totalSystemClearingDec.add(bal); break;
          case 'SYSTEM_CASH': totalSystemCashDec = totalSystemCashDec.add(bal); break;
        }
      }

      const totalUserBalances = totalAvailableDec
        .add(totalLockedDec)
        .add(totalInvestmentDec)
        .add(totalStakingDec)
        .add(totalBonusDec);

      const stats = {
        total_ledger_volume: totalVolumeDec.toString(),
        total_user_balances: totalUserBalances.toString(),
        available_balances: totalAvailableDec.toString(),
        locked_balances: totalLockedDec.toString(),
        investment_balances: totalInvestmentDec.toString(),
        staking_balances: totalStakingDec.toString(),
        bonus_balances: totalBonusDec.toString(),
        system_cash_balance: totalSystemCashDec.toString(),
        system_clearing_balance: totalSystemClearingDec.toString(),
        total_transactions_count: dataStore.ledgerTransactions.length,
        posted_transactions_count: dataStore.ledgerTransactions.filter(t => t.status === 'POSTED').length,
        failed_transactions_count: dataStore.ledgerTransactions.filter(t => t.status === 'FAILED').length,
        reversed_transactions_count: dataStore.ledgerTransactions.filter(t => t.status === 'REVERSED').length,
        total_ledger_entries_count: dataStore.ledgerEntries.length,
        total_ledger_accounts_count: dataStore.ledgerAccounts.length
      };

      res.json(createResponse(stats));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /admin/transactions
 * Comprehensive administrative transaction journal search and filtration.
 */
router.get(
  '/admin/transactions',
  authMiddleware,
  requirePermission('transactions.view_admin'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = (req.query.search as string || '').trim().toLowerCase();
      const type = req.query.type as string;
      const status = req.query.status as string;
      const currency = req.query.currency as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      let list = [...dataStore.ledgerTransactions];

      if (search) {
        list = list.filter(t =>
          t.transaction_reference.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          (t.idempotency_key && t.idempotency_key.toLowerCase().includes(search)) ||
          (t.external_reference && t.external_reference.toLowerCase().includes(search)) ||
          String(t.id) === search
        );
      }

      if (type) {
        list = list.filter(t => t.transaction_type === type);
      }

      if (status) {
        list = list.filter(t => t.status === status);
      }

      if (currency) {
        list = list.filter(t => t.currency.toUpperCase() === currency.toUpperCase());
      }

      if (dateFrom) {
        list = list.filter(t => new Date(t.created_at) >= new Date(dateFrom));
      }

      if (dateTo) {
        list = list.filter(t => new Date(t.created_at) <= new Date(dateTo));
      }

      list.sort((a, b) => b.id - a.id);

      const total = list.length;
      const paginated = list.slice((page - 1) * limit, page * limit).map(t => {
        const entries = dataStore.ledgerEntries.filter(e => e.transaction_id === t.id);
        const creator = t.created_by ? dataStore.users.find(u => u.id === t.created_by) : null;
        return {
          ...t,
          entries_count: entries.length,
          creator_name: creator?.name || null
        };
      });

      res.json(createResponse({
        data: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /admin/reconciliation
 * Returns latest reconciliation state.
 */
router.get(
  '/admin/reconciliation',
  authMiddleware,
  requirePermission('financial_reconciliation.view'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      const report = reconciliationService.reconcileAll();
      res.json(createResponse(report));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /admin/reconciliation/run
 * Forces immediate execution of the 9-point double-entry reconciliation audit.
 */
router.post(
  '/admin/reconciliation/run',
  authMiddleware,
  requirePermission('financial_reconciliation.view'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      const report = reconciliationService.reconcileAll();
      res.json(createResponse(report, 'Reconciliation audit completed'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /admin/adjustments
 * List manual adjustment requests in queue.
 */
router.get(
  '/admin/adjustments',
  authMiddleware,
  requirePermission('financial_adjustments.request'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      const list = adjustmentService.listAdjustments();
      res.json(createResponse(list));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /admin/adjustments/request
 * Submits a new adjustment request for review.
 */
router.post(
  '/admin/adjustments/request',
  authMiddleware,
  requirePermission('financial_adjustments.request'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { user_id, amount, direction, target_account_type, reason, currency = 'USD' } = req.body;

      if (!user_id || !amount || !direction || !reason) {
        return res.status(400).json(createErrorResponse('Missing required fields: user_id, amount, direction, reason'));
      }

      const adj = adjustmentService.requestAdjustment({
        user_id: Number(user_id),
        currency: String(currency),
        amount: String(amount),
        direction: direction as 'CREDIT' | 'DEBIT',
        target_account_type,
        reason: String(reason),
        requested_by_user_id: req.user!.id
      });

      res.status(201).json(createResponse(adj, 'Adjustment request submitted successfully'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /admin/adjustments/:id/approve
 * Authorizes adjustment and executes atomic transaction via the double-entry ledger.
 */
router.post(
  '/admin/adjustments/:id/approve',
  authMiddleware,
  requirePermission('financial_adjustments.approve'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { decision_notes } = req.body;

      const adj = adjustmentService.approveAdjustment(id, req.user!.id, decision_notes);
      res.json(createResponse(adj, 'Adjustment approved and posted to double-entry ledger'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /admin/adjustments/:id/reject
 * Rejects adjustment request with audit log.
 */
router.post(
  '/admin/adjustments/:id/reject',
  authMiddleware,
  requirePermission('financial_adjustments.approve'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json(createErrorResponse('Rejection reason is required'));
      }

      const adj = adjustmentService.rejectAdjustment(id, req.user!.id, String(reason));
      res.json(createResponse(adj, 'Adjustment rejected'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /admin/financial/run-tests
 * Executes Section 28 & 29 automated test suite and returns report.
 */
router.post(
  '/admin/financial/run-tests',
  authMiddleware,
  requirePermission('financial_reconciliation.view'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      const report = FinancialTestSuite.runAllTests();
      res.json(createResponse(report, 'Financial invariant test suite executed'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

export default router;
